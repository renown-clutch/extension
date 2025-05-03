import type { UserSettings } from "../lib/types";
import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";
import { soundFileMap } from "../lib/types";

let latestUserSettings: UserSettings | null = null;
let observer: MutationObserver | null = null;
const processedMatches = new Set<string>();
let isProcessingMatch = false;
let debounceTimer: number | null = null;
let cleanupTimer: number | null = null;
let matchSound: HTMLAudioElement | null = null;

function initializeMatchSound() {
  if (!latestUserSettings || !latestUserSettings.matchFoundSound) return;

  if (latestUserSettings.matchFoundSound !== "none") {
    matchSound = new Audio(
      chrome.runtime.getURL(
        `static/sounds/${soundFileMap[latestUserSettings.matchFoundSound]}`
      )
    );
  }
}

function playMatchSound() {
  if (!latestUserSettings) return;

  if (
    latestUserSettings.matchFoundSound === "none" ||
    latestUserSettings.matchFoundVolume === 0
  ) {
    return;
  }

  if (!matchSound) {
    initializeMatchSound();
  }

  if (matchSound) {
    matchSound.volume = latestUserSettings.matchFoundVolume / 100;
    matchSound.currentTime = 0;
    matchSound
      .play()
      .catch((err) => console.error("Error playing match found sound:", err));
  }
}

export function initializeMatchFoundAutoAccept(userSettings: UserSettings) {
  latestUserSettings = userSettings;

  cleanup();

  initializeMatchSound();
  setupCleanupTimer();

  observer = createSafeObserver(
    handleDOMChanges,
    () => document.body,
    { childList: true, subtree: true },
    () => checkForExistingMatchFound()
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
  if (isProcessingMatch) return;

  const modal = findMatchFoundModal();
  if (!modal) return;

  const modalId = getModalId(modal);
  if (processedMatches.has(modalId)) return;

  playMatchSound();

  if (!latestUserSettings?.autoAccept.match) return;

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

  const delay = latestUserSettings?.matchAutoAcceptDelay ?? 3;
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

  if (!latestUserSettings?.autoAccept.match) return;

  isProcessingMatch = true;
  processMatch(modal, modalId);
}

export function updateMatchFoundAutoAcceptSettings(userSettings: UserSettings) {
  latestUserSettings = userSettings;

  initializeMatchSound();

  if (userSettings.autoAccept.match && !isProcessingMatch) {
    checkForExistingMatchFound();
  }
}
