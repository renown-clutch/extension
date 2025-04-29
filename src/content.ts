import browserAPI, {
  type RuntimeMessage,
  type MessageSender,
  type SendResponseCallback,
} from "./lib/browserAPI";
import {
  initialize as initializeTheme,
  initTempStyling,
  saveThemeToLocalStorage,
} from "./themes/themeUtils";
import { initialize as initializeProfileButtons } from "./playerProfile/profileButtons";
import { initialize as initializeProfileBans } from "./playerProfile/previousBans";
import { initialize as initializeSkinDrops } from "./playerProfile/skinDrops";
import {
  initialize as initializeFriendsList,
  updateSettings as updateFriendsListSettings,
} from "./playerProfile/friendsList";
import {
  initialize as initializeSidebarFriends,
  updateSettings as updateSidebarFriendsSettings,
} from "./playerProfile/sidebarFriends";
import {
  initialize as initializeHighestElo,
  updateSettings as updateHighestEloSettings,
} from "./playerProfile/highestElo";
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
import { observeProfileChanges } from "./utils/profileUtils";
import {
  initialize as initializeFaceitRanks,
  updateSettings as updateFaceitRanksSettings,
} from "./matchPage/faceitRanks";
import {
  initialize as initializeTeamAverageElo,
  updateSettings as updateTeamAverageEloSettings,
} from "./matchPage/teamAverageElo";
import {
  initialize as initializeTeamAverageEloLive,
  updateSettings as updateTeamAverageEloLiveSettings,
} from "./matchPage/teamAverageEloLive";
import {
  initializeExtensionButton,
  updateExtensionButtonSettings,
} from "./navbar/extensionButton";
import { getCurrentPage, type PageType } from "./utils/pageUtils";

let userSettings: UserSettings = defaultUserSettings;
const LS_KEY = "userSettings";

let previousPage: PageType | null = null;
let lastUrl = window.location.href;

initTempStyling();

function waitForPageReady(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === "complete") {
      resolve();
    } else {
      window.addEventListener("load", () => {
        resolve();
      });
    }
  });
}

async function applyChangedSettings(changedParts: Partial<UserSettings>) {
  if (changedParts.selectedTheme) {
    if (changedParts.selectedTheme !== "default") {
      try {
        await initializeTheme(changedParts.selectedTheme);
      } catch (error) {
        console.error("Error applying theme change:", error);
      }
    }
  }

  if (
    changedParts.csstatsProfileButton !== undefined ||
    changedParts.faceitProfileButton !== undefined
  ) {
    initializeProfileButtons({
      csstats:
        changedParts.csstatsProfileButton !== undefined
          ? changedParts.csstatsProfileButton
          : userSettings.csstatsProfileButton,
      faceit:
        changedParts.faceitProfileButton !== undefined
          ? changedParts.faceitProfileButton
          : userSettings.faceitProfileButton,
    });
  }

  if (changedParts.showBans !== undefined) {
    initializeProfileBans(changedParts.showBans);
  }

  if (changedParts.showSkinDrops !== undefined) {
    initializeSkinDrops(changedParts.showSkinDrops);
  }

  if (changedParts.showHighestElo !== undefined) {
    updateHighestEloSettings(changedParts.showHighestElo);
  }

  if (
    changedParts.showFriendListRanks !== undefined ||
    changedParts.sortFriendsByRenownElo !== undefined
  ) {
    updateFriendsListSettings(userSettings);
  }

  if (changedParts.showSidebarFriendRanks !== undefined) {
    updateSidebarFriendsSettings(userSettings);
  }

  if (changedParts.autoAccept) {
    updateMatchFoundAutoAcceptSettings(userSettings);
    updateAutoAcceptPartyInviteSettings(userSettings);
  }

  if (changedParts.matchAutoAcceptDelay !== undefined) {
    updateMatchFoundAutoAcceptSettings(userSettings);
  }

  if (changedParts.partyAutoAcceptDelay !== undefined) {
    updateAutoAcceptPartyInviteSettings(userSettings);
  }

  if (changedParts.keepAlive !== undefined) {
    updateKeepAliveSettings(userSettings);
  }

  if (changedParts.showFaceitRanksOnMatchPage !== undefined) {
    updateFaceitRanksSettings(userSettings.showFaceitRanksOnMatchPage);
  }

  if (
    changedParts.showTeamAverageElo !== undefined ||
    changedParts.showFaceitRanksOnMatchPage !== undefined
  ) {
    updateTeamAverageEloSettings(
      userSettings.showTeamAverageElo,
      userSettings.showFaceitRanksOnMatchPage
    );
    updateTeamAverageEloLiveSettings(
      userSettings.showTeamAverageElo,
      userSettings.showFaceitRanksOnMatchPage
    );
  }

  if (changedParts.showExtensionNavbarButton !== undefined) {
    updateExtensionButtonSettings(userSettings.showExtensionNavbarButton);
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
    console.error("Error loading settings from browser storage:", error);
  }
  return defaultUserSettings;
}

function observeUrlChanges() {
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      console.log("URL changed from:", lastUrl);
      console.log("URL changed to:", currentUrl);
      lastUrl = currentUrl;
    }
  });

  observer.observe(document, { subtree: true, childList: true });
}

observeUrlChanges();

async function initialize() {
  const currentPage = getCurrentPage();

  if (currentPage.type === "admin") {
    console.log("Admin page, skipping initialization");
    return;
  }

  if (currentPage.type === "home") {
    console.log("Home page, skipping initialization");
    return;
  }

  try {
    const freshSettings = await loadFromBrowserStorage();
    userSettings = freshSettings;

    await initializeTheme(userSettings.selectedTheme);

    await waitForPageReady();

    initializeProfileButtons({
      csstats: userSettings.csstatsProfileButton,
      faceit: userSettings.faceitProfileButton,
    });
    initializeSkinDrops(userSettings.showSkinDrops);
    initializeFriendsList(userSettings);
    initializeProfileBans(userSettings.showBans);
    initializeHighestElo(userSettings.showHighestElo);
    initializeMatchFoundAutoAccept(userSettings);
    initializeAutoAcceptPartyInvite(userSettings);
    initializeKeepAlive(userSettings);

    initializeSidebarFriends(userSettings);
    initializeFaceitRanks(userSettings.showFaceitRanksOnMatchPage);
    initializeTeamAverageElo(
      userSettings.showTeamAverageElo,
      userSettings.showFaceitRanksOnMatchPage
    );
    initializeTeamAverageEloLive(
      userSettings.showTeamAverageElo,
      userSettings.showFaceitRanksOnMatchPage
    );
    initializeExtensionButton(userSettings.showExtensionNavbarButton);
  } catch (error: unknown) {
    console.error("Error during content script initialization:", error);
  }
}

initialize();

browserAPI.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    _sender: MessageSender,
    sendResponse: SendResponseCallback
  ) => {
    if (message.type === "settingsUpdate") {
      userSettings = message.settings;

      if (message.changedParts) {
        if (message.changedParts.selectedTheme) {
          saveThemeToLocalStorage(message.changedParts.selectedTheme);
        }

        applyChangedSettings(message.changedParts)
          .then(() => {
            sendResponse({ status: "success" });
          })
          .catch((error) => {
            sendResponse({
              status: "error",
              message: "Failed to apply settings",
            });
          });
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
