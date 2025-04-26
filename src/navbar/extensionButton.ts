/**
 * Module for adding a Clutch extension link to the navbar
 */

import { createSafeObserver } from "../utils/observerUtils";
import browserAPI from "../lib/browserAPI";

const BUTTON_ID = "clutch-extension-navbar-link";

// State tracking variables
let isEnabled = false;
let isProcessing = false;
let hasButtonBeenAdded = false;
let isPerformingButtonOperation = false;
let navbarObserver: MutationObserver | null = null;
let debounceTimer: number | null = null;

/**
 * Initialize the extension navbar link
 * @param enabled - Whether the link should be displayed
 */
export function initializeExtensionButton(enabled: boolean): void {
  isEnabled = enabled;

  if (enabled) {
    setupNavbarObserver();
  } else {
    removeLinkFromNavbar();
  }
}

/**
 * Update the extension navbar link based on settings changes
 * @param enabled - Whether the link should be displayed
 */
export function updateExtensionButtonSettings(enabled: boolean): void {
  if (isEnabled === enabled) return; // No change needed

  isEnabled = enabled;

  if (enabled) {
    setupNavbarObserver();
  } else {
    removeLinkFromNavbar();
    if (navbarObserver) {
      navbarObserver.disconnect();
      navbarObserver = null;
    }
  }
}

/**
 * Set up the observer to watch for navbar changes
 */
function setupNavbarObserver(): void {
  // Prevent duplicate observers
  if (navbarObserver) {
    navbarObserver.disconnect();
    navbarObserver = null;
  }

  // Debounced processing function
  const debouncedProcessNavbar = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(processNavbar, 300) as unknown as number;
  };

  // Create a safe observer using utility similar to sidebar implementation
  navbarObserver = createSafeObserver(
    (mutations) => {
      if (isProcessing || isPerformingButtonOperation) return;

      const shouldProcess = mutations.some(
        (mutation) =>
          mutation.type === "childList" &&
          ((mutation.target instanceof Element &&
            mutation.target.classList?.contains("navbar")) ||
            (mutation.target instanceof Element &&
              mutation.target.closest?.(".navbar")))
      );

      if (shouldProcess) {
        debouncedProcessNavbar();
      }
    },
    () => document.body,
    { childList: true, subtree: true },
    // Initial check
    processNavbar
  );

  // Force an initial process
  debouncedProcessNavbar();
}

/**
 * Process the navbar to add the Clutch link
 */
async function processNavbar(): Promise<void> {
  if (isProcessing || !isEnabled) return;
  isProcessing = true;

  try {
    // Check if navbar exists
    const linksContainer = document.querySelector(
      ".navbar .container .content .links"
    );
    if (!linksContainer) {
      isProcessing = false;
      return;
    }

    // Find existing button to avoid duplicates
    const existingButton = document.getElementById(BUTTON_ID);

    // If not enabled but button exists, remove it
    if (!isEnabled && existingButton) {
      removeButtonElement(existingButton);
      hasButtonBeenAdded = false;
      isProcessing = false;
      return;
    }

    // If enabled but button already exists, do nothing
    if (isEnabled && existingButton && hasButtonBeenAdded) {
      isProcessing = false;
      return;
    }

    // If enabled and button doesn't exist, add it
    if (isEnabled && !existingButton) {
      await addLinkToNavbar();
    }
  } catch (error) {
    console.error("Error processing navbar:", error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Handler for button click - opens popup in a cross-browser compatible way
 */
function handleButtonClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  // Send a message to the background script to handle popup opening
  // This is the most reliable cross-browser solution
  if (typeof browser !== "undefined") {
    browser.runtime.sendMessage({ action: "openPopup" }).catch((err) => {
      console.error("Firefox message failed:", err);
    });
  } else if (typeof chrome !== "undefined") {
    chrome.runtime.sendMessage({ action: "openPopup" });
  }
}

/**
 * Add the CLUTCH link to the navbar
 */
async function addLinkToNavbar(): Promise<void> {
  isPerformingButtonOperation = true;

  try {
    // Check if the button already exists
    if (document.getElementById(BUTTON_ID)) {
      hasButtonBeenAdded = true;
      isPerformingButtonOperation = false;
      return;
    }

    const linksContainer = document.querySelector(
      ".navbar .container .content .links"
    );
    if (!linksContainer) {
      isPerformingButtonOperation = false;
      return;
    }

    // Find the Banlist link to position after it
    const banlistLink = Array.from(linksContainer.querySelectorAll("a")).find(
      (link) => link.textContent?.toLowerCase().includes("banlist")
    );

    if (banlistLink) {
      // Create the Clutch link with the same styling as other navbar links
      const clutchLink = document.createElement("a");
      clutchLink.id = BUTTON_ID;
      clutchLink.className = banlistLink.className; // Copy the same class as other links
      clutchLink.href = "#"; // Use # to prevent navigation
      clutchLink.textContent = "CLUTCH";

      // Add click handler to open extension popup
      clutchLink.addEventListener("click", handleButtonClick);

      // Insert after the banlist link
      banlistLink.after(clutchLink);

      hasButtonBeenAdded = true;
    }
  } catch (error) {
    console.error("Error adding navbar link:", error);
  } finally {
    isPerformingButtonOperation = false;
  }
}

/**
 * Remove button element from DOM
 */
function removeButtonElement(element: HTMLElement): void {
  try {
    element.remove();
  } catch (error) {
    console.error("Error removing button element:", error);
  }
}

/**
 * Remove the CLUTCH link from the navbar
 */
function removeLinkFromNavbar(): void {
  isPerformingButtonOperation = true;

  try {
    // Get all elements with our ID (in case of duplicates)
    const elements = document.querySelectorAll(`#${BUTTON_ID}`);

    elements.forEach((element) => {
      if (element instanceof HTMLElement) {
        removeButtonElement(element);
      }
    });

    hasButtonBeenAdded = false;
  } catch (error) {
    console.error("Error removing navbar link:", error);
  } finally {
    isPerformingButtonOperation = false;
  }
}
