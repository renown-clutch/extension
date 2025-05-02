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

  createSafeObserver(
    () => handleUrlChange(),
    () => document.body,
    { childList: true, subtree: true }
  );
}

export function waitForElement(
  selector: string,
  options?: {
    checkStability?: boolean;
    stabilityTimeout?: number;
    pollInterval?: number;
    stabilityThreshold?: number;
  }
): Promise<Element> {
  return waitForElements(selector, {
    ...options,
    single: true,
  }) as Promise<Element>;
}

export function waitForElements(
  selector: string,
  options?: {
    checkStability?: boolean;
    stabilityTimeout?: number;
    pollInterval?: number;
    stabilityThreshold?: number;
    single?: boolean;
  }
): Promise<Element | NodeListOf<Element>> {
  const {
    checkStability = true,
    stabilityTimeout = 1000,
    pollInterval = 250,
    stabilityThreshold = 2,
    single = false,
  } = options || {};

  const stabilityPollInterval = 50;

  return new Promise((resolve, reject) => {
    const tryFind = () => {
      const elements = single
        ? document.querySelector(selector)
        : document.querySelectorAll(selector);
      if (
        elements &&
        (single ? true : (elements as NodeListOf<Element>).length > 0)
      ) {
        if (!checkStability) {
          resolve(elements);
        } else {
          let lastChildCount = single
            ? (elements as Element).childNodes.length
            : (elements as NodeListOf<Element>)[0].childNodes.length;
          let lastChildrenHash = single
            ? getElementChildrenHash(elements as Element)
            : getElementChildrenHash((elements as NodeListOf<Element>)[0]);
          let stabilityCounter = 0;
          let startTime = Date.now();

          const checkStability = () => {
            if (Date.now() - startTime > stabilityTimeout) {
              resolve(elements);
              return;
            }

            const currentElements = single
              ? document.querySelector(selector)
              : document.querySelectorAll(selector);
            if (
              !currentElements ||
              (!single && (currentElements as NodeListOf<Element>).length === 0)
            ) {
              setTimeout(checkStability, stabilityPollInterval);
              return;
            }

            const currentChildCount = single
              ? (currentElements as Element).childNodes.length
              : (currentElements as NodeListOf<Element>)[0].childNodes.length;
            const currentChildrenHash = single
              ? getElementChildrenHash(currentElements as Element)
              : getElementChildrenHash(
                  (currentElements as NodeListOf<Element>)[0]
                );

            if (
              currentChildCount === lastChildCount &&
              currentChildrenHash === lastChildrenHash
            ) {
              stabilityCounter++;

              if (stabilityCounter >= stabilityThreshold) {
                resolve(currentElements);
                return;
              }
            } else {
              stabilityCounter = 0;
              lastChildCount = currentChildCount;
              lastChildrenHash = currentChildrenHash;
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

function getElementChildrenHash(element: Element): string {
  // Create a simple hash based on childNodes' nodeType, nodeName and textContent length
  let hash = "";
  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i];
    const nodeType = node.nodeType;
    const nodeName = node.nodeName;
    // For text nodes, use the length of text content
    const contentInfo =
      nodeType === Node.TEXT_NODE
        ? node.textContent?.length || 0
        : node.childNodes.length;

    hash += `${nodeType}-${nodeName}-${contentInfo};`;
  }
  return hash;
}

export function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}
