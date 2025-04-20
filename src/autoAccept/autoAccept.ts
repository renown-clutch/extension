import type { UserSettings } from "../lib/types";

let latestUserSettings: UserSettings | null = null;
let observer: MutationObserver | null = null;

/**
 * Sets up a persistent MutationObserver for the confirm modal.
 * Only clicks the accept button if userSettings.autoAccept.match is true.
 * Call this once on startup, and call updateAutoAcceptSettings whenever settings change.
 */
export function initializeAutoAccept(userSettings: UserSettings) {
  latestUserSettings = userSettings;
  const main = document.querySelector("main");
  if (!main) return;
  if (observer) return; // Only add observer once

  observer = new MutationObserver(() => {
    const modal = main.querySelector(".confirm-match-modal");
    if (modal && latestUserSettings?.autoAccept.match) {
      const acceptBtn = modal.querySelector<HTMLButtonElement>(
        "button.primary-button"
      );
      if (acceptBtn) {
        acceptBtn.click();
      }
    }
  });

  observer.observe(main, { childList: true, subtree: true });
}

/**
 * Call this whenever userSettings change to update the observer's behavior.
 */
export function updateAutoAcceptSettings(userSettings: UserSettings) {
  latestUserSettings = userSettings;
}
