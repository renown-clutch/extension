import type { UserSettings } from "../lib/types";
import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";

let latestUserSettings: UserSettings | null = null;
let observer: MutationObserver | null = null;

export function initializeAutoAcceptPartyInvite(userSettings: UserSettings) {
  latestUserSettings = userSettings;

  // Clean up any existing observer
  disconnectSafeObserver(observer);
  observer = null;

  // Create the observer with our utility function
  observer = createSafeObserver(
    () => {
      const modal = findPartyInviteModal();

      if (modal && latestUserSettings?.autoAccept.party) {
        const acceptBtn =
          modal.querySelector<HTMLButtonElement>("button.accept");

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
      checkForExistingInvite();
      setTimeout(checkForExistingInvite, 500);
    }
  );
}

function findPartyInviteModal(): Element | null {
  const inviteElements = document.querySelectorAll(".toast-party-invite");

  if (inviteElements.length > 0) {
    return inviteElements[0].closest(".Toastify__toast");
  }

  return document.querySelector("#clutch-ext-invite-toast");
}

function checkForExistingInvite() {
  if (!latestUserSettings?.autoAccept.party) return;

  const modal = findPartyInviteModal();

  if (modal) {
    const acceptBtn = modal.querySelector<HTMLButtonElement>("button.accept");
    if (acceptBtn) {
      acceptBtn.click();
    }
  }
}

export function updateAutoAcceptPartyInviteSettings(
  userSettings: UserSettings
) {
  latestUserSettings = userSettings;

  if (userSettings.autoAccept.party) {
    checkForExistingInvite();
  }
}
