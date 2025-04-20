console.log("Clutch extension content script loaded");

import { initialize as initializeTheme } from "./themes/themeUtils";
import { initialize as initializeProfileButtons } from "./playerProfile/profileButtons";
import { defaultUserSettings, type UserSettings } from "./lib/types";
import { toggleConfirmModal } from "./confirmModal/confirmModal";
import {
  initializeAutoAccept,
  updateAutoAcceptSettings,
} from "./autoAccept/autoAccept";

let userSettings: UserSettings = defaultUserSettings;

const LS_KEY = "userSettings";

function applySettings(settings: UserSettings) {
  if (settings.selectedTheme !== "default") {
    initializeTheme(settings.selectedTheme);
  }
  if (settings.profileButtons.csstats || settings.profileButtons.faceit) {
    initializeProfileButtons(settings.profileButtons);
  }
  updateAutoAcceptSettings(settings);
}

function saveToLocalStorage(settings: UserSettings) {
  localStorage.setItem(LS_KEY, JSON.stringify(settings));
}

function loadFromLocalStorage(): UserSettings {
  const data = localStorage.getItem(LS_KEY);
  if (!data) return defaultUserSettings;
  try {
    return JSON.parse(data);
  } catch {
    console.warn(
      "Failed to parse userSettings from localStorage, using default."
    );
    return defaultUserSettings;
  }
}

async function loadFromChromeStorage(): Promise<UserSettings> {
  const result = await chrome.storage.local.get(LS_KEY);
  return result[LS_KEY] || defaultUserSettings;
}

async function initialize() {
  // Load from localStorage first
  userSettings = loadFromLocalStorage();
  applySettings(userSettings);

  // Always update from chrome.storage.local in the background
  const freshSettings = await loadFromChromeStorage();
  if (JSON.stringify(freshSettings) !== JSON.stringify(userSettings)) {
    userSettings = freshSettings;
    saveToLocalStorage(userSettings);
    applySettings(userSettings);
  }
  console.log(
    "Loaded user settings in content script (from chrome.storage):",
    freshSettings
  );
  initializeAutoAccept(userSettings);
}

initialize();

function saveToChromeAndLocal(settings: UserSettings): Promise<void> {
  return chrome.storage.local.set({ [LS_KEY]: settings }).then(() => {
    saveToLocalStorage(settings);
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "toggleConfirmModal") {
    toggleConfirmModal(message.show, userSettings, saveToChromeAndLocal);
    sendResponse({ status: "received" });
    return true;
  }
  sendResponse({ status: "unknown" });
  return true;
});

// Listen for changes to userSettings in chrome.storage and update localStorage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[LS_KEY]) {
    saveToLocalStorage(changes[LS_KEY].newValue);
  }
});
