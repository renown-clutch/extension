import type { UserSettings } from "../lib/types";
import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";

let latestUserSettings: UserSettings | null = null;
let observer: MutationObserver | null = null;
// Track processed invites to prevent multiple clicks
const processedInvites = new Set<string>();
// Flag to indicate if we're currently processing an invite
let isProcessingInvite = false;
// Timers
let debounceTimer: number | null = null;
let cleanupTimer: number | null = null;

export function initializeAutoAcceptPartyInvite(userSettings: UserSettings) {
  latestUserSettings = userSettings;

  // Clean up existing resources
  cleanup();

  // Set up a periodic cleanup of processedInvites
  setupCleanupTimer();

  // Create the observer with our utility function
  observer = createSafeObserver(
    handleDOMChanges,
    () => document.body,
    { childList: true, subtree: true },
    () => checkForExistingInvite() // Run checks after successful setup
  );
}

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
  if (isProcessingInvite || !latestUserSettings?.autoAccept.party) return;

  const modal = findPartyInviteModal();
  if (!modal) return;

  const modalId = getModalId(modal);
  if (processedInvites.has(modalId)) return;

  isProcessingInvite = true;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    processInvite(modal, modalId);
  }, 100); // Small debounce delay
}

function processInvite(modal: Element, modalId: string) {
  const acceptBtn = modal.querySelector<HTMLButtonElement>("button.accept");
  if (!acceptBtn) {
    isProcessingInvite = false;
    return;
  }

  // Mark this invite as processed
  processedInvites.add(modalId);

  // Use nullish coalescing instead of logical OR to handle 0 value properly
  const delay = latestUserSettings?.partyAutoAcceptDelay ?? 3;
  const delayMs = delay * 1000;

  // Extra buffer only if there is a delay
  const bufferMs = delay > 0 ? 500 : 0;

  setTimeout(() => {
    if (document.body.contains(modal) && document.body.contains(acceptBtn)) {
      acceptBtn.click();
    }
    // Reset the processing flag
    isProcessingInvite = false;
  }, delayMs + bufferMs);
}

// Set up a timer to periodically clean up the processedInvites set
function setupCleanupTimer() {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
  }

  // Clean up processed invites every 30 seconds
  cleanupTimer = window.setTimeout(() => {
    processedInvites.clear();
    // Set up the next cleanup
    setupCleanupTimer();
  }, 30000); // 30 seconds
}

function getModalId(modal: Element): string {
  // Create a reliable ID based on the modal content plus a rough timestamp
  const inviterElement = modal.querySelector(".toast-party-invite");
  const inviterText = inviterElement ? inviterElement.textContent || "" : "";
  // Clean and normalize the text
  const cleanText = inviterText.replace(/\s+/g, " ").trim();
  // Add timestamp rounded to nearest second
  const timeComponent = Math.floor(Date.now() / 1000);
  return `invite-${cleanText}-${timeComponent}`;
}

function findPartyInviteModal(): Element | null {
  const inviteElements = document.querySelectorAll(".toast-party-invite");

  if (inviteElements.length > 0) {
    return inviteElements[0].closest(".Toastify__toast");
  }

  return document.querySelector("#clutch-ext-invite-toast");
}

function checkForExistingInvite() {
  if (!latestUserSettings?.autoAccept.party || isProcessingInvite) return;

  const modal = findPartyInviteModal();
  if (!modal) return;

  const modalId = getModalId(modal);
  if (processedInvites.has(modalId)) {
    isProcessingInvite = false;
    return;
  }

  isProcessingInvite = true;
  processInvite(modal, modalId);
}

export function updateAutoAcceptPartyInviteSettings(
  userSettings: UserSettings
) {
  latestUserSettings = userSettings;

  if (userSettings.autoAccept.party && !isProcessingInvite) {
    checkForExistingInvite();
  }
}
