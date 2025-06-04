let hydrationDetected = false;
let hydrationTimeout: number | null = null;

// Function to detect if Next.js hydration is complete
export async function waitForHydrationComplete(): Promise<void> {
  return new Promise((resolve) => {
    // If we already detected hydration, resolve immediately
    if (hydrationDetected) {
      resolve();
      return;
    }

    // Check for React hydration markers or Next.js specific indicators
    const checkHydration = () => {
      // Look for Next.js hydration indicators
      const nextData = document.querySelector("#__NEXT_DATA__");
      const hasReactRoot =
        document.querySelector("[data-reactroot]") ||
        document.querySelector("#__next") ||
        document.querySelector('[id*="react"]');

      // Check if content has stabilized (no more rapid changes)
      // Look for common elements that indicate the page is ready
      const hasStableContent =
        document.querySelectorAll(".party-player-card:not(.empty)").length >
          0 ||
        document.querySelectorAll(".team-stats-table .player").length > 0 ||
        document.querySelectorAll('[class*="player"]').length > 0;

      if (hasStableContent) {
        // Wait a bit more to ensure no more changes
        setTimeout(() => {
          hydrationDetected = true;
          resolve();
        }, 500);
      } else {
        // Keep checking
        setTimeout(checkHydration, 100);
      }
    };

    // Start checking, but also set a maximum timeout
    checkHydration();

    // Fallback timeout in case we can't detect hydration properly
    hydrationTimeout = setTimeout(() => {
      hydrationDetected = true;
      resolve();
    }, 3000);
  });
}

// Reset hydration detection state
export function resetHydrationDetection(): void {
  hydrationDetected = false;
  if (hydrationTimeout) {
    clearTimeout(hydrationTimeout);
    hydrationTimeout = null;
  }
}

// Clean up hydration detection state
export function cleanupHydrationDetection(): void {
  resetHydrationDetection();
}

// Check if hydration was already detected
export function isHydrationDetected(): boolean {
  return hydrationDetected;
}

// Create a wrapper function for mutation observers that can detect hydration changes
export function createHydrationAwareMutationCallback(
  callback: (mutations: MutationRecord[], observer: MutationObserver) => void,
  elementSelectors: string[] = [
    ".party-player-card",
    ".team-stats-table .player",
  ]
): (mutations: MutationRecord[], observer: MutationObserver) => void {
  return (mutations: MutationRecord[], observer: MutationObserver) => {
    const hasHydrationChange = mutations.some((mutation) => {
      if (mutation.addedNodes.length > 0) {
        return Array.from(mutation.addedNodes).some((node) => {
          if (!(node instanceof Element)) return false;

          return elementSelectors.some((selector) => {
            const parts = selector.split(" ");
            if (parts.length === 1) {
              return node.classList?.contains(parts[0].replace(".", ""));
            } else {
              return node.querySelector(selector) !== null;
            }
          });
        });
      }
      return false;
    });

    if (hasHydrationChange) {
      resetHydrationDetection();
    }

    // Call the original callback
    callback(mutations, observer);
  };
}
