import type { UserSettings } from "../lib/types";
import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";

let latestUserSettings: UserSettings | null = null;
let observer: MutationObserver | null = null;
// Track processed matches to prevent multiple clicks
const processedMatches = new Set<string>();
// Flag to indicate if we're currently processing a match
let isProcessingMatch = false;
// Timers
let debounceTimer: number | null = null;
let cleanupTimer: number | null = null;

export function initializeMatchFoundAutoAccept(userSettings: UserSettings) {
  latestUserSettings = userSettings;

  // Clean up existing resources
  cleanup();

  // Set up a periodic cleanup of processedMatches
  setupCleanupTimer();

  // Create the observer with our utility function
  observer = createSafeObserver(
    handleDOMChanges,
    () => document.body,
    { childList: true, subtree: true },
    () => checkForExistingMatchFound() // Run checks after successful setup
  );
}

function cleanup() {
  disconnectSafeObserver(observer);
  observer = null;
  processedMatches.clear();
  isProcessingMatch = false;

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
  if (isProcessingMatch || !latestUserSettings?.autoAccept.match) return;

  const modal = findMatchFoundModal();
  if (!modal) return;

  const modalId = getModalId(modal);
  if (processedMatches.has(modalId)) return;

  isProcessingMatch = true;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    processMatch(modal, modalId);
  }, 100); // Small debounce delay
}

function processMatch(modal: Element, modalId: string) {
  const acceptBtn = modal.querySelector<HTMLButtonElement>(
    "button.primary-button"
  );
  if (!acceptBtn) {
    isProcessingMatch = false;
    return;
  }

  // Mark this match as processed
  processedMatches.add(modalId);

  const delay = latestUserSettings?.matchAutoAcceptDelay || 3;
  const delayMs = delay === 0 ? 0 : delay * 1000;

  setTimeout(() => {
    if (document.body.contains(modal) && document.body.contains(acceptBtn)) {
      acceptBtn.click();
    }
    // Reset the processing flag
    isProcessingMatch = false;
  }, delayMs + 500); // Extra 500ms for stability when delay is 0
}

// Set up a timer to periodically clean up the processedMatches set
function setupCleanupTimer() {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
  }

  // Clean up processed matches every 30 seconds
  cleanupTimer = window.setTimeout(() => {
    processedMatches.clear();
    // Set up the next cleanup
    setupCleanupTimer();
  }, 30000); // 30 seconds
}

function getModalId(modal: Element): string {
  // Create a reliable ID based on the modal content plus a rough timestamp
  const timeComponent = Math.floor(Date.now() / 1000);
  return `match-${timeComponent}`;
}

function findMatchFoundModal(): Element | null {
  return (
    document.querySelector(".confirm-match-modal") ||
    document.querySelector("[data-testid='match-found-modal']") ||
    document.querySelector(".match-found-container") ||
    document.querySelector("[class*='matchFound']")
  );
}

function checkForExistingMatchFound() {
  if (!latestUserSettings?.autoAccept.match || isProcessingMatch) return;

  const modal = findMatchFoundModal();
  if (!modal) return;

  const modalId = getModalId(modal);
  if (processedMatches.has(modalId)) {
    isProcessingMatch = false;
    return;
  }

  isProcessingMatch = true;
  processMatch(modal, modalId);
}

export function updateMatchFoundAutoAcceptSettings(userSettings: UserSettings) {
  latestUserSettings = userSettings;

  if (userSettings.autoAccept.match && !isProcessingMatch) {
    checkForExistingMatchFound();
  }
}
