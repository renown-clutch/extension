import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { createRankBadgeElement } from "$utils/data/rankBadgeUtils";
import { createFaceitBadgeElement } from "$utils/data/faceitUtils";
import { waitForElement } from "$utils/profileUtils";
import { getCurrentPage } from "$utils/common/pageUtils";
import { applyPresetAnimation } from "$utils/ui/animationUtils";

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

async function cleanupBadges(targetType?: "all" | "faceit") {
  if (!targetType || targetType === "all") {
    // Full cleanup
    const elements = document.querySelectorAll(
      '[data-clutch-extension="team-average-elo-match-header"]'
    );
    elements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  } else if (targetType === "faceit") {
    // Only remove faceit badges from live team average displays
    const elements = document.querySelectorAll(
      '[data-clutch-extension="team-average-elo-match-header"] [data-clutch-extension="faceit-badge"]'
    );
    elements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  }
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
      applyPresetAnimation(rankBadgeElement, "averageBadge");
      badgesContainer.appendChild(rankBadgeElement);
    }
    if (faceitElo !== null) {
      const faceitBadgeElement = createFaceitBadgeElement(faceitElo, 30);
      faceitBadgeElement.setAttribute("data-clutch-extension", "faceit-badge");
      applyPresetAnimation(faceitBadgeElement, "averageBadge");
      badgesContainer.appendChild(faceitBadgeElement);
    }
  } else {
    if (faceitElo !== null) {
      const faceitBadgeElement = createFaceitBadgeElement(faceitElo, 30);
      faceitBadgeElement.setAttribute("data-clutch-extension", "faceit-badge");
      applyPresetAnimation(faceitBadgeElement, "averageBadge");
      badgesContainer.appendChild(faceitBadgeElement);
    }
    if (renownElo !== null) {
      const rankBadgeElement = createRankBadgeElement(renownElo, 30);
      applyPresetAnimation(rankBadgeElement, "averageBadge");
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

// Function to update only Faceit badges in existing live team average displays
async function updateFaceitBadgesOnlyLive(
  faceitData: FaceitData,
  settings: UserSettings
) {
  // First, remove existing faceit badges
  await cleanupBadges("faceit");

  if (!settings.showFaceitRanksOnMatchPage) {
    return;
  }

  // Find existing team headers with our badges
  const existingHeaders = document.querySelectorAll(
    '[data-clutch-extension="team-average-elo-match-header"]'
  );

  for (const header of existingHeaders) {
    const parentElement = header.parentElement;
    if (!parentElement) continue;

    // Determine if this is team1 or team2 based on parent
    const isTeam1 = parentElement.classList.contains("team1");
    const teamClass = isTeam1 ? ".team1-players" : ".team2-players";
    const teamContainer = document.querySelector(teamClass);

    if (!teamContainer) continue;

    // Calculate average faceit elo for this team
    const avgFaceitElo = calculateTeamAverageFaceitElo(
      teamContainer as HTMLElement,
      faceitData
    );

    if (avgFaceitElo !== null) {
      const faceitBadgeElement = createFaceitBadgeElement(avgFaceitElo, 30);
      faceitBadgeElement.setAttribute("data-clutch-extension", "faceit-badge");
      applyPresetAnimation(faceitBadgeElement, "averageBadge");

      // Add faceit badge to existing container
      // For team1 (first placement), add at the end
      // For team2 (last placement), add at the beginning
      if (isTeam1) {
        header.appendChild(faceitBadgeElement);
      } else {
        header.insertBefore(faceitBadgeElement, header.firstChild);
      }
    }
  }
}

async function initializeTeamAverageEloLive(
  settings: UserSettings
): Promise<void> {
  if (!settings.showTeamAverageElo) {
    await cleanupBadges("all");
    if (teamScoreObserver) {
      teamScoreObserver.disconnect();
      teamScoreObserver = null;
    }
    return;
  }

  // Check if we already have team average ELO displays
  const existingDisplays = document.querySelectorAll(
    '[data-clutch-extension="team-average-elo-match-header"]'
  );
  const hasExistingDisplays = existingDisplays.length > 0;

  if (hasExistingDisplays) {
    try {
      const players = await getLiveMatchPagePlayers();
      if (players.length > 0) {
        // Get faceit data if faceit ranks are enabled
        let faceitData: FaceitData = {};
        if (settings.showFaceitRanksOnMatchPage) {
          const steamIds = players.map((p) => p.steamId);
          faceitData = await getFaceitData(steamIds);
        }

        // Do a partial update instead of full re-render
        await updateFaceitBadgesOnlyLive(faceitData, settings);
        return;
      }
    } catch (error) {
      console.error(
        "[TeamAverageEloLive] Error in partial update, falling back to full render:",
        error
      );
    }
  }

  // Full initialization (first time or fallback)

  await cleanupBadges("all");

  try {
    // Wait for page elements
    const pageContainer = await waitForElement(".page");

    // Check for team containers
    const team1Container = pageContainer.querySelector(".team1-players");
    const team2Container = pageContainer.querySelector(".team2-players");

    if (!team1Container || !team2Container) {
      setTimeout(() => initializeTeamAverageEloLive(settings), 2000);
      return;
    }

    // Get players
    const players = await getLiveMatchPagePlayers();

    if (players.length === 0) {
      setTimeout(() => initializeTeamAverageEloLive(settings), 2000);
      return;
    }

    // Get Faceit data
    const steamIds = players.map((p) => p.steamId);
    const faceitData = await getFaceitData(steamIds);

    // Process teams

    await processTeamContainers(settings, faceitData);

    // Setup observer

    setupTeamScoreObserver(faceitData, settings);
  } catch (error) {
    console.error("[TeamAverageEloLive] Error during initialization:", error);
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

  dependsOn: ["showFaceitRanksOnMatchPage"],

  handler: initializeTeamAverageEloLive,
  cleanupHandler: async (settings: UserSettings) => {
    await cleanupBadges();
    if (teamScoreObserver) {
      teamScoreObserver.disconnect();
      teamScoreObserver = null;
    }
  },

  apiCalls: [
    {
      requestType: "get_faceit_info",
      responseType: "faceit_info_data",
    },
  ],
});
