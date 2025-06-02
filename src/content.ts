import browserAPI, {
  type RuntimeMessage,
  type MessageSender,
  type SendResponseCallback,
} from "./lib/browserAPI";
import {
  defaultUserSettings,
  type UserSettings,
  SETTING_DEFINITIONS,
  type SettingHandler,
} from "./lib/types";
import { getCurrentPage, type PageType } from "./utils/pageUtils";
import { initializeSteamIdParser, getUserInfo } from "./steamId/steamIdParser";
import { unregisterShadowRoot } from "./themes/shadowThemeManager";
import {
  fastThemeInjection,
  enhancedThemeInjection,
  switchTheme,
  removeAllInjectedCSS,
} from "./themes/themeInjection";
import { config } from "./config";

export { unregisterShadowRoot };

let userSettings: UserSettings = defaultUserSettings;
const LS_KEY = "userSettings";

let lastUrl = window.location.href;

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
  const handlersToRun = new Set<{ handler: SettingHandler; value: any }>();

  Object.entries(changedParts).forEach(([key, value]) => {
    if (value !== undefined && key !== "selectedTheme") {
      const definition = SETTING_DEFINITIONS[key as keyof UserSettings];
      if (definition?.handlers) {
        definition.handlers.forEach((handler) =>
          handlersToRun.add({ handler, value })
        );
      }
    }
  });

  for (const { handler, value } of handlersToRun) {
    await handler(userSettings, value);
  }
}

async function applyAllSettings(
  settings: UserSettings,
  pageType: PageType["type"]
) {
  if (!shouldBeInjected()) {
    return;
  }

  const handlersToRun = new Set<SettingHandler>();

  // Get all handlers for settings that should be active on this page
  Object.entries(SETTING_DEFINITIONS).forEach(([key, definition]) => {
    if (definition.handlers && key !== "selectedTheme") {
      const settingKey = key as keyof UserSettings;
      const shouldInitialize = shouldInitializeForPage(settingKey, pageType);

      if (shouldInitialize) {
        definition.handlers.forEach((handler) => {
          handlersToRun.add(handler);
        });
      }
    }
  });

  // Run all unique handlers
  for (const handler of handlersToRun) {
    try {
      await handler(settings);
    } catch (error) {
      console.error(`[Content Debug] Handler failed:`, error);
    }
  }
}

function shouldInitializeForPage(
  settingKey: keyof UserSettings,
  pageType: PageType["type"]
): boolean {
  // Special handling for file:// URLs - treat them as live match pages when debug is enabled
  const isFileUrl = window.location.href.startsWith("file://");
  if (
    pageType === "unknown" &&
    isFileUrl &&
    config.debug.enableFileUrlSupport
  ) {
    pageType = "playMatch";
  }

  // Profile-specific settings
  const profileSettings = [
    "csstatsProfileButton",
    "faceitProfileButton",
    "showBans",
    "showHighestElo",
    "showLinkToCurrentMatch",
    "playerMatchupStats",
  ];

  // Match page specific settings
  const matchPageSettings = [
    "showFaceitRanksOnMatchPage",
    "showTeamAverageElo",
  ];

  // Live match specific settings
  const liveMatchSettings = [
    "showFaceitRanksOnMatchPage",
    "showTeamAverageElo",
    "showMapStats",
    "showMapStatsColors",
    "liveMatchPlayerStats",
    "showLiveMatchPlayerStreak",
  ];

  // Main page specific settings
  const mainPageSettings = [
    "showLastPlayedMatches",
    "showAveragePartyElo",
    "showFaceitEloOnPartyList",
    "enableClickablePartyUsernames",
  ];

  // Global settings that should always be initialized
  const globalSettings = [
    "showSidebarFriendRanks",
    "autoAccept",
    "matchAutoAcceptDelay",
    "partyAutoAcceptDelay",
    "showExtensionNavbarButton",
    "keepAlive",
    "showFriendListRanks",
    "sortFriendsByRenownElo",
    "matchFoundSound",
    "matchFoundVolume",
    "showChatWindow",
  ];

  if (globalSettings.includes(settingKey)) {
    return true;
  }

  if (pageType === "profile" && profileSettings.includes(settingKey)) {
    return true;
  }

  if (pageType === "matchPage" && matchPageSettings.includes(settingKey)) {
    return true;
  }

  if (pageType === "playMatch" && liveMatchSettings.includes(settingKey)) {
    return true;
  }

  if (pageType === "play" && mainPageSettings.includes(settingKey)) {
    return true;
  }

  return false;
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
        console.log(
          "[Content] ✅ Found Steam ID, notifying background script:",
          steamId
        );

        // Notify background script to initialize connection
        browserAPI.runtime
          .sendMessage({
            type: "initializeWithSteamId",
            steamId: steamId,
          })
          .then((response) => {
            console.log("[Content] ✅ Background script notified successfully");
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
        console.log(
          "[Content] 📋 API requests will be queued until Steam ID becomes available"
        );
      }
    } catch (error) {
      console.error("[Content] ❌ Error getting Steam ID:", error);
      console.log(
        "[Content] 📋 API requests will be queued until Steam ID becomes available"
      );
    }

    // Initialize all features through their handlers to avoid double injection
    await applyAllSettings(userSettings, pageType);
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
