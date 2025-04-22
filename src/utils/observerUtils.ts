/**
 * Creates and sets up a MutationObserver with all the necessary safety checks.
 * Handles cases where the target node might not exist yet by waiting for DOM ready.
 *
 * @param callback The MutationObserver callback function
 * @param target The target node to observe (defaults to document.body)
 * @param options The MutationObserver options
 * @param readyCallback Optional callback to run when observer is set up successfully
 * @returns The created MutationObserver instance
 */
export function createSafeObserver(
  callback: MutationCallback,
  target: () => Node | null = () => document.body,
  options: MutationObserverInit = { childList: true, subtree: true },
  readyCallback?: () => void
): MutationObserver {
  // Create the observer
  const observer = new MutationObserver(callback);

  // Function to safely set up the observer
  const setupObserver = (): boolean => {
    const targetNode = target();
    if (targetNode) {
      observer.observe(targetNode, options);
      if (readyCallback) {
        readyCallback();
      }
      return true;
    }
    return false;
  };

  // Try to set up immediately
  const observerSetup = setupObserver();

  // If target doesn't exist yet, wait for it
  if (!observerSetup) {
    const domReadyCheck = () => {
      if (setupObserver()) {
        document.removeEventListener("DOMContentLoaded", domReadyCheck);
      }
    };

    document.addEventListener("DOMContentLoaded", domReadyCheck);

    // Also check if document is already interactive or complete
    if (
      document.readyState === "interactive" ||
      document.readyState === "complete"
    ) {
      domReadyCheck();
    }
  }

  return observer;
}

/**
 * Safely disconnects an observer if it exists
 *
 * @param observer The observer to disconnect
 */
export function disconnectSafeObserver(
  observer: MutationObserver | null
): void {
  if (observer) {
    observer.disconnect();
  }
}

/**
 * Helper function specifically for observers that need to attach to document.head
 *
 * @param callback The MutationObserver callback function
 * @param options The MutationObserver options
 * @param readyCallback Optional callback to run when observer is set up successfully
 * @returns The created MutationObserver instance
 */
export function createHeadObserver(
  callback: MutationCallback,
  options: MutationObserverInit = { childList: true },
  readyCallback?: () => void
): MutationObserver {
  return createSafeObserver(
    callback,
    () => document.head,
    options,
    readyCallback
  );
}
