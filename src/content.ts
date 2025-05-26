import browserAPI, {
  type RuntimeMessage,
  type MessageSender,
  type SendResponseCallback,
} from "./lib/browserAPI";
import { initializeProfileButtons } from "./playerProfile/profileButtons";
import { initializeProfileBans } from "./playerProfile/previousBans";
import { initializeFriendsList } from "./playerProfile/friendsList";
import { initializeSidebarFriends } from "./playerProfile/sidebarFriends";
import { initializeHighestElo } from "./playerProfile/highestElo";
import {
  defaultUserSettings,
  type UserSettings,
  SETTING_DEFINITIONS,
  type SettingHandler,
} from "./lib/types";
import {
  initializeMatchFoundAutoAccept,
  updateMatchFoundAutoAcceptSettings,
} from "./autoAccept/matchFoundModal";
import {
  initializeAutoAcceptPartyInvite,
  updateAutoAcceptPartyInviteSettings,
} from "./autoAccept/partyInviteModal";
import {
  initializeKeepAlive,
  updateKeepAliveSettings,
} from "./keepAlive/keepAlive";
import { initializeExtensionButton } from "./navbar/extensionButton";
import { getCurrentPage, type PageType } from "./utils/pageUtils";
import { initializeMatchPage } from "./matchPage/initializeMatchPage";
import { initializeLiveMatchPage } from "./liveMatchPage/intializeLiveMatchPage";
import { initializeSteamIdParser } from "./steamId/steamIdParser";
import { initializeLastMatches } from "./mainPage/lastMatches";
import { initializeLinkToCurrentMatch } from "./playerProfile/linkToCurrentMatch";
import { initializeAveragePartyElo } from "./mainPage/averagePartyElo";
import { initializeChatWindow } from "./chat/chatWindow";
import {
  applyThemeToAllShadowRoots,
  updateShadowRootThemeClasses,
  unregisterShadowRoot,
} from "./themes/shadowThemeManager";

// Export unregisterShadowRoot for use in other modules
export { unregisterShadowRoot };

// Fast theme injection - runs immediately
function fastThemeInjection(): void {
  try {
    // Get theme preference from localStorage
    const themePreference = localStorage.getItem("clutch-theme-preference");

    // Get CSS cache from localStorage
    const cssCache = localStorage.getItem("clutch-css-cache");

    if (!themePreference || !cssCache) {
      return;
    }

    const parsedCache = JSON.parse(cssCache);
    if (!parsedCache.cache) {
      return;
    }

    const cache = parsedCache.cache;

    // Apply theme class immediately
    if (themePreference !== "default") {
      const themeClass = `theme-${themePreference}`;
      document.documentElement.classList.add(themeClass);
    }

    // Inject cached CSS immediately
    const stylesToInject = ["unified", "features"];

    // Only inject common styles if theme is not default
    if (themePreference !== "default") {
      stylesToInject.push("common");
    }

    stylesToInject.forEach((styleType) => {
      if (cache[styleType]) {
        // Remove any existing fast-injected styles of this type
        const existingStyle = document.getElementById(
          `clutch-fast-${styleType}`
        );
        if (existingStyle) {
          existingStyle.remove();
        }

        const styleElement = document.createElement("style");
        styleElement.id = `clutch-fast-${styleType}`;
        styleElement.textContent = cache[styleType];

        // Insert into head if available, otherwise wait for it
        if (document.head) {
          document.head.appendChild(styleElement);
        } else {
          // If head doesn't exist yet, wait for it
          const observer = new MutationObserver(() => {
            if (document.head) {
              document.head.appendChild(styleElement);
              observer.disconnect();
            }
          });
          observer.observe(document, { childList: true, subtree: true });
        }
      }
    });

    console.log("Fast theme injection applied:", themePreference);
  } catch (error) {
    console.error("Fast theme injection failed:", error);
  }
}

// Simple theme switching function
function switchTheme(theme: string): void {
  try {
    // Save to localStorage
    localStorage.setItem("clutch-theme-preference", theme);

    // Remove existing theme classes from document
    document.documentElement.classList.forEach((className) => {
      if (className.startsWith("theme-")) {
        document.documentElement.classList.remove(className);
      }
    });

    // Update shadow root theme classes
    updateShadowRootThemeClasses(theme);

    // Handle common styles based on theme
    const commonStyleElement = document.getElementById(
      "clutch-fast-common"
    ) as HTMLStyleElement;

    if (theme === "default") {
      // Disable common styles for default theme
      if (commonStyleElement) {
        commonStyleElement.disabled = true;
      }
    } else {
      // Apply new theme class to document
      const themeClass = `theme-${theme}`;
      document.documentElement.classList.add(themeClass);

      // Theme classes for shadow roots are handled by updateShadowRootThemeClasses above

      // Enable common styles for non-default themes
      if (commonStyleElement) {
        commonStyleElement.disabled = false;
      } else {
        // If common styles don't exist, try to inject them from cache
        const cssCache = localStorage.getItem("clutch-css-cache");
        if (cssCache) {
          try {
            const parsedCache = JSON.parse(cssCache);
            if (parsedCache.cache && parsedCache.cache.common) {
              const styleElement = document.createElement("style");
              styleElement.id = "clutch-fast-common";
              styleElement.textContent = parsedCache.cache.common;

              if (document.head) {
                document.head.appendChild(styleElement);
              }
            }
          } catch (error) {
            console.error("Failed to re-inject common styles:", error);
          }
        }
      }
    }

    // Apply theme to all registered shadow roots
    applyThemeToAllShadowRoots();

    console.log("Theme switched to:", theme);
  } catch (error) {
    console.error("Theme switching failed:", error);
  }
}

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

// Run fast theme injection immediately if we should be injected
if (shouldBeInjected()) {
  console.log("Content script starting...");
  fastThemeInjection();
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

Object.entries(SETTING_DEFINITIONS).forEach(([key, def]) => {
  if (def.handlers) {
    def.handlers.forEach((handler: SettingHandler) => {
      registerSettingHandler(key as keyof UserSettings, handler);
    });
  }
});

async function applyChangedSettings(changedParts: Partial<UserSettings>) {
  if (!shouldBeInjected()) {
    return;
  }

  // Theme changes are handled in the message handler for immediate response

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
    return;
  }

  try {
    const freshSettings = await loadFromBrowserStorage();
    userSettings = freshSettings;

    await initializeSteamIdParser();

    initializeSidebarFriends(userSettings);
    initializeMatchFoundAutoAccept(userSettings);
    initializeAutoAcceptPartyInvite(userSettings);
    initializeExtensionButton(userSettings);
    await initializeChatWindow(userSettings);

    if (pageType === "profile") {
      initializeProfileButtons(userSettings);
      initializeFriendsList(userSettings);
      initializeProfileBans(userSettings);
      initializeHighestElo(userSettings);
      initializeLinkToCurrentMatch(userSettings);
    }

    if (pageType === "matchPage") {
      initializeMatchPage(userSettings);
    }

    if (pageType === "playMatch") {
      initializeLiveMatchPage(userSettings);
    }

    if (pageType === "play") {
      initializeAveragePartyElo(userSettings);
      initializeLastMatches(userSettings);
    }

    initializeKeepAlive(userSettings);
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
        // Handle theme changes in message handler too for immediate response
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
