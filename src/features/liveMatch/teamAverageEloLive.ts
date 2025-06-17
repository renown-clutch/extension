import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { createRankBadgeElement } from "$utils/data/rankBadgeUtils";
import { createFaceitBadgeElement } from "$utils/data/faceitUtils";
import { waitForElement } from "$utils/profileUtils";

interface FaceitData {
  [steamId: string]: {
    elo?: number;
    url?: string;
  };
}

interface PlayerData {
  steamId: string;
  element: HTMLElement;
}

let teamScoreObserver: MutationObserver | null = null;

async function getLiveMatchPagePlayers(): Promise<PlayerData[]> {
  const pageContainer = await waitForElement(".page");
  const team1Container = pageContainer.querySelector(".team1-players");
  const team2Container = pageContainer.querySelector(".team2-players");

  if (!team1Container || !team2Container) {
    return [];
  }

  const combinedPlayers = [
    ...team1Container.querySelectorAll(".player"),
    ...team2Container.querySelectorAll(".player"),
  ];

  const players: PlayerData[] = [];
  combinedPlayers.forEach((playerLink: Element) => {
    const href = playerLink.getAttribute("href");
    if (href?.includes("/profile/")) {
      players.push({
        element: playerLink as HTMLElement,
        steamId: href.split("/profile/")[1],
      });
    }
  });

  return players;
}

async function getFaceitData(
  steamIds: string[]
): Promise<Record<string, { elo?: number; url?: string }>> {
  try {
    const response = await new Promise<any>((resolve) => {
      chrome.runtime.sendMessage(
        { type: "get_faceit_info", steam_ids: steamIds },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "Faceit data fetch failed:",
              chrome.runtime.lastError.message
            );
            resolve({});
            return;
          }
          resolve(response || {});
        }
      );
    });
    return response || {};
  } catch (error) {
    console.warn("Error in Faceit data fetch:", error);
    return {};
  }
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

  const observerCallback = async (mutations: MutationRecord[]) => {
    const players = await getLiveMatchPagePlayers();
    const steamIds = players.map((p) => p.steamId);
    const newFaceitData = await getFaceitData(steamIds);
    await processTeamContainers(userSettings, newFaceitData);
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
  userSettings: UserSettings,
  faceitData: FaceitData
) {
  await cleanupBadges();

  const team1Container = document.querySelector(".team1-players");
  const team2Container = document.querySelector(".team2-players");

  if (!team1Container || !team2Container) {
    return;
  }

  const team1Elo = calculateTeamAverageElo(team1Container as HTMLElement);
  const team2Elo = calculateTeamAverageElo(team2Container as HTMLElement);

  let team1FaceitElo = null;
  let team2FaceitElo = null;
  if (userSettings.showFaceitRanksOnMatchPage) {
    team1FaceitElo = calculateTeamAverageFaceitElo(
      team1Container as HTMLElement,
      faceitData
    );
    team2FaceitElo = calculateTeamAverageFaceitElo(
      team2Container as HTMLElement,
      faceitData
    );
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
  badgesContainer.style.cssText = `display: flex; align-items: center; margin: 4px 8px; gap: ${
    placement === "last" ? "16px" : "8px"
  };`;
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

async function initializeTeamAverageEloLive(
  settings: UserSettings
): Promise<void> {
  if (!settings.showTeamAverageElo) {
    await cleanupBadges();
    if (teamScoreObserver) {
      teamScoreObserver.disconnect();
      teamScoreObserver = null;
    }
    return;
  }

  try {
    const players = await getLiveMatchPagePlayers();
    if (players.length === 0) {
      return;
    }

    const steamIds = players.map((p) => p.steamId);
    const faceitData = await getFaceitData(steamIds);

    await processTeamContainers(settings, faceitData);
    setupTeamScoreObserver(faceitData, settings);
  } catch (error) {
    console.error("[TeamAverageEloLive] Error in initialization:", error);
  }
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "showTeamAverageElo",
  category: "match",
  defaultValue: true,
  description: "Show team average ELO for live matches",
  featureId: "teamAverageEloLive",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["playMatch"]),
    ActivationHelpers.whenEnabled("showTeamAverageElo")
  ),

  handler: initializeTeamAverageEloLive,

  apiCalls: [
    {
      requestType: "get_faceit_info",
      responseType: "faceit_info_data",
    },
  ],
});
