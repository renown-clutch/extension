import { createSafeObserver } from "./observerUtils";

export const PROFILE_URL_REGEX = /\/profile\/(\d+)/;

export function getPlayerIdFromUrl(): string | null {
  const match = window.location.pathname.match(PROFILE_URL_REGEX);
  return match ? match[1] : null;
}

export function isProfilePage(): boolean {
  return getPlayerIdFromUrl() !== null;
}

export function createProfileChangeHandler(
  callback: (profileId: string | null) => void
): () => void {
  let lastProfileId = getPlayerIdFromUrl();
  let lastFullUrl = window.location.href;

  return () => {
    const currentFullUrl = window.location.href;
    const urlChanged = currentFullUrl !== lastFullUrl;
    const currentProfileId = getPlayerIdFromUrl();

    if (currentProfileId !== lastProfileId) {
      lastProfileId = currentProfileId;
      lastFullUrl = currentFullUrl;
      callback(currentProfileId);
    }
  };
}

export function observeProfileChanges(
  callback: (profileId: string | null) => void
): void {
  const handleUrlChange = createProfileChangeHandler(callback);

  // Modern Navigation API (Chrome, Edge)
  if (
    "navigation" in window &&
    window.navigation &&
    "addEventListener" in (window.navigation as any)
  ) {
    (window.navigation as any).addEventListener("navigate", handleUrlChange);
    (window.navigation as any).addEventListener(
      "navigatesuccess",
      handleUrlChange
    );
    (window.navigation as any).addEventListener(
      "navigateerror",
      handleUrlChange
    );
  }

  // Always add these event listeners regardless of Navigation API support
  window.addEventListener("popstate", handleUrlChange);
  window.addEventListener("hashchange", handleUrlChange);
  document.addEventListener("visibilitychange", handleUrlChange);

  // Use our utility function to create the observer
  createSafeObserver(
    () => handleUrlChange(),
    () => document.body,
    { childList: true, subtree: true }
  );
}

// Helper for UI elements to wait for an element to appear in the DOM
export function waitForElement(
  selector: string,
  options?: {
    checkStability?: boolean;
    stabilityTimeout?: number;
    pollInterval?: number;
    stabilityThreshold?: number;
  }
): Promise<Element> {
  const {
    checkStability = true,
    stabilityTimeout = 1000,
    pollInterval = 250,
    stabilityThreshold = 2,
  } = options || {};

  const stabilityPollInterval = 10;

  return new Promise((resolve, reject) => {
    const tryFind = () => {
      const element = document.querySelector(selector);
      if (element) {
        if (!checkStability) {
          resolve(element);
        } else {
          // Initialize stability checking
          let lastHtml = element.innerHTML;
          let stabilityCounter = 0;
          let startTime = Date.now();

          const checkStability = () => {
            if (Date.now() - startTime > stabilityTimeout) {
              resolve(element);
              return;
            }

            const currentElement = document.querySelector(selector);
            if (!currentElement) {
              setTimeout(checkStability, stabilityPollInterval);
              return;
            }

            if (currentElement.innerHTML === lastHtml) {
              stabilityCounter++;

              if (stabilityCounter >= stabilityThreshold) {
                resolve(currentElement);
                return;
              }
            } else {
              stabilityCounter = 0;
              lastHtml = currentElement.innerHTML;
            }

            setTimeout(checkStability, stabilityPollInterval);
          };

          setTimeout(checkStability, stabilityPollInterval);
        }
      } else {
        setTimeout(tryFind, pollInterval);
      }
    };

    tryFind();
  });
}

export function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}
