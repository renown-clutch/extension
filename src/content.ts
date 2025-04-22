console.log("Clutch extension content script loaded");

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

console.log("Default user settings:", defaultUserSettings);

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
    const result = await chrome.storage.local.get(LS_KEY);
    const settings = result[LS_KEY] || defaultUserSettings;
    return settings;
  } catch (error) {
    console.error("Error loading settings from Chrome storage:", error);
    return defaultUserSettings;
  }
}

async function initialize() {
  console.log("Content script initialization started");

  try {
    console.log("Loading fresh settings from Chrome storage");
    const freshSettings = await loadFromChromeStorage();
    userSettings = freshSettings;
    console.log("Settings loaded successfully");

    // Initialize non-DOM dependent features immediately
    console.log("Initializing non-DOM dependent features");
    initializeMatchFoundAutoAccept(userSettings);
    initializeAutoAcceptPartyInvite(userSettings);
    initializeKeepAlive(userSettings);
    initializeFriendsList(userSettings);
    initializeFaceitRanks(userSettings.showFaceitRanksOnMatchPage);
    console.log("Non-DOM dependent features initialized");

    // Wait for page to be ready before initializing DOM-dependent features
    console.log("Waiting for page to be ready");
    await waitForPageReady();
    console.log("Page is ready, proceeding with DOM-dependent features");

    await applyDomDependentSettings(userSettings);
    console.log("DOM-dependent settings applied successfully");

    // Set up profile change observer for profile-related features
    console.log("Setting up profile change observer");
    observeProfileChanges((profileId) => {
      console.log("Profile changed event triggered, profile ID:", profileId);
      if (profileId) {
        // Small delay to ensure DOM is updated
        console.log("Setting timeout to reinitialize profile features");
        setTimeout(() => {
          console.log("Reinitializing profile features after profile change");
          if (
            userSettings.profileButtons.csstats ||
            userSettings.profileButtons.faceit
          ) {
            console.log("Reinitializing profile buttons");
            initializeProfileButtons(userSettings.profileButtons);
          }
          if (userSettings.showBans) {
            console.log("Reinitializing profile bans");
            initializeProfileBans(userSettings.showBans);
          }
          if (userSettings.showSkinDrops) {
            console.log("Reinitializing skin drops");
            initializeSkinDrops(userSettings.showSkinDrops);
          }
        }, 300);
      }
    });
    console.log("Profile change observer set up successfully");
  } catch (error) {
    console.error("Error during content script initialization:", error);
  }
}

initialize();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("Received message from popup:", message);

  if (message.type === "settingsUpdate") {
    console.log("Settings update message received:", message.settings);
    userSettings = message.settings;

    if (message.changedParts) {
      console.log("Changed parts detected:", message.changedParts);
      // Handle the async nature of theme application
      applyChangedSettings(message.changedParts)
        .then(() => {
          console.log("Settings applied successfully");
          sendResponse({ status: "success" });
        })
        .catch((error) => {
          console.error("Error applying settings:", error);
          sendResponse({ status: "error", message: error.message });
        });

      // Return true to indicate we will send response asynchronously
      return true;
    }

    console.log("No changed parts specified, sending success response");
    sendResponse({ status: "success" });
  } else if (message.type === "forceReload") {
    console.log("Force reload message received, reason:", message.reason);
    sendResponse({ status: "reloading" });

    // Reload the page to ensure observers catch popups
    window.location.reload();
  } else {
    console.log("Unknown message type received");
    sendResponse({ status: "unknown" });
  }

  return true;
});
