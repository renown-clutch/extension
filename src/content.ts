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

/**
 * Waits for the page to be fully loaded and DOM to be ready
 */
function waitForPageReady(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === "complete") {
      resolve();
    } else {
      window.addEventListener("load", () => resolve());
    }
  });
}

/**
 * Applies settings that require DOM to be ready
 */
function applyDomDependentSettings(settings: UserSettings) {
  if (settings.selectedTheme !== "default") {
    initializeTheme(settings.selectedTheme);
  }

  if (settings.profileButtons.csstats || settings.profileButtons.faceit) {
    initializeProfileButtons(settings.profileButtons);
  }

  if (settings.showBans) {
    initializeProfileBans(settings.showBans);
  }
}

function applyChangedSettings(changedParts: Partial<UserSettings>) {
  if (changedParts.selectedTheme && changedParts.selectedTheme !== "default") {
    initializeTheme(changedParts.selectedTheme);
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
    console.log("bans changed", changedParts.showBans);
    initializeProfileBans(changedParts.showBans);
  }

  if (changedParts.autoAccept) {
    updateMatchFoundAutoAcceptSettings(userSettings);
    updateAutoAcceptPartyInviteSettings(userSettings);
  }

  if (changedParts.keepAlive !== undefined) {
    updateKeepAliveSettings(userSettings);
  }
}

async function loadFromChromeStorage(): Promise<UserSettings> {
  const result = await chrome.storage.local.get(LS_KEY);
  return result[LS_KEY] || defaultUserSettings;
}

async function initialize() {
  const freshSettings = await loadFromChromeStorage();
  userSettings = freshSettings;

  // Initialize non-DOM dependent features immediately
  initializeMatchFoundAutoAccept(userSettings);
  initializeAutoAcceptPartyInvite(userSettings);
  initializeKeepAlive(userSettings);

  // Wait for page to be ready before initializing DOM-dependent features
  await waitForPageReady();
  applyDomDependentSettings(userSettings);

  // Set up profile change observer for profile-related features
  observeProfileChanges((profileId) => {
    console.log("Profile changed, reinitializing profile features", profileId);
    if (profileId) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (
          userSettings.profileButtons.csstats ||
          userSettings.profileButtons.faceit
        ) {
          initializeProfileButtons(userSettings.profileButtons);
        }
        if (userSettings.showBans) {
          initializeProfileBans(userSettings.showBans);
        }
      }, 300);
    }
  });
}

initialize();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("Received message from popup:", message);

  if (message.type === "settingsUpdate") {
    userSettings = message.settings;

    if (message.changedParts) {
      applyChangedSettings(message.changedParts);
    }

    sendResponse({ status: "success" });
  } else {
    sendResponse({ status: "unknown" });
  }

  return true;
});
