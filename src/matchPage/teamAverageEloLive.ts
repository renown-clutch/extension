import { createSafeObserver } from "../utils/observerUtils";
import { createRankBadgeElement } from "../utils/rankBadgeUtils";
import { createFaceitBadgeElement } from "../utils/faceitUtils";
import { waitForElement } from "../utils/profileUtils";
import type { UserSettings } from "$lib/types";
import { isLiveMatch } from "../utils/pageUtils";

interface PlayerData {
  element: HTMLElement;
  steamId: string;
}

interface FaceitData {
  [steamId: string]: {
    elo?: number;
    url?: string;
  };
}

export async function initializeTeamAverageEloLive(
  userSettings: UserSettings,
  players: PlayerData[],
  faceitData: FaceitData
) {
  if (!userSettings.showTeamAverageElo) {
    cleanupBadges();
    return;
  }

  const team1Container = document.querySelector(".team1-players");
  const team2Container = document.querySelector(".team2-players");

  if (!team1Container || !team2Container) {
    return;
  }

  processTeamContainers(
    team1Container as HTMLElement,
    team2Container as HTMLElement,
    faceitData
  );
}

function cleanupBadges() {
  const elements = document.querySelectorAll(
    '[data-clutch-extension="team-average-elo-match-header"]'
  );
  elements.forEach((element) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
}

function processTeamContainers(
  team1Container: HTMLElement,
  team2Container: HTMLElement,
  faceitData: FaceitData
) {
  const team1Elo = calculateTeamAverageElo(team1Container);
  const team2Elo = calculateTeamAverageElo(team2Container);

  const team1FaceitElo = calculateTeamAverageFaceitElo(
    team1Container,
    faceitData
  );
  const team2FaceitElo = calculateTeamAverageFaceitElo(
    team2Container,
    faceitData
  );

  const matchScore = document.querySelector(".match-score");
  if (!matchScore) {
    return;
  }

  const team1 = matchScore.querySelector(".team1");
  const team2 = matchScore.querySelector(".team2");

  if (!team1 || !team2) {
    return;
  }

  updateTeamHeader(team1 as HTMLElement, team1Elo, team1FaceitElo, "first");
  updateTeamHeader(team2 as HTMLElement, team2Elo, team2FaceitElo, "last");
}

function calculateTeamAverageElo(container: HTMLElement): number | null {
  const rankBadges = container.querySelectorAll(".rank-badge");
  let eloValues: number[] = [];

  if (rankBadges.length > 0) {
    rankBadges.forEach((badge) => {
      const ariaLabel = badge.getAttribute("aria-label");
      if (ariaLabel) {
        const match = ariaLabel.match(/Elo: ([0-9,]+)/);
        if (match && match[1]) {
          const eloValue = parseInt(match[1].replace(/,/g, ""), 10);
          if (!isNaN(eloValue)) {
            eloValues.push(eloValue);
          }
        }
      }

      if (eloValues.length === 0) {
        const eloSpan = badge.querySelector("span");
        if (eloSpan && eloSpan.textContent) {
          const eloValue = parseInt(eloSpan.textContent.replace(/,/g, ""), 10);
          if (!isNaN(eloValue)) {
            eloValues.push(eloValue);
          }
        }
      }
    });
  }

  if (eloValues.length > 0) {
    const sum = eloValues.reduce((total, elo) => total + elo, 0);
    return Math.round(sum / eloValues.length);
  }

  return null;
}

function calculateTeamAverageFaceitElo(
  container: HTMLElement,
  faceitData: FaceitData
): number | null {
  const players = Array.from(container.querySelectorAll(".player"));

  const eloValues = players.map((player) => {
    const steamId = player.getAttribute("href")?.split("/profile/")[1];
    return steamId ? faceitData[steamId]?.elo : null;
  });

  const validEloValues = eloValues.filter((elo) => elo !== null) as number[];
  if (validEloValues.length === 0) {
    return null;
  }

  return Math.round(
    validEloValues.reduce((total, elo) => total + elo, 0) /
      validEloValues.length
  );
}

function updateTeamHeader(
  header: HTMLElement,
  renownElo: number | null,
  faceitElo: number | null = null,
  placement: "first" | "last" = "last"
) {
  if (!renownElo && !faceitElo) {
    return;
  }

  cleanupBadges();

  const badgesContainer = document.createElement("div");
  badgesContainer.style.cssText =
    "display: flex; align-items: center; margin: 4px 8px; gap: 8px;";
  badgesContainer.setAttribute(
    "data-clutch-extension",
    "team-average-elo-match-header"
  );

  if (placement === "first") {
    if (renownElo !== null) {
      const rankBadgeElement = createRankBadgeElement(renownElo, 30);
      badgesContainer.appendChild(rankBadgeElement);
    }
    if (faceitElo !== null) {
      const faceitBadgeElement = createFaceitBadgeElement(faceitElo, 30);
      badgesContainer.appendChild(faceitBadgeElement);
    }
  } else {
    if (faceitElo !== null) {
      const faceitBadgeElement = createFaceitBadgeElement(faceitElo, 30);
      badgesContainer.appendChild(faceitBadgeElement);
    }
    if (renownElo !== null) {
      const rankBadgeElement = createRankBadgeElement(renownElo, 30);
      badgesContainer.appendChild(rankBadgeElement);
    }
  }

  if (placement === "first") {
    if (header.firstChild) {
      header.insertBefore(badgesContainer, header.firstChild);
    }
  } else {
    header.appendChild(badgesContainer);
  }
}
