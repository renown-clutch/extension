import browserAPI, {
  type RuntimeMessage,
  type MessageSender,
  type SendResponseCallback,
} from "$system/lib/browserAPI";
import {
  defaultUserSettings,
  type UserSettings,
  SETTING_DEFINITIONS,
  type SettingHandler,
} from "$system/lib/types";
import { getCurrentPage, type PageType } from "$utils/common/pageUtils";
import {
  initializeSteamIdParser,
  getUserInfo,
} from "$system/auth/steamIdParser";
import { unregisterShadowRoot } from "$themes/shadowThemeManager";
import {
  fastThemeInjection,
  enhancedThemeInjection,
  switchTheme,
  removeAllInjectedCSS,
} from "$themes/themeInjection";
import { config } from "./config";
import { initializeFeatureRegistry } from "$system/lib/autoRegister";
import {
  getActiveFeatures,
  getFeaturesNeedingCleanup,
  getAffectedFeatures,
  getAllFeatures,
  type FeatureConfig,
} from "$system/lib/featureRegistry";

export { unregisterShadowRoot };

// Initialize the feature registry to load all features
initializeFeatureRegistry();

let userSettings: UserSettings = defaultUserSettings;
const LS_KEY = "userSettings";

let lastUrl = window.location.href;

// Track currently active features to enable proper cleanup
let currentlyActiveFeatures: Set<string> = new Set();

function shouldBeInjected(): boolean {
  const currentPage = getCurrentPage();

  if (currentPage.type === "admin") {
    return false;
  }

  if (currentPage.type === "home") {
    return false;
  }

  return true;
}

function isCSSInjected(): boolean {
  // Check if the main CSS files have been injected by looking for their elements
  return !!(
    document.getElementById("clutch-fast-unified") ||
    document.getElementById("clutch-fast-features")
  );
}

if (shouldBeInjected()) {
  fastThemeInjection();

  enhancedThemeInjection().catch((error: unknown) => {
    console.warn("Enhanced theme injection failed:", error);
  });
}

export function registerSettingHandler(
  key: keyof UserSettings,
  handler: SettingHandler
) {
  const definition = SETTING_DEFINITIONS[key];
  if (definition) {
    if (!definition.handlers) {
      definition.handlers = [];
    }
    definition.handlers.push(handler);
  }
}

async function applyChangedSettings(changedParts: Partial<UserSettings>) {
  if (!shouldBeInjected()) {
    return;
  }

  // Only update features that are affected by the changed settings
  await applyChangedFeatures(changedParts, userSettings);
}

// Granular feature update system - only update features that changed
async function applyChangedFeatures(
  changedParts: Partial<UserSettings>,
  settings: UserSettings
) {
  if (!shouldBeInjected()) {
    return;
  }

  // Get features that are affected by the changed settings
  const affectedFeatures = getAffectedFeatures(changedParts);
  const affectedFeatureKeys = new Set(
    affectedFeatures.map((f) => f.featureId || f.settingKey)
  );

  // Get the current state of features
  const allActiveFeatures = getActiveFeatures(settings);
  const shouldBeActiveKeys = new Set(
    allActiveFeatures.map((f) => f.featureId || f.settingKey)
  );

  console.log(
    `[Content] 🎯 Settings changed:`,
    Object.keys(changedParts),
    `- Affected features:`,
    Array.from(affectedFeatureKeys)
  );

  // Step 1: Handle features that need cleanup (were active, now inactive)
  const featuresNeedingCleanup = affectedFeatures.filter(
    (feature) =>
      currentlyActiveFeatures.has(feature.featureId || feature.settingKey) &&
      !shouldBeActiveKeys.has(feature.featureId || feature.settingKey) &&
      feature.cleanupHandler
  );

  if (featuresNeedingCleanup.length > 0) {
    console.log(
      `[Content] 🧹 Cleaning up ${featuresNeedingCleanup.length} deactivated features:`,
      featuresNeedingCleanup.map((f) => f.featureId || f.settingKey)
    );

    for (const feature of featuresNeedingCleanup) {
      try {
        await feature.cleanupHandler!(settings);
      } catch (error) {
        console.error(
          `[Content] ❌ Error cleaning up feature ${
            feature.featureId || feature.settingKey
          }:`,
          error
        );
      }
    }
  }

  // Step 2: Handle features that need activation/refresh
  // (either newly active or active features that need to respond to dependency changes)
  const featuresNeedingActivation = affectedFeatures.filter((feature) =>
    shouldBeActiveKeys.has(feature.featureId || feature.settingKey)
  );

  if (featuresNeedingActivation.length > 0) {
    console.log(
      `[Content] ⚡ Updating ${featuresNeedingActivation.length} affected features:`,
      featuresNeedingActivation.map((f) => f.featureId || f.settingKey)
    );

    for (const feature of featuresNeedingActivation) {
      try {
        await feature.handler(settings);
      } catch (error) {
        console.error(
          `[Content] ❌ Error updating feature ${
            feature.featureId || feature.settingKey
          }:`,
          error
        );
      }
    }
  }

  // Step 3: Update our tracking of currently active features
  currentlyActiveFeatures = shouldBeActiveKeys;
}

