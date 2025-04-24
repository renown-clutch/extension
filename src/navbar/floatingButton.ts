import { createShadowRoot } from "../utils/domUtils";
import { initializePanelContent } from "./panelContent";
import { defaultUserSettings, type UserSettings } from "../lib/types";

/**
 * Creates a floating button in the bottom right corner that will open an in-page panel
 * with extension controls instead of using the popup
 */
export function initializeFloatingButton(showButton: boolean): void {
  if (!showButton) return;

  // Create shadow root container
  const shadowContainer = document.createElement("div");
  shadowContainer.id = "clutch-extension-container";
  shadowContainer.style.cssText =
    "position: fixed; z-index: 9999; bottom: 20px; right: 20px;";
  document.body.appendChild(shadowContainer);

  // Create shadow root
  const shadowRoot = createShadowRoot(shadowContainer);

  // Add button to shadow root
  const button = document.createElement("button");
  button.id = "clutch-floating-button";
  button.setAttribute("aria-label", "Open Clutch Extension");
  button.style.cssText = `
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: #1a1b26;
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  `;
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#5D87FF" />
    </svg>
  `;

  // Add hover effect
  button.addEventListener("mouseover", () => {
    button.style.transform = "scale(1.05)";
  });

  button.addEventListener("mouseout", () => {
    button.style.transform = "scale(1)";
  });

  // Add click handler to toggle panel
  button.addEventListener("click", () => {
    togglePanel(shadowRoot);
  });

  shadowRoot.appendChild(button);
}

/**
 * Toggle the extension panel
 */
function togglePanel(shadowRoot: ShadowRoot): void {
  let panel = shadowRoot.getElementById("clutch-panel");

  if (panel) {
    // If panel exists, toggle visibility
    if (panel.style.display === "none") {
      panel.style.display = "block";
    } else {
      panel.style.display = "none";
    }
  } else {
    // Create panel if it doesn't exist
    createPanel(shadowRoot);
  }
}

/**
 * Create the extension panel
 */
function createPanel(shadowRoot: ShadowRoot): void {
  const panel = document.createElement("div");
  panel.id = "clutch-panel";
  panel.style.cssText = `
    position: absolute;
    bottom: 60px;
    right: 0;
    width: 600px;
    height: 440px;
    background-color: #0f172a; /* slate-950 */
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 9999;
    overflow: hidden;
  `;

  // Add loading indicator
  panel.innerHTML =
    '<div class="panel-loading" style="color: white; padding: 20px; display: flex; justify-content: center; align-items: center; height: 100%;">Loading...</div>';

  shadowRoot.appendChild(panel);

  // Load the current settings and initialize panel content
  chrome.storage.local.get("userSettings", (result) => {
    const settings = result.userSettings || defaultUserSettings;
    initializePanelContent(panel, settings);
  });

  // Add click outside to close
  document.addEventListener(
    "click",
    (event) => {
      if (panel && panel.style.display !== "none") {
        const clickedInsidePanel = panel.contains(event.target as Node);
        const clickedOnButton = shadowRoot
          .getElementById("clutch-floating-button")
          ?.contains(event.target as Node);

        if (!clickedInsidePanel && !clickedOnButton) {
          panel.style.display = "none";
        }
      }
    },
    { capture: true }
  );

  // Add escape key to close
  document.addEventListener("keydown", (event) => {
    if (panel && panel.style.display !== "none" && event.key === "Escape") {
      panel.style.display = "none";
    }
  });
}

export function updateFloatingButtonSettings(showButton: boolean): void {
  const container = document.getElementById("clutch-extension-container");

  if (showButton && !container) {
    initializeFloatingButton(true);
  } else if (!showButton && container) {
    container.remove();
  }
}
