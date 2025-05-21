import { type UserSettings } from "../lib/types";
import { getCurrentPage } from "../utils/pageUtils";
import { waitForElement } from "../utils/profileUtils";
import { createRankBadgeElement } from "../utils/rankBadgeUtils";
import { createFaceitBadgeElement } from "../utils/faceitUtils";
import browserAPI from "../lib/browserAPI";

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

  const playerCards = partyList.querySelectorAll(
    ".party-player-card:not(.empty)"
  );

  if (
    playerCards.length === 0 ||
    (playerCards.length <= 1 && !showSinglePlayers)
  ) {
    return {
      playerNames: [],
      playerNameToCardMap: {},
      averageElo: null,
      playerCount: 0,
    };
  }

  let totalElo = 0;
  let playerCount = 0;
  const playerNames: string[] = [];
  const playerNameToCardMap: Record<string, Element> = {};

  playerCards.forEach((card) => {
    const eloElement = card.querySelector(".rank-badge span");
    const playerNameElement = card.querySelector(".name");

    if (playerNameElement) {
      const playerName = playerNameElement.textContent?.trim();
      if (playerName) {
        playerNames.push(playerName);
        playerNameToCardMap[playerName] = card;
      }
    }

    if (eloElement) {
      const eloText = eloElement.textContent;
      if (eloText) {
        const elo = parseInt(eloText.replace(/,/g, ""));
        if (!isNaN(elo)) {
          totalElo += elo;
          playerCount++;
        }
      }
    }
  });

  const averageElo =
    playerCount > 1 ? Math.round(totalElo / playerCount) : null;

  return {
    playerNames,
    playerNameToCardMap,
    averageElo,
    playerCount,
  };
}

async function addAveragePartyEloDisplay(
  averageElo: number
): Promise<HTMLElement | null> {
  const partyList = await waitForElement("div.party-list");
  if (!partyList) return null;

  const partyName = partyList.querySelector(".party-name");
  if (!partyName) return null;

  const existing = partyName.querySelector(
    "[data-clutch-extension='average-party-elo']"
  );
  if (existing) existing.remove();

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display: flex; align-items: center; gap: 0.1rem; border-left: 2px solid var(--slate-600); padding-left: 0.5rem; margin-right: 0.75rem;";
  wrapper.setAttribute("data-clutch-extension", "average-party-elo");

  const avgRenownLabel = document.createElement("div");
  avgRenownLabel.textContent = "Average ELO:";
  avgRenownLabel.style.fontSize = "14px";
  wrapper.appendChild(avgRenownLabel);

  const rankBadge = createRankBadgeElement(averageElo, 24, true);
  rankBadge.style.marginLeft = "12px";
  wrapper.appendChild(rankBadge);

  partyName.appendChild(wrapper);
  return wrapper;
}

function removeAllFaceitBadges(): void {
  const playerFaceitBadges = document.querySelectorAll(
    "[data-clutch-extension='faceit-badge-player']"
  );
  playerFaceitBadges.forEach((badge) => badge.remove());

  const averageFaceitBadge = document.querySelector(
    "[data-clutch-extension='faceit-badge-party-average']"
  );
  if (averageFaceitBadge) {
    averageFaceitBadge.remove();
  }
}

function removeAveragePartyEloDisplay(): void {
  const existingBadge = document.querySelector(
    "[data-clutch-extension='average-party-elo']"
  );
  if (existingBadge) {
    existingBadge.remove();
  }
}

async function updatePartyDisplay(settings: UserSettings): Promise<void> {
  try {
    removeAllFaceitBadges();
    removeAveragePartyEloDisplay();

    const showSinglePlayers = settings.showFaceitEloOnPartyList;

    const { playerNames, playerNameToCardMap, averageElo, playerCount } =
      await gatherPlayerData(showSinglePlayers);

    if (playerNames.length === 0) {
      return;
    }

    let wrapper: HTMLElement | null = null;
    if (settings.showAveragePartyElo && averageElo && playerCount > 1) {
      wrapper = await addAveragePartyEloDisplay(averageElo);
    }

    if (settings.showFaceitEloOnPartyList) {
      const faceitData = await getFaceitEloByNames(playerNames);

      await addPlayerFaceitBadges(playerNameToCardMap, faceitData);

      if (
        wrapper &&
        settings.showAveragePartyElo &&
        averageElo &&
        playerCount > 1
      ) {
        addAverageFaceitBadge(wrapper, faceitData);
      }
    }
  } catch (error) {}
}

async function addPlayerFaceitBadges(
  playerNameToCardMap: Record<string, Element>,
  faceitData: Record<string, number | null>
): Promise<void> {
  Object.entries(faceitData).forEach(([playerName, elo]) => {
    if (elo !== null && playerNameToCardMap[playerName]) {
      const playerCard = playerNameToCardMap[playerName];
      const eloContainer = playerCard.querySelector(".elo");

      if (eloContainer) {
        const existingBadge = eloContainer.querySelector(
          "[data-clutch-extension='faceit-badge-player']"
        );
        if (existingBadge) {
          existingBadge.remove();
        }

        const faceitBadge = createFaceitBadgeElement(
          elo,
          24,
          true,
          "",
          "faceit-badge-player"
        );
        faceitBadge.style.marginTop = "4px";

        eloContainer.appendChild(faceitBadge);
      }
    }
  });
}

function addAverageFaceitBadge(
  wrapper: HTMLElement,
  faceitData: Record<string, number | null>
): void {
  let totalFaceitElo = 0;
  let faceitPlayerCount = 0;

  Object.values(faceitData).forEach((elo) => {
    if (elo !== null) {
      totalFaceitElo += elo;
      faceitPlayerCount++;
    }
  });

  if (faceitPlayerCount > 0) {
    const averageFaceitElo = Math.round(totalFaceitElo / faceitPlayerCount);

    const separator = document.createElement("div");
    separator.style.width = "8px";
    wrapper.appendChild(separator);

    const faceitBadge = createFaceitBadgeElement(
      averageFaceitElo,
      24,
      true,
      "",
      "faceit-badge-party-average"
    );
    wrapper.appendChild(faceitBadge);
  }
}

export function removeAveragePartyElo(disconnectObserver = true): void {
  removeAveragePartyEloDisplay();
  removeAllFaceitBadges();

  if (disconnectObserver && partyObserver) {
    partyObserver.disconnect();
    partyObserver = null;
  }
}

export function initializeAveragePartyElo(settings: UserSettings): void {
  if (!settings) return;

  if (getCurrentPage().type !== "play") {
    return;
  }

  removeAveragePartyElo(false);

  if (!settings.showAveragePartyElo && !settings.showFaceitEloOnPartyList) {
    return;
  }

  updatePartyDisplay(settings);
  setupPartyObserver(settings);
}
