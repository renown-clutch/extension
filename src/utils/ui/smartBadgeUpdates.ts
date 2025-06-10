import {
  createRankBadgeElement,
  getRankTier,
  formatElo,
} from "$utils/data/rankBadgeUtils";
import {
  createFaceitBadgeElement,
  getFaceitLevel,
} from "$utils/data/faceitUtils";

/**
 * Smart update for average party ELO display
 */
export async function smartUpdateAveragePartyElo(
  averageElo: number,
  skipWaiting: boolean = false
): Promise<HTMLElement | null> {
  let partyNameDiv: Element | null;

  if (skipWaiting) {
    partyNameDiv = document.querySelector("div.party-name");
  } else {
    const { waitForElement } = await import("$utils/profileUtils");
    partyNameDiv = await waitForElement("div.party-name");
  }

  if (!partyNameDiv) {
    return null;
  }

  const existingDisplay = partyNameDiv.querySelector(
    "[data-clutch-extension='average-party-elo']"
  ) as HTMLElement;

  if (existingDisplay) {
    return (
      updateExistingRankBadge(existingDisplay, averageElo) ||
      (await createNewAverageEloDisplay(partyNameDiv, averageElo))
    );
  }

  return await createNewAverageEloDisplay(partyNameDiv, averageElo);
}

/**
 * Smart update for individual player Faceit badges
 */
export function smartUpdatePlayerFaceitBadges(
  playerNameToCardMap: Record<string, Element>,
  faceitData: Record<string, number | null>
): void {
  const existingBadges = mapExistingPlayerBadges(playerNameToCardMap);

  Object.entries(playerNameToCardMap).forEach(([playerName, card]) => {
    const faceitElo = faceitData[playerName];
    const existingBadge = existingBadges.get(playerName);

    if (faceitElo && faceitElo > 0) {
      if (existingBadge) {
        updateExistingFaceitBadge(existingBadge, faceitElo) ||
          recreateFaceitBadge(card, existingBadge, faceitElo, 20);
      } else {
        createNewPlayerFaceitBadge(card, faceitElo, 20);
      }
    } else if (existingBadge) {
      existingBadge.remove();
    }
  });
}

/**
 * Smart update for average Faceit badge
 */
export function smartUpdateAverageFaceitBadge(
  wrapper: HTMLElement,
  faceitData: Record<string, number | null>
): void {
  const faceitValues = Object.values(faceitData).filter(
    (elo) => elo !== null && elo > 0
  ) as number[];

  const existingBadge = wrapper.querySelector(
    "[data-clutch-extension='faceit-badge-party-average']"
  );

  if (faceitValues.length === 0) {
    existingBadge?.remove();
    return;
  }

  const averageFaceitElo = Math.round(
    faceitValues.reduce((sum, elo) => sum + elo, 0) / faceitValues.length
  );

  if (existingBadge) {
    updateExistingFaceitBadge(existingBadge, averageFaceitElo) ||
      recreateAverageFaceitBadge(wrapper, existingBadge, averageFaceitElo);
  } else {
    createNewAverageFaceitBadge(wrapper, averageFaceitElo);
  }
}

// Private helper functions

function updateExistingRankBadge(
  display: HTMLElement,
  averageElo: number
): HTMLElement | null {
  const rankBadge = display.querySelector(".clutch-rank-badge");
  const rankBadgeText = display.querySelector(".clutch-rank-badge-text");
  const rankBadgeImg = display.querySelector("img");

  if (!rankBadge || !rankBadgeText || !rankBadgeImg) return null;

  try {
    const rankTier = getRankTier(averageElo);
    const formattedElo = formatElo(averageElo);
    const capitalizedRankTier =
      rankTier.charAt(0).toUpperCase() + rankTier.slice(1);

    rankBadge.className = `rank-badge ${rankTier} clutch-rank-badge`;
    rankBadge.setAttribute(
      "aria-label",
      `Rank: ${capitalizedRankTier}, Elo: ${formattedElo}`
    );
    rankBadgeText.textContent = formattedElo;
    (rankBadgeImg as HTMLImageElement).alt = `Renown rank ${rankTier}`;
    (rankBadgeImg as HTMLImageElement).src = chrome.runtime.getURL(
      `assets/graphics/renown-ranks/${rankTier}.svg`
    );

    return display;
  } catch (error) {
    console.warn("Error updating rank badge:", error);
    return null;
  }
}

