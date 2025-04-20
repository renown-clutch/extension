console.log("Clutch extension content script loaded");

import { initialize as initializeTheme } from "./themes/themeUtils";
import { initialize as initializeProfileButtons } from "./playerProfile/profileButtons";
import { defaultUserSettings, type UserSettings } from "./lib/types";

let userSettings: UserSettings = defaultUserSettings;

const LS_KEY = "userSettings";

function applySettings(settings: UserSettings) {
  if (settings.selectedTheme !== "default") {
    initializeTheme(settings.selectedTheme);
  }
  if (settings.profileButtons.csstats || settings.profileButtons.faceit) {
    initializeProfileButtons(settings.profileButtons);
  }
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
}

initialize();

let confirmModalActive = userSettings.showConfirmModal;
const confirmModalHtml = `<div class="confirm-match-modal"><div class="modal-content"><div class="waiting-for-confirm"><h3 class="title">Your match is ready</h3><div class="confirm-within">Confirm your participation within</div><div class="countdown"><span class="countdown-render">00:08</span></div><button class="primary-button md gradient">Accept</button></div><div class="disclaimer">When you start a game of Renown, you're agreeing to stay for the entire match, usually lasting 30-45 minutes. Leaving the match once you've joined will result in a penalty.</div></div></div>`;

function toggleConfirmModal(show: boolean): void {
  const main = document.querySelector("main");
  if (!main) return;

  const existing = main.querySelector(".confirm-match-modal");
  if (show && !existing) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = confirmModalHtml;
    const modal = wrapper.firstElementChild!;
    main.prepend(modal);
    const acceptBtn = modal.querySelector("button.primary-button");
    if (acceptBtn) {
      acceptBtn.addEventListener("click", async () => {
        toggleConfirmModal(false);
        userSettings.showConfirmModal = false;
        await chrome.storage.local.set({ [LS_KEY]: userSettings });
        saveToLocalStorage(userSettings);
      });
    }
  } else if (!show && existing) {
    existing.remove();
  }
  confirmModalActive = show;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "toggleConfirmModal") {
    toggleConfirmModal(message.show);
    sendResponse({ success: true, active: confirmModalActive });
    return true;
  }
  sendResponse({ status: "received" });
  return true;
});

// Listen for changes to userSettings in chrome.storage and update localStorage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[LS_KEY]) {
    saveToLocalStorage(changes[LS_KEY].newValue);
  }
});
