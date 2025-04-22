import type { UserSettings } from "../lib/types";
import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";

let latestUserSettings: UserSettings | null = null;
let observer: MutationObserver | null = null;

export function initializeMatchFoundAutoAccept(userSettings: UserSettings) {
  latestUserSettings = userSettings;

  // Clean up any existing observer
  disconnectSafeObserver(observer);
  observer = null;

  // Create the observer with our utility function
  observer = createSafeObserver(
    () => {
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
    },
    () => document.body,
    { childList: true, subtree: true },
    () => {
      // Run checks after successful setup
      checkForExistingMatchFound();
      setTimeout(checkForExistingMatchFound, 500);
    }
  );
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