// Unified feature activation system
async function applyActiveFeatures(settings: UserSettings) {
  if (!shouldBeInjected()) {
    return;
  }

  // Get features that should be active for current page and settings
  const activeFeatures = getActiveFeatures(settings);
  const shouldBeActiveKeys = new Set(
    activeFeatures.map((f) => f.featureId || f.settingKey)
  );

  // Debug logging for live match features specifically
  const currentPage = getCurrentPage();
  if (currentPage.type === "playMatch" || currentPage.type === "unknown") {
    console.log("[Content] 🎯 Page type:", currentPage.type);
    console.log(
      "[Content] 🎯 Active features:",
      activeFeatures.map((f) => f.featureId || f.settingKey)
    );

    // Check if live match features are in the registry
    const allFeatures = getAllFeatures();
    const liveMatchFeatures = allFeatures.filter(
      (f: FeatureConfig) =>
        f.featureId === "liveFaceitRanks" ||
        f.featureId === "teamAverageEloLive" ||
        f.settingKey === "showMapStats" ||
        f.settingKey === "liveMatchPlayerStats"
    );
    console.log(
      "[Content] 🎯 Live match features in registry:",
      liveMatchFeatures.map((f: FeatureConfig) => f.featureId || f.settingKey)
    );

    // Check their activation status
    liveMatchFeatures.forEach((feature: FeatureConfig) => {
      const shouldActivate = feature.shouldActivate
        ? feature.shouldActivate(currentPage, settings)
        : false;
      console.log(
        `[Content] 🎯 ${
          feature.featureId || feature.settingKey
        } should activate: ${shouldActivate}`
      );
    });
  }

  // Step 1: Clean up features that were active but should no longer be active
  const featuresNeedingCleanup = getFeaturesNeedingCleanup(
    currentlyActiveFeatures,
    shouldBeActiveKeys
  );

  if (featuresNeedingCleanup.length > 0) {
    console.log(
      `[Content] 🧹 Cleaning up ${featuresNeedingCleanup.length} deactivated features:`,
      featuresNeedingCleanup.map((f) => f.featureId || f.settingKey)
    );

    // Call cleanup handlers for deactivated features
    for (const feature of featuresNeedingCleanup) {
      try {
        await feature.cleanupHandler!(settings);
      } catch (error) {
        console.error(
          `[Content] ❌ Error cleaning up feature ${
            feature.featureId || feature.settingKey
          }:`,
          error
        );
      }
    }
  }

  // Step 2: Activate features that should be active
  console.log(
    `[Content] 🎯 Activating ${activeFeatures.length} features for current page`
  );

  for (const feature of activeFeatures) {
    try {
      await feature.handler(settings);
    } catch (error) {
      console.error(
        `[Content] ❌ Feature ${
          feature.featureId || feature.settingKey
        } failed:`,
        error
      );
    }
  }

  // Step 3: Update our tracking of currently active features
  currentlyActiveFeatures = shouldBeActiveKeys;
}

async function loadFromBrowserStorage(): Promise<UserSettings> {
  try {
    const result = (await browserAPI.storage.local.get(LS_KEY)) as Record<
      string,
      any
    >;
    const settings = result[LS_KEY] || defaultUserSettings;
    return settings;
  } catch (error: unknown) {
    return defaultUserSettings;
  }
}

function observeUrlChanges() {
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      initialize(getCurrentPage().type);
    }
  });

  observer.observe(document, { subtree: true, childList: true });
}

async function initialize(pageType: PageType["type"]) {
  if (!shouldBeInjected()) {
    // Remove CSS when navigating to pages that shouldn't have injection
    if (isCSSInjected()) {
      removeAllInjectedCSS();
    }
    return;
  }

  // If CSS hasn't been injected yet and we should inject it, do it now
  // This handles the case where users start on a non-injected page (like admin/home)
  // and then navigate to a page that requires injection
  if (!isCSSInjected()) {
    fastThemeInjection();

    enhancedThemeInjection().catch((error: unknown) => {
      console.warn("Enhanced theme injection failed:", error);
    });
  }

  try {
    const freshSettings = await loadFromBrowserStorage();
    userSettings = freshSettings;

    if (userSettings.selectedTheme) {
      const currentTheme = localStorage.getItem("clutch-theme-preference");
      if (currentTheme !== userSettings.selectedTheme) {
        switchTheme(userSettings.selectedTheme);
      }
    }

    await initializeSteamIdParser();

    // Try to get Steam ID and notify background script if successful
    try {
      const { steamId } = await getUserInfo();
      if (steamId && steamId.trim() !== "") {
        // Notify background script to initialize connection
        browserAPI.runtime
          .sendMessage({
            type: "initializeWithSteamId",
            steamId: steamId,
          })
          .then((response) => {
            // Background script notified successfully
          })
          .catch((error) => {
            console.warn(
              "[Content] ⚠️ Failed to notify background script:",
              error
            );
          });
      } else {
        console.warn(
          "[Content] ❌ No Steam ID found - background script will not be initialized"
        );
        // API requests will be queued until Steam ID becomes available
      }
    } catch (error) {
      console.error("[Content] ❌ Error getting Steam ID:", error);
      // API requests will be queued until Steam ID becomes available
    }

    // Use unified feature system
    await applyActiveFeatures(userSettings);
  } catch (error: unknown) {
    console.error("Error initializing:", error);
  }
}

browserAPI.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    _sender: MessageSender,
    sendResponse: SendResponseCallback
  ) => {
    if (message.type === "webSocketConnected") {
      sendResponse({ status: "success" });
      return;
    } else if (message.type === "settingsUpdate") {
      userSettings = message.settings;

      if (message.changedParts) {
        if (message.changedParts.selectedTheme) {
          switchTheme(message.changedParts.selectedTheme);
        }

        applyChangedSettings(message.changedParts);
        sendResponse({ status: "success" });
        return true;
      } else {
        sendResponse({ status: "success" });
      }
    } else if (message.type === "forceReload") {
      sendResponse({ status: "reloading" });
      window.location.reload();
    } else {
      sendResponse({ status: "unknown" });
    }
  }
);

observeUrlChanges();

initialize(getCurrentPage().type);
