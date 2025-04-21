console.log("Clutch extension content script loaded");

import { initialize as initializeTheme } from "./themes/themeUtils";
import { initialize as initializeProfileButtons } from "./playerProfile/profileButtons";
import { initialize as initializeProfileBans } from "./playerProfile/previousBans";
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
import { observeProfileChanges, isProfilePage } from "./utils/profileUtils";

let userSettings: UserSettings = defaultUserSettings;
const LS_KEY = "userSettings";

console.log("Default user settings:", defaultUserSettings);

/**
 * Waits for the page to be fully loaded and DOM to be ready
 */
function waitForPageReady(): Promise<void> {
  console.log(
    `waitForPageReady called, current document.readyState: ${document.readyState}`
  );
  return new Promise((resolve) => {
    if (document.readyState === "complete") {
      console.log("Document already complete, resolving immediately");
      resolve();
    } else {
      console.log("Document not ready, waiting for load event");
      window.addEventListener("load", () => {
        console.log("Document load event fired, resolving");
        resolve();
      });
    }
  });
}

/**
 * Applies settings that require DOM to be ready
 */
async function applyDomDependentSettings(settings: UserSettings) {
  console.log("Applying DOM-dependent settings:", {
    theme: settings.selectedTheme,
    profileButtons: settings.profileButtons,
    showBans: settings.showBans,
  });

  if (settings.selectedTheme !== "default") {
    console.log(`Initializing theme: ${settings.selectedTheme}`);
    try {
      await initializeTheme(settings.selectedTheme);
      console.log(
        `Theme initialization completed for: ${settings.selectedTheme}`
      );
    } catch (error) {
      console.error("Error during theme initialization:", error);
    }
  } else {
    console.log("Using default theme, skipping theme initialization");
  }

  if (settings.profileButtons.csstats || settings.profileButtons.faceit) {
    console.log(
      "Initializing profile buttons with settings:",
      settings.profileButtons
    );
    initializeProfileButtons(settings.profileButtons);
  }

  if (settings.showBans) {
    console.log("Initializing profile bans display");
    initializeProfileBans(settings.showBans);
  }
}

async function applyChangedSettings(changedParts: Partial<UserSettings>) {
  console.log("Applying changed settings:", changedParts);

  if (changedParts.selectedTheme) {
    console.log(`Theme changed to: ${changedParts.selectedTheme}`);
    if (changedParts.selectedTheme !== "default") {
      try {
        await initializeTheme(changedParts.selectedTheme);
        console.log(
          `Theme initialization completed for: ${changedParts.selectedTheme}`
        );
      } catch (error) {
        console.error("Error applying theme change:", error);
      }
    } else {
      console.log("Changed to default theme, no theme initialization needed");
    }
  }

  if (changedParts.profileButtons) {
    console.log(
      "Profile buttons settings changed:",
      changedParts.profileButtons
    );
    if (
      changedParts.profileButtons.csstats ||
      changedParts.profileButtons.faceit
    ) {
      initializeProfileButtons(changedParts.profileButtons);
    }
  }

  if (changedParts.showBans !== undefined) {
    console.log("Bans display setting changed:", changedParts.showBans);
    initializeProfileBans(changedParts.showBans);
  }

  if (changedParts.autoAccept) {
    console.log("Auto accept settings changed:", changedParts.autoAccept);
    updateMatchFoundAutoAcceptSettings(userSettings);
    updateAutoAcceptPartyInviteSettings(userSettings);
  }

  if (changedParts.keepAlive !== undefined) {
    console.log("Keep alive setting changed:", changedParts.keepAlive);
    updateKeepAliveSettings(userSettings);
  }
}

async function loadFromChromeStorage(): Promise<UserSettings> {
  console.log("Loading settings from Chrome storage");
  try {
    const result = await chrome.storage.local.get(LS_KEY);
    console.log("Chrome storage result:", result);
    const settings = result[LS_KEY] || defaultUserSettings;
    console.log("Loaded settings:", settings);
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
  } else {
    console.log("Unknown message type received");
    sendResponse({ status: "unknown" });
  }

  return true;
});
