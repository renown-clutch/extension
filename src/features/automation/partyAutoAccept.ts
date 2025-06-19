import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import {
  createSafeObserver,
  disconnectSafeObserver,
} from "$utils/ui/observerUtils";

let observer: MutationObserver | null = null;
const processedInvites = new Set<string>();
let isProcessingInvite = false;
let debounceTimer: number | null = null;
let cleanupTimer: number | null = null;
let currentSettings: UserSettings | null = null;

function cleanup() {
  disconnectSafeObserver(observer);
  observer = null;
  processedInvites.clear();
  isProcessingInvite = false;

  clearTimers();
}

function clearTimers() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
}

function handleDOMChanges() {
  if (isProcessingInvite) return;

  const modal = findPartyInviteModal();
  if (!modal) return;

  const modalId = getModalId(modal);
  if (processedInvites.has(modalId)) return;

  if (!currentSettings?.autoAccept.party) return;

  isProcessingInvite = true;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    processInvite(modal, modalId);
  }, 100);
}

function processInvite(modal: Element, modalId: string) {
  const acceptBtn = modal.querySelector<HTMLButtonElement>("button.accept");
  if (!acceptBtn) {
    isProcessingInvite = false;
    return;
  }

  processedInvites.add(modalId);

  const delay = currentSettings?.partyAutoAcceptDelay ?? 3;
  const delayMs = delay * 1000;

  const bufferMs = delay > 0 ? 500 : 0;

  setTimeout(() => {
    if (document.body.contains(modal) && document.body.contains(acceptBtn)) {
      acceptBtn.click();
    }
    isProcessingInvite = false;
  }, delayMs + bufferMs);
}

function setupCleanupTimer() {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
  }

  cleanupTimer = window.setTimeout(() => {
    processedInvites.clear();
    setupCleanupTimer();
  }, 30000);
}

function getModalId(modal: Element): string {
  const inviterElement = modal.querySelector(".toast-party-invite");
  const inviterText = inviterElement ? inviterElement.textContent || "" : "";
  const cleanText = inviterText.replace(/\s+/g, " ").trim();
  const timeComponent = Math.floor(Date.now() / 1000);
  return `invite-${cleanText}-${timeComponent}`;
}

function findPartyInviteModal(): Element | null {
  const inviteElements = document.querySelectorAll(".toast-party-invite");

  if (inviteElements.length > 0) {
    const element = inviteElements[0];
    const invitedToElement = element.querySelector(".invited-to");
    if (
      invitedToElement &&
      invitedToElement.textContent?.includes("friend request")
    ) {
      return null;
    }
    return element.closest(".Toastify__toast");
  }

  return document.querySelector("#clutch-ext-invite-toast");
}

function checkForExistingInvite() {
  if (isProcessingInvite) return;

  const modal = findPartyInviteModal();
  if (!modal) return;

  const modalId = getModalId(modal);
  if (processedInvites.has(modalId)) {
    isProcessingInvite = false;
    return;
  }

  if (!currentSettings?.autoAccept.party) return;

  isProcessingInvite = true;
  processInvite(modal, modalId);
}

function initializePartyAutoAccept(settings: UserSettings): void {
  currentSettings = settings;

  // Clean up any existing observers
  cleanup();

  // Only set up if the feature is enabled
  if (!settings.autoAccept?.party) {
    return;
  }

  try {
    setupCleanupTimer();

    observer = createSafeObserver(
      handleDOMChanges,
      () => document.body,
      { childList: true, subtree: true },
      () => checkForExistingInvite()
    );
  } catch (error) {
    console.error("[PartyAutoAccept] Error in initialization:", error);
  }
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "autoAccept",
  category: "autoAccept",
  defaultValue: { match: false, party: false },
  description: "Auto-accept party invites",
  featureId: "partyAutoAccept", // Unique identifier to avoid conflicts

  shouldActivate: (currentPage, settings) =>
    settings.autoAccept?.party === true,

  dependsOn: ["partyAutoAcceptDelay"],

  handler: initializePartyAutoAccept,
  cleanupHandler: cleanup,

  apiCalls: [],
});
