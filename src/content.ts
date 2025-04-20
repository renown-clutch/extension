console.log("Clutch extension content script loaded");

import { initialize as initializeTheme } from "./themes/themeUtils";
import { initialize as initializeProfileButtons } from "./playerProfile/profileButtons";
import { defaultUserSettings, type UserSettings } from "./lib/types";

let userSettings: UserSettings = defaultUserSettings;

async function initialize() {
  // Try to load from localStorage first
  const localStorageSettings = localStorage.getItem("userSettings");
  if (localStorageSettings) {
    try {
      userSettings = JSON.parse(localStorageSettings);
      console.log("Loaded user settings from localStorage:", userSettings);
    } catch (e) {
      userSettings = defaultUserSettings;
      console.warn(
        "Failed to parse userSettings from localStorage, using default."
      );
    }
  }

  // Use settings immediately for theme/buttons
  if (userSettings.selectedTheme !== "default") {
    initializeTheme(userSettings.selectedTheme);
  }
  if (
    userSettings.profileButtons.csstats ||
    userSettings.profileButtons.faceit
  ) {
    initializeProfileButtons(userSettings.profileButtons);
  }

  // Always update from chrome.storage.local in the background
  const result = await chrome.storage.local.get("userSettings");
  const freshSettings = result.userSettings || defaultUserSettings;
  // If settings differ, update and re-inject
  if (JSON.stringify(freshSettings) !== JSON.stringify(userSettings)) {
    userSettings = freshSettings;
    localStorage.setItem("userSettings", JSON.stringify(userSettings));
    // Optionally, re-initialize theme/buttons if needed
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
  console.log(
    "Loaded user settings in content script (from chrome.storage):",
    result
  );
}

initialize();

let confirmModalActive = userSettings.showConfirmModal;
const confirmModalHtml = `<div class="confirm-match-modal"><div class="modal-content"><div class="waiting-for-confirm"><h3 class="title">Your match is ready</h3><div class="confirm-within">Confirm your participation within</div><div class="countdown"><span class="countdown-render">00:08</span></div><button class="primary-button md gradient">Accept</button></div><div class="disclaimer">When you start a game of Renown, you're agreeing to stay for the entire match, usually lasting 30-45 minutes. Leaving the match once you've joined will result in a penalty.</div></div></div>`;

function toggleConfirmModal(show: boolean): void {
  const main = document.querySelector("main");
  if (!main) {
    return;
  }

  const existing = main.querySelector(".confirm-match-modal");
  if (show) {
    if (!existing) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = confirmModalHtml;
      const modal = wrapper.firstElementChild!;
      main.prepend(modal);

      const acceptBtn = modal.querySelector("button.primary-button");
      if (acceptBtn) {
        acceptBtn.addEventListener("click", async () => {
          toggleConfirmModal(false);
          userSettings.showConfirmModal = false;
          await chrome.storage.local.set({ userSettings });
          localStorage.setItem("userSettings", JSON.stringify(userSettings));
        });
      }
    }
  } else {
    if (existing) {
      existing.remove();
    }
  }
  confirmModalActive = show;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
  if (area === "local" && changes.userSettings) {
    localStorage.setItem(
      "userSettings",
      JSON.stringify(changes.userSettings.newValue)
    );
  }
});
