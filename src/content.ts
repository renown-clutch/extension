console.log("Clutch extension content script loaded");

import {
  initialize as initializeTheme,
  initTempStyling,
  getThemeFromLocalStorage,
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
// import {
//   initialize as initializeHighestElo,
//   updateSettings as updateHighestEloSettings,
// } from "./playerProfile/highestElo";
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
  initializeExtensionButton,
  updateExtensionButtonSettings,
} from "./navbar/extensionButton";

let userSettings: UserSettings = defaultUserSettings;
const LS_KEY = "userSettings";

// Apply temporary styling immediately before anything else
initTempStyling();

// Apply dark theme immediately from localStorage if available
(async function applyThemeImmediately() {
  try {
    const cachedTheme = getThemeFromLocalStorage();
    if (cachedTheme && cachedTheme !== "default") {
      // Initialize theme from cached value immediately
      initializeTheme(cachedTheme);
    } else if (isExtensionContextValid()) {
      // Fall back to Chrome storage if no cached theme
      const result = await chrome.storage.local.get(LS_KEY);
      const settings = result[LS_KEY] || defaultUserSettings;

      if (settings.selectedTheme && settings.selectedTheme !== "default") {
        // Initialize theme from storage
        initializeTheme(settings.selectedTheme);
      }
    }
  } catch (error) {
    console.error("Error applying immediate theme:", error);
  }
})();

/**
 * Waits for the page to be fully loaded and DOM to be ready
 */
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

/**
 * Checks if the extension context is still valid
 */
function isExtensionContextValid(): boolean {
  return chrome.runtime && !!chrome.runtime.id;
}

/**
 * Applies settings that require DOM to be ready
 */
async function applyDomDependentSettings(settings: UserSettings) {
  if (settings.csstatsProfileButton || settings.faceitProfileButton) {
    initializeProfileButtons({
      csstats: settings.csstatsProfileButton,
      faceit: settings.faceitProfileButton,
    });
  }

  if (settings.showSkinDrops) {
    initializeSkinDrops(settings.showSkinDrops);
  }

  if (settings.showFriendListRanks) {
    initializeFriendsList(settings);
  }

  if (settings.showBans) {
    initializeProfileBans(settings.showBans);
  }

  // if (settings.showHighestElo) {
  //   initializeHighestElo(settings.showHighestElo);
  // }
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

  // if (changedParts.showHighestElo !== undefined) {
  //   updateHighestEloSettings(changedParts.showHighestElo);
  // }

  if (
    changedParts.showFriendListRanks !== undefined ||
    changedParts.sortFriendsByRenownElo !== undefined
  ) {
    // Update friends list module when this setting changes
    updateFriendsListSettings(userSettings);
  }

  if (changedParts.showSidebarFriendRanks !== undefined) {
    // Update sidebar friends module when this setting changes
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

  if (changedParts.showExtensionNavbarButton !== undefined) {
    updateExtensionButtonSettings(userSettings.showExtensionNavbarButton);
  }
}

async function loadFromChromeStorage(): Promise<UserSettings> {
  try {
    // Check if extension context is still valid before making API calls
    if (!isExtensionContextValid()) {
      console.warn("Extension context invalidated, using default settings");
      return defaultUserSettings;
    }

    const result = await chrome.storage.local.get(LS_KEY);
    const settings = result[LS_KEY] || defaultUserSettings;
    return settings;
  } catch (error: unknown) {
    // Check specifically for context invalidated error
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn(
        "Extension context invalidated during storage access, using default settings"
      );
    } else {
      console.error("Error loading settings from Chrome storage:", error);
    }
    return defaultUserSettings;
  }
}

async function initialize() {
  try {
    const freshSettings = await loadFromChromeStorage();
    userSettings = freshSettings;

    // Apply theme immediately after loading settings
    if (userSettings.selectedTheme !== "default") {
      try {
        await initializeTheme(userSettings.selectedTheme);
      } catch (error) {
        console.error("Error during theme initialization:", error);
      }
    }

    await waitForPageReady();

    await applyDomDependentSettings(userSettings);

    initializeMatchFoundAutoAccept(userSettings);
    initializeAutoAcceptPartyInvite(userSettings);
    initializeKeepAlive(userSettings);
    initializeFriendsList(userSettings);
    initializeSidebarFriends(userSettings);
    initializeFaceitRanks(userSettings.showFaceitRanksOnMatchPage);
    initializeExtensionButton(userSettings.showExtensionNavbarButton);

    observeProfileChanges((profileId) => {
      if (profileId) {
        setTimeout(() => {
          if (
            userSettings.csstatsProfileButton ||
            userSettings.faceitProfileButton
          ) {
            initializeProfileButtons({
              csstats: userSettings.csstatsProfileButton,
              faceit: userSettings.faceitProfileButton,
            });
          }
          if (userSettings.showBans) {
            initializeProfileBans(userSettings.showBans);
          }
          if (userSettings.showSkinDrops) {
            initializeSkinDrops(userSettings.showSkinDrops);
          }
          // if (userSettings.showHighestElo) {
          //   initializeHighestElo(userSettings.showHighestElo);
          // }
        }, 300);
      }
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn(
        "Extension context invalidated during initialization. Extension may have been updated or reloaded."
      );
    } else {
      console.error("Error during content script initialization:", error);
    }
  }
}

initialize();

// Wrap the message listener in a try-catch to handle potential context invalidation
try {
  if (isExtensionContextValid()) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      try {
        if (message.type === "settingsUpdate") {
          userSettings = message.settings;

          if (message.changedParts) {
            // Add this code to update theme in localStorage when it changes
            if (message.changedParts.selectedTheme) {
              // Update localStorage when theme changes from popup
              saveThemeToLocalStorage(message.changedParts.selectedTheme);
            }

            applyChangedSettings(message.changedParts)
              .then(() => {
                if (isExtensionContextValid()) {
                  sendResponse({ status: "success" });
                }
              })
              .catch((error) => {
                console.error("Error applying settings:", error);
                if (isExtensionContextValid()) {
                  sendResponse({
                    status: "error",
                    message: "Failed to apply settings",
                  });
                }
              });
            return true; // Keep the messaging channel open for the async response
          } else {
            if (isExtensionContextValid()) {
              sendResponse({ status: "success" });
            }
          }
        } else if (message.type === "forceReload") {
          sendResponse({ status: "reloading" });

          // Reload the page to ensure observers catch popups
          window.location.reload();
        } else {
          console.log("Unknown message type received");
          sendResponse({ status: "unknown" });
        }
      } catch (error: unknown) {
        console.error("Error processing message:", error);
        if (
          error instanceof Error &&
          error.message.includes("Extension context invalidated")
        ) {
          console.warn(
            "Extension context invalidated during message processing"
          );
        } else if (isExtensionContextValid()) {
          sendResponse({
            status: "error",
            message: "Error processing message",
          });
        }
      }
    });
  }
} catch (error: unknown) {
  if (
    error instanceof Error &&
    error.message.includes("Extension context invalidated")
  ) {
    console.warn(
      "Extension context invalidated when setting up message listener"
    );
  } else {
    console.error("Error setting up message listener:", error);
  }
}
