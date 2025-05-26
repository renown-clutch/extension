import browserAPI, {
  type RuntimeMessage,
  type MessageSender,
  type SendResponseCallback,
} from "./lib/browserAPI";
import {
  saveThemeToLocalStorage,
  initializeTheme,
  removeAllThemeStyles,
  switchThemeSync,
} from "./themes/themeUtils";
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

if (shouldBeInjected()) {
  console.log("Content script starting...");
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
    removeAllThemeStyles();
    return;
  }

  // Handle theme changes with instant switching
  if (changedParts.selectedTheme) {
    switchThemeSync(changedParts.selectedTheme);
  }

  const handlersToRun = new Set<{ handler: SettingHandler; value: any }>();

  Object.entries(changedParts).forEach(([key, value]) => {
    if (value !== undefined && key !== "selectedTheme") {
      // Skip theme as it's handled above
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
    removeAllThemeStyles();
    return;
  }

  try {
    const freshSettings = await loadFromBrowserStorage();
    userSettings = freshSettings;

    await initializeSteamIdParser();

    await initializeTheme(userSettings);
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
        if (message.changedParts.selectedTheme) {
          saveThemeToLocalStorage(message.changedParts.selectedTheme);
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
