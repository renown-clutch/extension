import { getPlayerIdFromUrl, waitForElement } from "../utils/profileUtils";
import { createRankBadgeElement } from "../utils/rankBadgeUtils";
import { isProfilePage } from "../utils/profileUtils";

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
  removeHighestEloElement();

  await waitForElement(".profile-banner .container");

  // Find the rank-badge element
  const rankBadgeElement = await waitForElement(".profile-banner .name-elo");

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

  const peakEloBadge = createRankBadgeElement(highestElo, 20, true, "");

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display: flex; align-items: center; gap: 1rem; border-left: solid var(--slate-600); padding-left: 1rem;";
  wrapper.setAttribute("data-clutch-extension", "highest-elo-element");

  const peakEloLabel = document.createElement("div");
  peakEloLabel.textContent = "Peak ELO";
  peakEloLabel.style.fontSize = "14px";

  wrapper.appendChild(peakEloLabel);
  wrapper.appendChild(peakEloBadge);

  highestEloElement = wrapper;

  rankBadgeElement.appendChild(wrapper);
}

/**
 * Remove the highest ELO element from the DOM
 */
function removeHighestEloElement() {
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
  if (!enabled || !isProfilePage()) {
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
  initialize(enabled);
}
