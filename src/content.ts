console.log("Clutch extension content script loaded");

import { initialize as initializeTheme } from "./themes/themeUtils";
import { initialize as initializeProfileButtons } from "./playerProfile/profileButtons";
import { defaultUserSettings, type UserSettings } from "./lib/types";

let userSettings: UserSettings = defaultUserSettings;

async function initialize() {
  const result = await chrome.storage.local.get("userSettings");
  userSettings = result.userSettings || defaultUserSettings;
  console.log("Loaded user settings in content script:", result);

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
