import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { getCurrentPage } from "$utils/common/pageUtils";
import { waitForElement } from "$utils/profileUtils";
import {
  createRankBadgeElement,
  getRankTier,
  formatElo,
} from "$utils/data/rankBadgeUtils";
import { createFaceitBadgeElement } from "$utils/data/faceitUtils";

import browserAPI from "$system/lib/browserAPI";

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
    let shouldUpdate = false;

    mutations.forEach((mutation) => {
      // Skip mutations on our own elements
      if (
        mutation.target instanceof Element &&
        mutation.target.hasAttribute("data-clutch-extension")
      ) {
        return;
      }

      // Skip if target is inside our elements
      if (
        mutation.target instanceof Element &&
        mutation.target.closest("[data-clutch-extension]")
      ) {
        return;
      }

      // Check if any added nodes are our elements
      if (mutation.addedNodes.length > 0) {
        const hasOwnElements = Array.from(mutation.addedNodes).some((node) => {
          if (node instanceof Element) {
            return (
              node.hasAttribute("data-clutch-extension") ||
              node.querySelector("[data-clutch-extension]")
            );
          }
          return false;
        });

        if (hasOwnElements) {
          return;
        }
      }

      // Check if any removed nodes are our elements
      if (mutation.removedNodes.length > 0) {
        const hasOwnElements = Array.from(mutation.removedNodes).some(
          (node) => {
            if (node instanceof Element) {
              return (
                node.hasAttribute("data-clutch-extension") ||
                node.querySelector("[data-clutch-extension]")
              );
            }
            return false;
          }
        );

        if (hasOwnElements) {
          return;
        }
      }

      // Ignore tooltip-related changes
      if (mutation.target instanceof Element) {
        const targetClasses = mutation.target.className;
        if (
          typeof targetClasses === "string" &&
          (targetClasses.includes("tooltip") ||
            targetClasses.includes("popover") ||
            targetClasses.includes("dropdown"))
        ) {
          return;
        }
      }

      // Check for relevant changes
      if (mutation.type === "childList") {
        const hasRelevantChanges = Array.from(mutation.addedNodes).some(
          (node) => {
            if (node instanceof Element) {
              return (
                node.matches(".party-player-card") ||
                node.querySelector(".party-player-card") ||
                node.matches(".party-list") ||
                node.querySelector(".party-list")
              );
            }
            return false;
          }
        );

        if (hasRelevantChanges) {
          shouldUpdate = true;
        }
      }
    });

    if (shouldUpdate) {
      updatePartyDisplay(settings);
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

  // Create the main wrapper with proper structure
  const wrapper = document.createElement("div");
  wrapper.className = "clutch-average-party-elo-wrapper";
  wrapper.setAttribute("data-clutch-extension", "average-party-elo");

  // Create the "Average ELO:" label
  const label = document.createElement("div");
  label.className = "clutch-average-elo-label";
  label.textContent = "Average ELO:";
  wrapper.appendChild(label);

  // Create container for the rank badge
  const rankBadgeContainer = document.createElement("div");
  rankBadgeContainer.className = "clutch-average-elo-rank-badge";
  rankBadgeContainer.setAttribute("tabindex", "0");

  // Create the actual rank badge (without the tooltip wrapper since we're creating our own structure)
  const rankTier = getRankTier(averageElo);
  const formattedElo = formatElo(averageElo);
  const capitalizedRankTier =
    rankTier.charAt(0).toUpperCase() + rankTier.slice(1);

  const rankBadge = document.createElement("div");
  rankBadge.className = `rank-badge ${rankTier} clutch-rank-badge`;
  rankBadge.style.cssText = `--size: 24px;`;
  rankBadge.setAttribute(
    "aria-label",
    `Rank: ${capitalizedRankTier}, Elo: ${formattedElo}`
  );

  // Create image element
  const img = document.createElement("img");
  img.alt = `Renown rank ${rankTier}`;
  img.width = 24;
  img.height = 24;
  img.style.color = "transparent";
  try {
    img.src = chrome.runtime.getURL(
      `assets/graphics/renown-ranks/${rankTier}.svg`
    );
  } catch (error) {
    console.warn("Error getting rank icon path:", error);
  }

  // Add elo text
  const span = document.createElement("span");
  span.className = "clutch-rank-badge-text";
  span.textContent = formattedElo;

  rankBadge.appendChild(img);
  rankBadge.appendChild(span);
  rankBadgeContainer.appendChild(rankBadge);
  wrapper.appendChild(rankBadgeContainer);

  // Create separator for Faceit badge
  const separator = document.createElement("div");
  separator.className = "clutch-faceit-separator";
  wrapper.appendChild(separator);

  partyNameDiv.appendChild(wrapper);

  return wrapper;
}

function removeAllFaceitBadges(): void {
  const faceitBadges = document.querySelectorAll(
    "[data-clutch-extension='faceit-badge-player']"
  );
  faceitBadges.forEach((badge) => badge.remove());

  const averageFaceitBadges = document.querySelectorAll(
    "[data-clutch-extension='faceit-badge-party-average']"
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
    const { playerNames, playerNameToCardMap, averageElo, playerCount } =
      await gatherPlayerData(settings.showFaceitEloOnPartyList);

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
    if (settings.showFaceitEloOnPartyList && playerNames.length > 0) {
      const faceitData = await getFaceitEloByNames(playerNames);
      await addPlayerFaceitBadges(playerNameToCardMap, faceitData);

      // Add average Faceit badge only if average party ELO is also enabled
      if (
        settings.showFaceitEloOnPartyList &&
        settings.showAveragePartyElo &&
        averageElo !== null
      ) {
        const existingWrapper = document.querySelector(
          "[data-clutch-extension='average-party-elo']"
        ) as HTMLElement;
        if (existingWrapper) {
          addAverageFaceitBadge(existingWrapper, faceitData);
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
    "[data-clutch-extension='faceit-badge-party-average']"
  );
  if (existingBadge) {
    existingBadge.remove();
  }

  const faceitBadge = createFaceitBadgeElement(averageFaceitElo, 24, true);
  faceitBadge.setAttribute(
    "data-clutch-extension",
    "faceit-badge-party-average"
  );

  wrapper.appendChild(faceitBadge);
}

function removeAveragePartyElo(disconnectObserver = true): void {
  removeAveragePartyEloDisplay();
  removeAllFaceitBadges();

  if (disconnectObserver && partyObserver) {
    partyObserver.disconnect();
    partyObserver = null;
  }
}

async function initializeAveragePartyElo(
  settings: UserSettings
): Promise<void> {
  if (!settings) {
    return;
  }

  const currentPage = getCurrentPage();

  if (currentPage.type !== "play") {
    return;
  }

  try {
    await setupPartyObserver(settings);
    await updatePartyDisplay(settings);
  } catch (error) {
    console.error("[AveragePartyElo] Error in initialization:", error);
  }
}

registerFeature({
  settingKey: "showAveragePartyElo",
  category: "mainPage",
  defaultValue: true,
  description: "Show average party ELO",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["play"]),
    ActivationHelpers.or(
      ActivationHelpers.whenEnabled("showAveragePartyElo"),
      ActivationHelpers.whenEnabled("showFaceitEloOnPartyList")
    )
  ),

  dependsOn: ["showFaceitEloOnPartyList"], // This feature also responds to Faceit ELO changes

  handler: initializeAveragePartyElo,
  cleanupHandler: () => removeAveragePartyElo(true),

  apiCalls: [
    {
      requestType: "fetchFaceitEloByNames",
      responseType: "faceit_elo_by_names_data",
    },
  ],
});
