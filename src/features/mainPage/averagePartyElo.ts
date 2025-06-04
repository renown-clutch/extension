import { registerFeature, ActivationHelpers } from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { getCurrentPage } from "$utils/common/pageUtils";
import { waitForElement } from "$utils/profileUtils";
import { createRankBadgeElement } from "$utils/data/rankBadgeUtils";
import { createFaceitBadgeElement } from "$utils/data/faceitUtils";
import {
  waitForHydrationComplete,
  resetHydrationDetection,
  cleanupHydrationDetection,
  createHydrationAwareMutationCallback,
} from "$utils/hydrationUtils";
import browserAPI from "$system/lib/browserAPI";
import "./averagePartyElo.css";

let partyObserver: MutationObserver | null = null;

async function getFaceitEloByNames(
  playerNames: string[]
): Promise<Record<string, number | null>> {
  try {
    return new Promise((resolve, reject) => {
      browserAPI.runtime.sendMessage(
        {
          type: "fetchFaceitEloByNames",
          playerNames: playerNames,
        },
        (response) => {
          if (response && response.success) {
            resolve(response.data);
          } else {
            resolve({});
          }
        }
      );
    });
  } catch (error) {
    return {};
  }
}

async function setupPartyObserver(settings: UserSettings): Promise<void> {
  await waitForElement(".main-layout");
  const partyList = await waitForElement("div.party-list");
  if (!partyList) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 100));

  if (partyObserver) {
    partyObserver.disconnect();
  }

  partyObserver = new MutationObserver((mutations) => {
    const relevantMutation = mutations.some((mutation) => {
      const target = mutation.target as HTMLElement;

      if (target.hasAttribute && target.hasAttribute("data-clutch-extension")) {
        return false;
      }

      if (
        target.querySelector &&
        target.querySelector("[data-clutch-extension]")
      ) {
        return false;
      }

      if (target.closest && target.closest("[data-clutch-extension]")) {
        return false;
      }

      if (mutation.addedNodes.length > 0) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof Element)) continue;

          if ((node as Element).hasAttribute("data-clutch-extension")) {
            return false;
          }

          if ((node as Element).querySelector("[data-clutch-extension]")) {
            return false;
          }
        }
      }

      if (mutation.removedNodes.length > 0) {
        for (const node of Array.from(mutation.removedNodes)) {
          if (!(node instanceof Element)) continue;

          if ((node as Element).hasAttribute("data-clutch-extension")) {
            return false;
          }

          if ((node as Element).querySelector("[data-clutch-extension]")) {
            return false;
          }
        }
      }

      if (
        target.classList?.contains("elo") &&
        target.querySelector("[data-clutch-extension='faceit-badge-player']")
      ) {
        return false;
      }

      if (
        target.classList?.contains("party-player-card") &&
        target.querySelector("[data-clutch-extension='faceit-badge-player']")
      ) {
        return false;
      }

      if (
        target.classList?.contains("party-name") &&
        target.querySelector("[data-clutch-extension='average-party-elo']")
      ) {
        return false;
      }

      if (
        target.classList?.contains("tooltip-wrapper") ||
        target.closest?.(".tooltip-wrapper")
      ) {
        return false;
      }

      const isPartyElement =
        target.classList?.contains("party-members-grid") ||
        target.classList?.contains("party-player-card") ||
        target.classList?.contains("party-list") ||
        (target.parentElement &&
          (target.parentElement.classList?.contains("party-members-grid") ||
            target.parentElement.classList?.contains("party-player-card") ||
            target.parentElement.classList?.contains("party-list")));

      const isChildListChange = mutation.type === "childList";
      const isAttributeChange = mutation.type === "attributes";
      const isCharacterDataChange = mutation.type === "characterData";

      const hasAddedOrRemovedNodes =
        mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;

      // Special check for hydration-related changes
      const isLikelyHydrationChange =
        mutation.addedNodes.length > 0 &&
        Array.from(mutation.addedNodes).some(
          (node) =>
            node instanceof Element &&
            node.classList?.contains("party-player-card")
        );

      if (isLikelyHydrationChange) {
        // Reset hydration detection so we wait again
        resetHydrationDetection();
      }

      return (
        (isPartyElement &&
          (isChildListChange || isAttributeChange || isCharacterDataChange)) ||
        hasAddedOrRemovedNodes
      );
    });

    if (relevantMutation) {
      setTimeout(() => {
        updatePartyDisplay(settings);
      }, 0);
    }
  });

  partyObserver.observe(partyList, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  const parentContainer = partyList.parentElement;
  if (parentContainer) {
    partyObserver.observe(parentContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }
}

async function gatherPlayerData(showSinglePlayers: boolean = false): Promise<{
  playerNames: string[];
  playerNameToCardMap: Record<string, Element>;
  averageElo: number | null;
  playerCount: number;
}> {
  const partyList = await waitForElement("div.party-list");
  if (!partyList) {
    return {
      playerNames: [],
      playerNameToCardMap: {},
      averageElo: null,
      playerCount: 0,
    };
  }

  const playerCards = partyList.querySelectorAll(".party-player-card");
  const playerNames: string[] = [];
  const playerNameToCardMap: Record<string, Element> = {};
  let totalElo = 0;
  let validPlayerCount = 0;

  for (const card of playerCards) {
    const nameElement = card.querySelector(".name");
    const eloElement = card.querySelector(".elo");

    if (nameElement && eloElement) {
      const playerName = nameElement.textContent?.trim();
      const eloText = eloElement.textContent?.trim();

      if (playerName && eloText) {
        const eloNumber = parseInt(eloText.replace(/[^\d]/g, ""), 10);

        if (!isNaN(eloNumber)) {
          playerNames.push(playerName);
          playerNameToCardMap[playerName] = card;
          totalElo += eloNumber;
          validPlayerCount++;
        }
      }
    }
  }

  const averageElo =
    validPlayerCount > 0 ? Math.round(totalElo / validPlayerCount) : null;

  // Only include players if we have more than 1 or showSinglePlayers is true
  if (validPlayerCount <= 1 && !showSinglePlayers) {
    return {
      playerNames: [],
      playerNameToCardMap: {},
      averageElo: null,
      playerCount: 0,
    };
  }

  return {
    playerNames,
    playerNameToCardMap,
    averageElo,
    playerCount: validPlayerCount,
  };
}

async function addAveragePartyEloDisplay(
  averageElo: number
): Promise<HTMLElement | null> {
  const partyNameDiv = await waitForElement("div.party-name");
  if (!partyNameDiv) {
    return null;
  }

  // Check if we already have an average ELO display
  const existingDisplay = partyNameDiv.querySelector(
    "[data-clutch-extension='average-party-elo']"
  );
  if (existingDisplay) {
    return existingDisplay as HTMLElement;
  }

  const badgeElement = createRankBadgeElement(averageElo, 24, true);
  badgeElement.setAttribute("data-clutch-extension", "average-party-elo");

  partyNameDiv.appendChild(badgeElement);

  return badgeElement;
}

function removeAllFaceitBadges(): void {
  const faceitBadges = document.querySelectorAll(
    "[data-clutch-extension='faceit-badge-player']"
  );
  faceitBadges.forEach((badge) => badge.remove());

  const averageFaceitBadges = document.querySelectorAll(
    "[data-clutch-extension='faceit-badge-average']"
  );
  averageFaceitBadges.forEach((badge) => badge.remove());
}

function removeAveragePartyEloDisplay(): void {
  const averageEloDisplays = document.querySelectorAll(
    "[data-clutch-extension='average-party-elo']"
  );
  averageEloDisplays.forEach((display) => display.remove());
}

async function updatePartyDisplay(settings: UserSettings): Promise<void> {
  try {
    await waitForHydrationComplete();

    const { playerNames, playerNameToCardMap, averageElo, playerCount } =
      await gatherPlayerData(settings.showFaceitRanksForSinglePlayer);

    // Remove existing displays first
    removeAveragePartyEloDisplay();
    removeAllFaceitBadges();

    if (playerCount === 0) {
      return;
    }

    // Add average party ELO display
    if (settings.showAveragePartyElo && averageElo !== null) {
      await addAveragePartyEloDisplay(averageElo);
    }

    // Add individual player Faceit badges
    if (settings.showFaceitRanks && playerNames.length > 0) {
      const faceitData = await getFaceitEloByNames(playerNames);
      await addPlayerFaceitBadges(playerNameToCardMap, faceitData);

      // Add average Faceit badge if enabled
      if (settings.showAverageFaceitRank) {
        const wrapper = await addAveragePartyEloDisplay(averageElo || 0);
        if (wrapper) {
          addAverageFaceitBadge(wrapper, faceitData);
        }
      }
    }
  } catch (error) {
    console.error("[AveragePartyElo] Error in updatePartyDisplay:", error);
  }
}

async function addPlayerFaceitBadges(
  playerNameToCardMap: Record<string, Element>,
  faceitData: Record<string, number | null>
): Promise<void> {
  for (const [playerName, card] of Object.entries(playerNameToCardMap)) {
    const faceitElo = faceitData[playerName];
    if (faceitElo && faceitElo > 0) {
      const eloDiv = card.querySelector(".elo");
      if (eloDiv) {
        // Remove existing Faceit badge if any
        const existingBadge = card.querySelector(
          "[data-clutch-extension='faceit-badge-player']"
        );
        if (existingBadge) {
          existingBadge.remove();
        }

        const faceitBadge = createFaceitBadgeElement(faceitElo, 20, true);
        faceitBadge.setAttribute(
          "data-clutch-extension",
          "faceit-badge-player"
        );

        // Insert after the ELO div
        eloDiv.parentNode?.insertBefore(faceitBadge, eloDiv.nextSibling);
      }
    }
  }
}

function addAverageFaceitBadge(
  wrapper: HTMLElement,
  faceitData: Record<string, number | null>
): void {
  const faceitValues = Object.values(faceitData).filter(
    (elo) => elo !== null && elo > 0
  ) as number[];

  if (faceitValues.length === 0) {
    return;
  }

  const averageFaceitElo = Math.round(
    faceitValues.reduce((sum, elo) => sum + elo, 0) / faceitValues.length
  );

  // Remove existing average Faceit badge
  const existingBadge = wrapper.querySelector(
    "[data-clutch-extension='faceit-badge-average']"
  );
  if (existingBadge) {
    existingBadge.remove();
  }

  const faceitBadge = createFaceitBadgeElement(averageFaceitElo, 20, true);
  faceitBadge.setAttribute("data-clutch-extension", "faceit-badge-average");

  wrapper.appendChild(faceitBadge);
}

function removeAveragePartyElo(disconnectObserver = true): void {
  removeAveragePartyEloDisplay();
  removeAllFaceitBadges();

  if (disconnectObserver && partyObserver) {
    partyObserver.disconnect();
    partyObserver = null;
  }

  cleanupHydrationDetection();
}

async function initializeAveragePartyElo(
  settings: UserSettings
): Promise<void> {
  if (!settings) {
    return;
  }

  const currentPage = getCurrentPage();

  if (currentPage.type !== "play") {
    removeAveragePartyElo();
    return;
  }

  if (!settings.showAveragePartyElo && !settings.showFaceitRanks) {
    removeAveragePartyElo();
    return;
  }

  try {
    await setupPartyObserver(settings);
    await updatePartyDisplay(settings);
  } catch (error) {
    console.error("[AveragePartyElo] Error in initialization:", error);
  }
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "showAveragePartyElo",
  category: "mainPage",
  defaultValue: true,
  description: "Show average party ELO",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["play"]),
    ActivationHelpers.or(
      ActivationHelpers.whenEnabled("showAveragePartyElo"),
      ActivationHelpers.whenEnabled("showFaceitRanks")
    )
  ),

  handler: initializeAveragePartyElo,

  apiCalls: [
    {
      requestType: "fetchFaceitEloByNames",
      responseType: "faceit_elo_by_names_data",
    },
  ],
});
