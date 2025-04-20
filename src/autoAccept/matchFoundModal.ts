import type { UserSettings } from "../lib/types";

let latestUserSettings: UserSettings | null = null;
let observer: MutationObserver | null = null;

export function initializeMatchFoundAutoAccept(userSettings: UserSettings) {
  latestUserSettings = userSettings;
  const main = document.querySelector("main");
  if (!main) return;
  if (observer) return;

  observer = new MutationObserver(() => {
    const modal = main.querySelector(".confirm-match-modal");
    if (modal && latestUserSettings?.autoAccept.match) {
      const acceptBtn = modal.querySelector<HTMLButtonElement>(
        "button.primary-button"
      );
      if (acceptBtn) {
        setTimeout(() => {
          const stillModal = main.querySelector(".confirm-match-modal");
          const stillBtn = stillModal?.querySelector<HTMLButtonElement>(
            "button.primary-button"
          );
          if (stillModal && stillBtn) {
            stillBtn.click();
          }
        }, 1000);
      }
    }
  });

  observer.observe(main, { childList: true, subtree: true });
}

export function updateMatchFoundAutoAcceptSettings(userSettings: UserSettings) {
  latestUserSettings = userSettings;
}
