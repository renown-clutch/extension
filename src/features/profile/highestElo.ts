import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import {
  getPlayerIdFromUrl,
  waitForElement,
  isProfilePage,
} from "$utils/profileUtils";
import { createRankBadgeElement } from "$utils/data/rankBadgeUtils";
import { getCurrentPage, is404Page } from "$utils/common/pageUtils";
import browserAPI from "$system/lib/browserAPI";

async function fetchHighestElo(steamId: string): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      browserAPI.runtime.sendMessage(
        { type: "fetchProfileData", steamId },
        (response) => {
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
  wrapper.className = "clutch-highest-elo-wrapper clutch-animate-fade-in-slide";
  wrapper.setAttribute("data-clutch-extension", "highest-elo-element");

  const peakEloLabel = document.createElement("div");
  peakEloLabel.className = "clutch-highest-elo-label";
  peakEloLabel.textContent = "Peak ELO";

  wrapper.appendChild(peakEloLabel);
  wrapper.appendChild(peakEloBadge);

  rankBadgeElement.appendChild(wrapper);
}

function cleanupHighestElo() {
  const elements = document.querySelectorAll(
    '[data-clutch-extension="highest-elo-element"]'
  );
  elements.forEach((element) => element.remove());
}

async function initializeHighestElo(userSettings: UserSettings): Promise<void> {
  if (!isProfilePage()) {
    return;
  }

  if (is404Page()) {
    return;
  }

  const existingElement = document.querySelector(
    '[data-clutch-extension="highest-elo-element"]'
  );

  // If feature is disabled, always clean up
  if (!userSettings.showHighestElo) {
    cleanupHighestElo();
    return;
  }

  // If feature is enabled but element already exists, don't re-render
  if (existingElement) {
    return;
  }

  const playerId = getPlayerIdFromUrl();
  if (!playerId) {
    console.warn("Could not determine player ID from URL");
    return;
  }

  await displayHighestElo(playerId);
}

registerFeature({
  settingKey: "showHighestElo",
  category: "profile",
  defaultValue: false,
  description: "Show player's highest ELO in their profile",
  handler: initializeHighestElo,
  cleanupHandler: cleanupHighestElo,
  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["profile"]),
    ActivationHelpers.whenEnabled("showHighestElo")
  ),
  apiCalls: [
    { requestType: "fetchProfileData", responseType: "profileDataResponse" },
  ],
});
