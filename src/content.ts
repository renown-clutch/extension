import browserAPI, {
  type RuntimeMessage,
  type MessageSender,
  type SendResponseCallback,
} from "./lib/browserAPI";
import {
  initTempStyling,
  saveThemeToLocalStorage,
  initializeTheme,
  removeAllThemeStyles,
} from "./themes/themeUtils";
import { initializeProfileButtons } from "./playerProfile/profileButtons";
import { initializeProfileBans } from "./playerProfile/previousBans";
import { initializeFriendsList } from "./playerProfile/friendsList";
import { initializeSidebarFriends } from "./playerProfile/sidebarFriends";
import { initializeHighestElo } from "./playerProfile/highestElo";
import { defaultUserSettings, type UserSettings } from "./lib/types";
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
import { initializeLivePlayerStats } from "./liveMatchPage/livePlayerStats";
import { initializeSteamIdParser } from "./steamId/steamIdParser";
import { initializeLastMatches } from "./mainPage/lastMatches";
import { initializeLinkToCurrentMatch } from "./playerProfile/linkToCurrentMatch";
import { initializeAveragePartyElo } from "./mainPage/averagePartyElo";

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
  initTempStyling();
}

type SettingHandler = (
  settings: UserSettings,
  value?: any
) => void | Promise<void>;

const SETTING_HANDLERS: Record<string, SettingHandler[]> = {
  selectedTheme: [(settings, value) => initializeTheme(value)],
  csstatsProfileButton: [initializeProfileButtons],
  faceitProfileButton: [initializeProfileButtons],
  showBans: [(settings, value) => initializeProfileBans(value)],
  showHighestElo: [(settings, value) => initializeHighestElo(value)],
  showFriendListRanks: [initializeFriendsList],
  sortFriendsByRenownElo: [initializeFriendsList],
  showSidebarFriendRanks: [initializeSidebarFriends],
  "autoAccept.match": [updateMatchFoundAutoAcceptSettings],
  matchAutoAcceptDelay: [updateMatchFoundAutoAcceptSettings],
  matchFoundSound: [updateMatchFoundAutoAcceptSettings],
  matchFoundVolume: [updateMatchFoundAutoAcceptSettings],
  "autoAccept.party": [updateAutoAcceptPartyInviteSettings],
  partyAutoAcceptDelay: [updateAutoAcceptPartyInviteSettings],
  keepAlive: [updateKeepAliveSettings],
  showFaceitRanksOnMatchPage: [initializeMatchPage, initializeLiveMatchPage],
  showTeamAverageElo: [initializeMatchPage, initializeLiveMatchPage],
  showMapStats: [initializeLiveMatchPage],
  showMapStatsColors: [initializeLiveMatchPage],
  showExtensionNavbarButton: [
    (settings, value) => initializeExtensionButton(value),
  ],
  liveMatchPlayerStats: [initializeLivePlayerStats],
  showLiveMatchPlayerStreak: [initializeLivePlayerStats],
  showLastPlayedMatches: [initializeLastMatches],
  showLinkToCurrentMatch: [initializeLinkToCurrentMatch],
  showAveragePartyElo: [initializeAveragePartyElo],
  showFaceitEloOnPartyList: [initializeAveragePartyElo],
};

async function applyChangedSettings(changedParts: Partial<UserSettings>) {
  if (!shouldBeInjected()) {
    removeAllThemeStyles();
    return;
  }

  const handlersToRun = new Set<{ handler: SettingHandler; value: any }>();

  Object.entries(changedParts).forEach(([key, value]) => {
    if (value !== undefined) {
      const handlers = SETTING_HANDLERS[key];
      if (handlers) {
        handlers.forEach((handler) => handlersToRun.add({ handler, value }));
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

  console.log("[Clutch] Initializing for page type:", pageType);

  try {
    const freshSettings = await loadFromBrowserStorage();
    userSettings = freshSettings;

    await initializeTheme(userSettings.selectedTheme);
    initializeSidebarFriends(userSettings);
    initializeSteamIdParser();
    initializeMatchFoundAutoAccept(userSettings);
    initializeAutoAcceptPartyInvite(userSettings);
    initializeExtensionButton(userSettings);

    if (pageType === "profile") {
      initializeProfileButtons(userSettings);
      initializeFriendsList(userSettings);
      initializeProfileBans(userSettings.showBans);
      initializeHighestElo(userSettings.showHighestElo);
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
