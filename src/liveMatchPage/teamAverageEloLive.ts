import { createRankBadgeElement } from "../utils/rankBadgeUtils";
import { createFaceitBadgeElement } from "../utils/faceitUtils";
import type { UserSettings } from "$lib/types";

interface FaceitData {
  [steamId: string]: {
    elo?: number;
    url?: string;
  };
}

let teamScoreObserver: MutationObserver | null = null;

export async function initializeTeamAverageEloLive(
  userSettings: UserSettings,
  faceitData: FaceitData
) {
  if (!userSettings.showTeamAverageElo) {
    await cleanupBadges();
    if (teamScoreObserver) {
      teamScoreObserver.disconnect();
      teamScoreObserver = null;
    }
    return;
  }

  const team1Container = document.querySelector(".team1-players");
  const team2Container = document.querySelector(".team2-players");

  if (!team1Container || !team2Container) {
    return;
  }

  await processTeamContainers(
    team1Container as HTMLElement,
    team2Container as HTMLElement,
    faceitData,
    userSettings
  );

  setupTeamScoreObserver(faceitData, userSettings);
}

function setupTeamScoreObserver(
  faceitData: FaceitData,
  userSettings: UserSettings
) {
  if (teamScoreObserver) {
    teamScoreObserver.disconnect();
    teamScoreObserver = null;
  }

  const team1Content = document.querySelector(".match-score .team1 .content");
  const team2Content = document.querySelector(".match-score .team2 .content");
  const scoreElement = document.querySelector(".match-score .middle .score");

  if (!team1Content && !team2Content && !scoreElement) {
    return;
  }

  const observerCallback = (mutations: MutationRecord[]) => {
    initializeTeamAverageEloLive(userSettings, faceitData);
  };

  teamScoreObserver = new MutationObserver(observerCallback);

  const observerOptions = {
    childList: true,
    characterData: true,
    subtree: true,
  };

  if (team1Content) {
    teamScoreObserver.observe(team1Content, observerOptions);
  }

  if (team2Content) {
    teamScoreObserver.observe(team2Content, observerOptions);
  }

  if (scoreElement) {
    teamScoreObserver.observe(scoreElement, observerOptions);
  }
}

async function cleanupBadges() {
  const elements = document.querySelectorAll(
    '[data-clutch-extension="team-average-elo-match-header"]'
  );
  elements.forEach((element) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
}

async function processTeamContainers(
  team1Container: HTMLElement,
  team2Container: HTMLElement,
  faceitData: FaceitData,
  userSettings: UserSettings
) {
  await cleanupBadges();

  const team1Elo = calculateTeamAverageElo(team1Container);
  const team2Elo = calculateTeamAverageElo(team2Container);

  let team1FaceitElo = null;
  let team2FaceitElo = null;
  if (userSettings.showFaceitRanksOnMatchPage) {
    team1FaceitElo = calculateTeamAverageFaceitElo(team1Container, faceitData);
    team2FaceitElo = calculateTeamAverageFaceitElo(team2Container, faceitData);
  }

  const matchScore = document.querySelector(".match-score");
  if (!matchScore) {
    return;
  }

  const team1 = matchScore.querySelector(".team1");
  const team2 = matchScore.querySelector(".team2");

  if (!team1 || !team2) {
    return;
  }

  await updateTeamHeader(
    team1 as HTMLElement,
    team1Elo,
    team1FaceitElo,
    "first"
  );
  await updateTeamHeader(
    team2 as HTMLElement,
    team2Elo,
    team2FaceitElo,
    "last"
  );
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

  const validEloValues = eloValues.filter(
    (elo) => elo !== null && elo !== 0
  ) as number[];
  if (validEloValues.length === 0) {
    return null;
  }

  return Math.round(
    validEloValues.reduce((total, elo) => total + elo, 0) /
      validEloValues.length
  );
}

async function updateTeamHeader(
  header: HTMLElement,
  renownElo: number | null,
  faceitElo: number | null = null,
  placement: "first" | "last" = "last"
) {
  if (!renownElo && !faceitElo) {
    return;
  }

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