function updateExistingFaceitBadge(badge: Element, faceitElo: number): boolean {
  const badgeImg = badge.querySelector(".clutch-faceit-image");
  const badgeText = badge.querySelector(".clutch-faceit-badge-text");

  if (!badgeImg || !badgeText) return false;

  try {
    const faceitLevel = getFaceitLevel(faceitElo);
    (badgeImg as HTMLImageElement).src = chrome.runtime.getURL(
      `assets/graphics/faceit-levels/lvl${faceitLevel}.svg`
    );
    (badgeImg as HTMLImageElement).alt = `Faceit level ${faceitLevel}`;
    badgeText.textContent = faceitElo.toString();

    const faceitBadge = badge.querySelector(".faceit-badge");
    faceitBadge?.setAttribute(
      "aria-label",
      `Faceit Level: ${faceitLevel}, Elo: ${faceitElo}`
    );

    return true;
  } catch (error) {
    console.warn("Error updating Faceit badge:", error);
    return false;
  }
}

function mapExistingPlayerBadges(
  playerNameToCardMap: Record<string, Element>
): Map<string, Element> {
  const existingBadges = new Map<string, Element>();

  Object.entries(playerNameToCardMap).forEach(([playerName, card]) => {
    const existingBadge = card.querySelector(
      "[data-clutch-extension='faceit-badge-player']"
    );
    if (existingBadge) {
      existingBadges.set(playerName, existingBadge);
    }
  });

  return existingBadges;
}

function recreateFaceitBadge(
  card: Element,
  existingBadge: Element,
  faceitElo: number,
  size: number
): void {
  existingBadge.remove();
  createNewPlayerFaceitBadge(card, faceitElo, size);
}

function createNewPlayerFaceitBadge(
  card: Element,
  faceitElo: number,
  size: number
): void {
  const eloDiv = card.querySelector(".elo");
  if (eloDiv) {
    const faceitBadge = createFaceitBadgeElement(faceitElo, size, true);
    faceitBadge.setAttribute("data-clutch-extension", "faceit-badge-player");
    eloDiv.parentNode?.insertBefore(faceitBadge, eloDiv.nextSibling);
  }
}

function recreateAverageFaceitBadge(
  wrapper: HTMLElement,
  existingBadge: Element,
  averageFaceitElo: number
): void {
  existingBadge.remove();
  createNewAverageFaceitBadge(wrapper, averageFaceitElo);
}

function createNewAverageFaceitBadge(
  wrapper: HTMLElement,
  averageFaceitElo: number
): void {
  const faceitBadge = createFaceitBadgeElement(averageFaceitElo, 24, true);
  faceitBadge.setAttribute(
    "data-clutch-extension",
    "faceit-badge-party-average"
  );
  wrapper.appendChild(faceitBadge);
}

async function createNewAverageEloDisplay(
  partyNameDiv: Element,
  averageElo: number
): Promise<HTMLElement | null> {
  const wrapper = document.createElement("div");
  wrapper.className = "clutch-average-party-elo-wrapper";
  wrapper.setAttribute("data-clutch-extension", "average-party-elo");

  const label = document.createElement("div");
  label.className = "clutch-average-elo-label";
  label.textContent = "Average ELO:";
  wrapper.appendChild(label);

  const rankBadgeContainer = document.createElement("div");
  rankBadgeContainer.className = "clutch-average-elo-rank-badge";
  rankBadgeContainer.setAttribute("tabindex", "0");

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

  const span = document.createElement("span");
  span.className = "clutch-rank-badge-text";
  span.textContent = formattedElo;

  rankBadge.appendChild(img);
  rankBadge.appendChild(span);
  rankBadgeContainer.appendChild(rankBadge);
  wrapper.appendChild(rankBadgeContainer);

  const separator = document.createElement("div");
  separator.className = "clutch-faceit-separator";
  wrapper.appendChild(separator);

  partyNameDiv.appendChild(wrapper);
  return wrapper;
}
