import {
  getPlayerIdFromUrl,
  isProfilePage,
  waitForElement,
} from "../utils/profileUtils";

let isEnabled = false;
let highestEloElement: HTMLDivElement | null = null;
let observer: MutationObserver | null = null;

/**
 * Fetch the highest ELO for a player
 */
async function fetchHighestElo(steamId: string): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: "fetchProfileData", steamId },
        (response) => {
          // Check for runtime error
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

  // Find the rank-badge element
  const rankBadgeElement = await waitForElement(
    ".profile-banner .name-elo .rank-badge"
  );
  if (!rankBadgeElement) {
    console.warn("Could not find rank badge element to append highest ELO");
    return;
  }

  // Fetch highest ELO data
  const highestElo = await fetchHighestElo(playerId);
  if (!highestElo) {
    console.log("No highest ELO data available for this player");
    return;
  }

  // Create the highest ELO element
  highestEloElement = document.createElement("div");
  highestEloElement.setAttribute(
    "data-clutch-extension",
    "highest-elo-element"
  );
  highestEloElement.className = "highest-elo";
  highestEloElement.style.display = "flex";
  highestEloElement.style.alignItems = "center";
  highestEloElement.style.marginLeft = "8px";
  highestEloElement.style.fontSize = "12px";
  highestEloElement.style.color = "#ffc107"; // Gold color for highest ELO
  highestEloElement.style.fontWeight = "bold";

  // Format the highest ELO number with commas
  const formattedElo = highestElo.toLocaleString();
  highestEloElement.innerHTML = `<span title="Highest ELO: ${formattedElo}">Peak: ${formattedElo}</span>`;

  // Insert the element after the rank badge
  rankBadgeElement.insertAdjacentElement("afterend", highestEloElement);
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

  // Disconnect observer if it exists
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

/**
 * Initialize the highest ELO feature
 */
export function initialize(enabled: boolean): void {
  isEnabled = enabled;

  // Clean up previous elements
  removeHighestEloElement();

  // If not enabled or not on a profile page, we're done
  if (!isEnabled || !isProfilePage()) {
    return;
  }

  // Get current player ID
  const playerId = getPlayerIdFromUrl();
  if (!playerId) {
    console.warn("Could not determine player ID from URL");
    return;
  }

  // Display highest ELO
  displayHighestElo(playerId);

  // Set up observer to watch for changes to the profile banner
  const profileBanner = document.querySelector(".profile-banner");
  if (profileBanner) {
    observer = new MutationObserver((mutations) => {
      // Check if our element was removed
      if (
        !document.querySelector('[data-clutch-extension="highest-elo-element"]')
      ) {
        displayHighestElo(playerId);
      }
    });

    observer.observe(profileBanner, {
      childList: true,
      subtree: true,
    });
  }
}

/**
 * Update settings for the highest ELO feature
 */
export function updateSettings(enabled: boolean): void {
  // If setting didn't change, do nothing
  if (isEnabled === enabled) return;

  // Update state and reinitialize
  initialize(enabled);
}
