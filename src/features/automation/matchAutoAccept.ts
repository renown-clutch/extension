import { registerFeature, ActivationHelpers } from "$system/lib/featureRegistry";
import { type UserSettings, soundFileMap } from "$system/lib/types";
import {
  createSafeObserver,
  disconnectSafeObserver,
} from "$utils/observerUtils";

let observer: MutationObserver | null = null;
const processedMatches = new Set<string>();
let isProcessingMatch = false;
let debounceTimer: number | null = null;
let cleanupTimer: number | null = null;
let matchSound: HTMLAudioElement | null = null;
let currentSettings: UserSettings | null = null;

function initializeMatchSound() {
  if (!currentSettings || !currentSettings.matchFoundSound) return;

  if (currentSettings.matchFoundSound !== "none") {
    matchSound = new Audio(
      chrome.runtime.getURL(
        `static/sounds/${soundFileMap[currentSettings.matchFoundSound]}`
      )
    );
  }
}

function playMatchSound() {
  if (!currentSettings) return;

  if (
    currentSettings.matchFoundSound === "none" ||
    currentSettings.matchFoundVolume === 0
  ) {
    return;
  }

  if (!matchSound) {
    initializeMatchSound();
  }

  if (matchSound) {
    matchSound.volume = currentSettings.matchFoundVolume / 100;
    matchSound.currentTime = 0;
    matchSound
      .play()
      .catch((err) => console.error("Error playing match found sound:", err));
  }
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
  if (isProcessingMatch) return;

  const modal = findMatchFoundModal();
  if (!modal) return;

  const modalId = getModalId(modal);
  if (processedMatches.has(modalId)) return;

  playMatchSound();

  if (!currentSettings?.autoAccept.match) return;

  isProcessingMatch = true;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    processMatch(modal, modalId);
  }, 100);
}

function processMatch(modal: Element, modalId: string) {
  const acceptBtn = modal.querySelector<HTMLButtonElement>(
    "button.primary-button"
  );
  if (!acceptBtn) {
    isProcessingMatch = false;
    return;
  }

  processedMatches.add(modalId);

  const delay = currentSettings?.matchAutoAcceptDelay ?? 3;
  const delayMs = delay * 1000;

  const bufferMs = delay > 0 ? 500 : 0;

  setTimeout(() => {
    if (document.body.contains(modal) && document.body.contains(acceptBtn)) {
      acceptBtn.click();
    }
    isProcessingMatch = false;
  }, delayMs + bufferMs);
}

function setupCleanupTimer() {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
  }

  cleanupTimer = window.setTimeout(() => {
    processedMatches.clear();
    setupCleanupTimer();
  }, 30000);
}

function getModalId(modal: Element): string {
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
  if (isProcessingMatch) return;

  const modal = findMatchFoundModal();
  if (!modal) return;

  const modalId = getModalId(modal);
  if (processedMatches.has(modalId)) {
    isProcessingMatch = false;
    return;
  }

  playMatchSound();

  if (!currentSettings?.autoAccept.match) return;

  isProcessingMatch = true;
  processMatch(modal, modalId);
}

function initializeMatchAutoAccept(settings: UserSettings): void {
  currentSettings = settings;

  // Clean up any existing observers
  cleanup();

  // Only set up if the feature is enabled
  if (!settings.autoAccept?.match) {
    return;
  }

  try {
    initializeMatchSound();
    setupCleanupTimer();

    observer = createSafeObserver(
      handleDOMChanges,
      () => document.body,
      { childList: true, subtree: true },
      () => checkForExistingMatchFound()
    );
  } catch (error) {
    console.error("[MatchAutoAccept] Error in initialization:", error);
  }
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "autoAccept",
  category: "automation",
  defaultValue: { match: false, party: false },
  description: "Auto-accept match invites",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.whenEnabled("autoAccept"),
    (currentPage, settings) => settings.autoAccept?.match === true
  ),

  handler: initializeMatchAutoAccept,

  apiCalls: [],
});
