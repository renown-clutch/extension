import { getPlayerIdFromUrl, waitForElement } from "../utils/profileUtils";
import { createRankBadgeElement } from "../utils/rankBadgeUtils";

let isEnabled = false;
let highestEloElement: HTMLDivElement | null = null;

/**
 * Fetch the highest ELO for a player
 */
async function fetchHighestElo(steamId: string): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: "fetchProfileData", steamId },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "Highest ELO data fetch failed:",
              chrome.runtime.lastError.message
            );
            resolve(null);
            return;
          }

          if (response && response.success && response.data) {
            resolve(response.data.highest_elo || null);
          } else {
            console.warn("No highest ELO data found:", response);
            resolve(null);
          }
        }
      );
    } catch (error) {
      console.warn("Error fetching highest ELO data:", error);
      resolve(null);
    }
  });
}

/**
 * Create and display the highest ELO element
 */
async function displayHighestElo(playerId: string) {
  if (!isEnabled) return;

  // Remove any existing element
  removeHighestEloElement();

  const container = await waitForElement(".profile-banner .container");

  // Find the rank-badge element
  const rankBadgeElement = await waitForElement(".profile-banner .name-elo");
  console.log("rankBadgeElement", rankBadgeElement);
  if (!rankBadgeElement) {
    console.log("No rank badge element found");
    return;
  }

  // Fetch highest ELO data
  const highestElo = await fetchHighestElo(playerId);
  if (!highestElo) {
    console.log("No highest ELO data available for this player");
    return;
  }

  // Create the highest ELO element
  const peakEloBadge = createRankBadgeElement(highestElo, 20, true, "");

  // Create container div with styled according to screenshot
  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display: flex; align-items: center; gap: 1rem; border-left: solid var(--slate-600); padding-left: 1rem;";
  wrapper.setAttribute("data-clutch-extension", "highest-elo-element");

  // Create "Peak ELO" label
  const peakEloLabel = document.createElement("div");
  peakEloLabel.textContent = "Peak ELO";
  peakEloLabel.style.fontSize = "14px";

  // Add both elements to the wrapper
  wrapper.appendChild(peakEloLabel);
  wrapper.appendChild(peakEloBadge);

  // Store reference to the element for later removal
  highestEloElement = wrapper;

  // Insert the element after the rank badge
  rankBadgeElement.appendChild(wrapper);
}

/**
 * Remove the highest ELO element from the DOM
 */
function removeHighestEloElement() {
  console.log("Removing highest ELO element");
  const elements = document.querySelectorAll(
    '[data-clutch-extension="highest-elo-element"]'
  );
  elements.forEach((element) => element.remove());
  highestEloElement = null;
}

/**
 * Initialize the highest ELO feature
 */
export function initialize(enabled: boolean): void {
  isEnabled = enabled;

  if (!isEnabled) {
    removeHighestEloElement();
    return;
  }

  // Get current player ID
  const playerId = getPlayerIdFromUrl();
  if (!playerId) {
    console.warn("Could not determine player ID from URL");
    return;
  }

  displayHighestElo(playerId);
}

export function updateSettings(enabled: boolean): void {
  if (isEnabled === enabled) return;

  initialize(enabled);
}
