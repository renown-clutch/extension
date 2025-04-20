import type { UserSettings } from "../lib/types";

let latestUserSettings: UserSettings | null = null;
let observer: MutationObserver | null = null;

export function initializeAutoAcceptPartyInvite(userSettings: UserSettings) {
  latestUserSettings = userSettings;

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  observer = new MutationObserver(() => {
    const modal = findPartyInviteModal();

    if (modal && latestUserSettings?.autoAccept.party) {
      const acceptBtn = modal.querySelector<HTMLButtonElement>("button.accept");

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

  // Check immediately and again after a short delay to ensure existing invites are caught
  checkForExistingInvite();

  // Second check with delay to catch invites that might not be fully rendered yet
  setTimeout(checkForExistingInvite, 500);
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

  // Check for existing invites when settings are updated and auto-accept is enabled
  if (userSettings.autoAccept.party) {
    checkForExistingInvite();
  }
}
