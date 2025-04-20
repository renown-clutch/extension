import type { UserSettings } from "../lib/types";

let latestUserSettings: UserSettings | null = null;
let observer: MutationObserver | null = null;

export function initializeMatchFoundAutoAccept(userSettings: UserSettings) {
  latestUserSettings = userSettings;

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  observer = new MutationObserver(() => {
    const modal = findMatchFoundModal();

    if (modal && latestUserSettings?.autoAccept.match) {
      const acceptBtn = modal.querySelector<HTMLButtonElement>(
        "button.primary-button"
      );

      if (acceptBtn) {
        setTimeout(() => {
          if (
            document.body.contains(modal) &&
            document.body.contains(acceptBtn)
          ) {
            acceptBtn.click();
          }
        }, 1000);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  checkForExistingMatchFound();
  setTimeout(checkForExistingMatchFound, 500);
}

function findMatchFoundModal(): Element | null {
  const modal = document.querySelector(".confirm-match-modal");
  if (modal) {
    return modal;
  }

  return (
    document.querySelector("[data-testid='match-found-modal']") ||
    document.querySelector(".match-found-container") ||
    document.querySelector("[class*='matchFound']")
  );
}

function checkForExistingMatchFound() {
  if (!latestUserSettings?.autoAccept.match) return;

  const modal = findMatchFoundModal();

  if (modal) {
    const acceptBtn = modal.querySelector<HTMLButtonElement>(
      "button.primary-button"
    );
    if (acceptBtn) {
      acceptBtn.click();
    }
  }
}

export function updateMatchFoundAutoAcceptSettings(userSettings: UserSettings) {
  latestUserSettings = userSettings;

  if (userSettings.autoAccept.match) {
    checkForExistingMatchFound();
  }
}
