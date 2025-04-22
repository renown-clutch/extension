// Remove initial log
// console.log("Clutch extension content script loaded");

import { initialize as initializeTheme } from "./themes/themeUtils";
import { initialize as initializeProfileButtons } from "./playerProfile/profileButtons";
import { initialize as initializeProfileBans } from "./playerProfile/previousBans";
import { initialize as initializeSkinDrops } from "./playerProfile/skinDrops";
import {
  initialize as initializeFriendsList,
  updateSettings as updateFriendsListSettings,
} from "./playerProfile/friendsList";
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

let userSettings: UserSettings = defaultUserSettings;
const LS_KEY = "userSettings";

// Remove excessive log
// console.log("Default user settings:", defaultUserSettings);

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
  if (settings.selectedTheme !== "default") {
    try {
      await initializeTheme(settings.selectedTheme);
    } catch (error) {
      console.error("Error during theme initialization:", error);
    }
  }

  if (settings.profileButtons.csstats || settings.profileButtons.faceit) {
    initializeProfileButtons(settings.profileButtons);
  }

  if (settings.showBans) {
    initializeProfileBans(settings.showBans);
  }

  if (settings.showSkinDrops) {
    initializeSkinDrops(settings.showSkinDrops);
  }

  if (settings.showFriendListRanks) {
    initializeFriendsList(settings);
  }
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

  if (changedParts.profileButtons) {
    if (
      changedParts.profileButtons.csstats ||
      changedParts.profileButtons.faceit
    ) {
      initializeProfileButtons(changedParts.profileButtons);
    }
  }

  if (changedParts.showBans !== undefined) {
    initializeProfileBans(changedParts.showBans);
  }

  if (changedParts.showSkinDrops !== undefined) {
    initializeSkinDrops(changedParts.showSkinDrops);
  }

  if (changedParts.showFriendListRanks !== undefined) {
    // Update friends list module when this setting changes
    updateFriendsListSettings(userSettings);
  }

  if (changedParts.autoAccept) {
    updateMatchFoundAutoAcceptSettings(userSettings);
    updateAutoAcceptPartyInviteSettings(userSettings);
  }

  if (changedParts.keepAlive !== undefined) {
    updateKeepAliveSettings(userSettings);
  }

  if (changedParts.showFaceitRanksOnMatchPage !== undefined) {
    updateFaceitRanksSettings(userSettings.showFaceitRanksOnMatchPage);
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
  // Reduce excessive logging
  // console.log("Content script initialization started");

  try {
    // Remove excessive log
    // console.log("Loading fresh settings from Chrome storage");
    const freshSettings = await loadFromChromeStorage();
    userSettings = freshSettings;
    // Remove excessive log
    // console.log("Settings loaded successfully");

    // Remove excessive log
    // console.log("Initializing non-DOM dependent features");
    initializeMatchFoundAutoAccept(userSettings);
    initializeAutoAcceptPartyInvite(userSettings);
    initializeKeepAlive(userSettings);
    initializeFriendsList(userSettings);
    initializeFaceitRanks(userSettings.showFaceitRanksOnMatchPage);
    // Remove excessive log
    // console.log("Non-DOM dependent features initialized");

    // Remove excessive log
    // console.log("Waiting for page to be ready");
    await waitForPageReady();
    // Remove excessive log
    // console.log("Page is ready, proceeding with DOM-dependent features");

    await applyDomDependentSettings(userSettings);
    // Remove excessive log
    // console.log("DOM-dependent settings applied successfully");

    // Remove excessive log
    // console.log("Setting up profile change observer");
    observeProfileChanges((profileId) => {
      // Remove excessive log
      // console.log("Profile changed event triggered, profile ID:", profileId);
      if (profileId) {
        // Small delay to ensure DOM is updated
        // Remove excessive log
        // console.log("Setting timeout to reinitialize profile features");
        setTimeout(() => {
          // Remove excessive log
          // console.log("Reinitializing profile features after profile change");
          if (
            userSettings.profileButtons.csstats ||
            userSettings.profileButtons.faceit
          ) {
            // Remove excessive log
            // console.log("Reinitializing profile buttons");
            initializeProfileButtons(userSettings.profileButtons);
          }
          if (userSettings.showBans) {
            // Remove excessive log
            // console.log("Reinitializing profile bans");
            initializeProfileBans(userSettings.showBans);
          }
          if (userSettings.showSkinDrops) {
            // Remove excessive log
            // console.log("Reinitializing skin drops");
            initializeSkinDrops(userSettings.showSkinDrops);
          }
        }, 300);
      }
    });
    // Remove excessive log
    // console.log("Profile change observer set up successfully");
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
      // Change to only log message type, not full message content
      console.log("Received message type:", message.type);

      try {
        if (message.type === "settingsUpdate") {
          // Remove excessive log
          // console.log("Settings update message received:", message.settings);
          userSettings = message.settings;

          if (message.changedParts) {
            // Remove excessive log
            // console.log("Changed parts detected:", message.changedParts);
            // Handle the async nature of theme application
            applyChangedSettings(message.changedParts)
              .then(() => {
                // Remove excessive log
                // console.log("Settings applied successfully");
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
          console.log("Force reload message received, reason:", message.reason);
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
