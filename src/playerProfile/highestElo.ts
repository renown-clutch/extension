import { getPlayerIdFromUrl, waitForElement } from "../utils/profileUtils";
import { createRankBadgeElement } from "../utils/rankBadgeUtils";
import { isProfilePage } from "../utils/profileUtils";
import { is404Page } from "../utils/pageUtils";
import type { UserSettings } from "$lib/types";

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

async function displayHighestElo(playerId: string) {
  const existingHighestEloElement = document.querySelector(
    '[data-clutch-extension="highest-elo-element"]'
  );
  if (existingHighestEloElement) {
    return;
  }

  await waitForElement(".profile-banner .container");

  const rankBadgeElement = await waitForElement(".profile-banner .name-elo");

  if (!rankBadgeElement) {
    return;
  }

  const highestElo = await fetchHighestElo(playerId);
  if (!highestElo) {
    return;
  }

  const peakEloBadge = createRankBadgeElement(highestElo, 20, true, "");

  const wrapper = document.createElement("div");
  wrapper.className = "clutch-highest-elo-wrapper";
  wrapper.setAttribute("data-clutch-extension", "highest-elo-element");

  const peakEloLabel = document.createElement("div");
  peakEloLabel.className = "clutch-highest-elo-label";
  peakEloLabel.textContent = "Peak ELO";

  wrapper.appendChild(peakEloLabel);
  wrapper.appendChild(peakEloBadge);

  rankBadgeElement.appendChild(wrapper);
}

function removeHighestEloElement() {
  const elements = document.querySelectorAll(
    '[data-clutch-extension="highest-elo-element"]'
  );
  elements.forEach((element) => element.remove());

  // Remove injected CSS when cleaning up
  const styleElement = document.getElementById("clutch-highest-elo-styles");
  if (styleElement) {
    styleElement.remove();
  }
}

export function initializeHighestElo(userSettings: UserSettings): void {
  if (!isProfilePage()) {
    return;
  }
  if (!userSettings.showHighestElo) {
    removeHighestEloElement();
    return;
  }

  if (is404Page()) {
    return;
  }

  const playerId = getPlayerIdFromUrl();
  if (!playerId) {
    console.warn("Could not determine player ID from URL");
    return;
  }

  displayHighestElo(playerId);
}
