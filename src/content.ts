import browserAPI, {
  type RuntimeMessage,
  type MessageSender,
  type SendResponseCallback,
} from "./lib/browserAPI";
import {
  initTempStyling,
  saveThemeToLocalStorage,
  initializeTheme,
} from "./themes/themeUtils";
import { initializeProfileButtons } from "./playerProfile/profileButtons";
import { initializeProfileBans } from "./playerProfile/previousBans";
import { initializeSkinDrops } from "./playerProfile/skinDrops";
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
import {
  initializeFaceitRanks,
  updateFaceitRanksSettings,
} from "./matchPage/faceitRanks";
import {
  initializeTeamAverageElo,
  updateTeamAverageEloSettings,
} from "./matchPage/teamAverageElo";
import {
  initializeTeamAverageEloLive,
  updateTeamAverageEloLiveSettings,
} from "./matchPage/teamAverageEloLive";
import { initializeExtensionButton } from "./navbar/extensionButton";
import { getCurrentPage } from "./utils/pageUtils";

let userSettings: UserSettings = defaultUserSettings;
const LS_KEY = "userSettings";

let lastUrl = window.location.href;

initTempStyling();

declare global {
  interface Window {
    __NEXT_DATA__?: any;
  }
}

function waitForPageReady(): Promise<void> {
  return new Promise((resolve) => {
    const checkHydration = () => {
      if (window.__NEXT_DATA__) {
        console.log("Next.js hydration complete");
        resolve();
        return;
      }
      if (document.readyState === "complete") {
        console.log("DOM is fully loaded and ready");
        resolve();
        return;
      }
      setTimeout(checkHydration, 100);
    };
    checkHydration();
  });
}

async function applyChangedSettings(changedParts: Partial<UserSettings>) {
  if (changedParts.selectedTheme && changedParts.selectedTheme !== "default") {
    await initializeTheme(changedParts.selectedTheme);
  }

  if (
    changedParts.csstatsProfileButton !== undefined ||
    changedParts.faceitProfileButton !== undefined
  ) {
    initializeProfileButtons(userSettings);
  }

  if (changedParts.showBans !== undefined) {
    initializeProfileBans(changedParts.showBans);
  }

  if (changedParts.showSkinDrops !== undefined) {
    initializeSkinDrops(changedParts.showSkinDrops);
  }

  if (changedParts.showHighestElo !== undefined) {
    initializeHighestElo(changedParts.showHighestElo);
  }

  if (
    changedParts.showFriendListRanks !== undefined ||
    changedParts.sortFriendsByRenownElo !== undefined
  ) {
    initializeFriendsList(userSettings);
  }

  if (changedParts.showSidebarFriendRanks !== undefined) {
    initializeSidebarFriends(userSettings);
  }

  if (
    changedParts.autoAccept?.match ||
    changedParts.matchAutoAcceptDelay !== undefined
  ) {
    updateMatchFoundAutoAcceptSettings(userSettings);
  }

  if (
    changedParts.autoAccept?.party ||
    changedParts.partyAutoAcceptDelay !== undefined
  ) {
    updateAutoAcceptPartyInviteSettings(userSettings);
  }

  if (changedParts.keepAlive !== undefined) {
    updateKeepAliveSettings(userSettings);
  }

  if (changedParts.showFaceitRanksOnMatchPage !== undefined) {
    updateFaceitRanksSettings(userSettings.showFaceitRanksOnMatchPage);
    updateTeamAverageEloSettings(
      userSettings.showTeamAverageElo,
      userSettings.showFaceitRanksOnMatchPage
    );
    updateTeamAverageEloLiveSettings(
      userSettings.showTeamAverageElo,
      userSettings.showFaceitRanksOnMatchPage
    );
  }

  if (changedParts.showTeamAverageElo !== undefined) {
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
    initializeExtensionButton(userSettings.showExtensionNavbarButton);
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

    initializeProfileButtons(userSettings);
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
