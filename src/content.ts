console.log("Clutch extension content script loaded");

import { initialize as initializeTheme } from "./themes/themeUtils";
import { initialize as initializeProfileButtons } from "./playerProfile/profileButtons";
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

let userSettings: UserSettings = defaultUserSettings;

const LS_KEY = "userSettings";

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

  initializeMatchFoundAutoAccept(userSettings);
  initializeAutoAcceptPartyInvite(userSettings);
  initializeKeepAlive(userSettings);

  if (userSettings.selectedTheme !== "default") {
    initializeTheme(userSettings.selectedTheme);
  }

  if (
    userSettings.profileButtons.csstats ||
    userSettings.profileButtons.faceit
  ) {
    initializeProfileButtons(userSettings.profileButtons);
  }
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
