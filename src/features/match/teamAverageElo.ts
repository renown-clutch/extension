import { registerFeature, ActivationHelpers } from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { createRankBadgeElement } from "$utils/data/rankBadgeUtils";
import { createFaceitBadgeElement } from "$utils/data/faceitUtils";
import { waitForElement, waitForElements } from "$utils/profileUtils";
import { waitForHydrationComplete } from "$utils/hydrationUtils";
import browserAPI from "$system/lib/browserAPI";
import "./teamAverageElo.css";

interface PlayerData {
  steamId: string;
  element: HTMLElement;
}

interface FaceitInfo {
  elo?: number;
  url?: string;
}

function cleanupBadges() {
  const elements = document.querySelectorAll(
    '[data-clutch-extension="team-average-elo-element"], .team-avg-elo'
  );
  elements.forEach((element) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  // Remove injected CSS when cleaning up
  const styleElement = document.getElementById(
    "clutch-team-average-elo-styles"
  );
  if (styleElement) {
    styleElement.remove();
  }
}

function calculateTeamAverageElo(container: HTMLElement): number | null {
  const rankBadges = container.querySelectorAll(".rank-badge");
  let eloValues: number[] = [];

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
  });

  const sum = eloValues.reduce((total, elo) => total + elo, 0);
  return Math.round(sum / eloValues.length);
}

function calculateTeamAverageFaceitElo(
  container: HTMLElement,
  players: PlayerData[],
  faceitData: Record<string, FaceitInfo>
): number | null {
  const eloValues = players
    .map((player) => faceitData[player.steamId]?.elo)
    .filter(
      (elo): elo is number => elo !== undefined && elo !== null && elo !== 0
    );

  if (eloValues.length > 0) {
    const sum = eloValues.reduce((total, elo) => total + elo, 0);
    return Math.round(sum / eloValues.length);
  }

  return null;
}

async function processTeamTable(
  table: HTMLElement,
  players: PlayerData[],
  faceitData: Record<string, FaceitInfo>,
  userSettings: UserSettings
) {
  const heading = table.querySelector(".heading");
  if (!heading) return;

  const h3 = heading.querySelector("h3");
  if (!h3) return;

  const avgRenownElo = calculateTeamAverageElo(table);
  let avgFaceitElo = null;
  if (userSettings.showFaceitRanksOnMatchPage) {
    avgFaceitElo = calculateTeamAverageFaceitElo(table, players, faceitData);
  } else {
    avgFaceitElo = null;
  }

  if (avgRenownElo === null && avgFaceitElo === null) return;

  const wrapper = document.createElement("div");
  wrapper.className = "clutch-team-average-elo-wrapper";
  wrapper.setAttribute("data-clutch-extension", "team-average-elo-element");
  wrapper.setAttribute(
    "data-team-id",
    table.getAttribute("data-team-id") || ""
  );

  const avgRankLabel = document.createElement("div");
  avgRankLabel.className = "clutch-team-average-elo-label";
  avgRankLabel.textContent = "Average ELO:";
  wrapper.appendChild(avgRankLabel);

  const badgesContainer = document.createElement("div");
  badgesContainer.className = "clutch-team-badges-container";

  if (avgRenownElo !== null) {
    const rankBadgeElement = createRankBadgeElement(avgRenownElo, 25, true);
    badgesContainer.appendChild(rankBadgeElement);
  }

  if (avgFaceitElo !== null) {
    const faceitBadgeElement = createFaceitBadgeElement(
      avgFaceitElo,
      25,
      true,
      ""
    );
    faceitBadgeElement.classList.add("clutch-team-faceit-badge");
    badgesContainer.appendChild(faceitBadgeElement);
  }

  wrapper.appendChild(badgesContainer);

  heading.appendChild(wrapper);
}

async function getMatchPagePlayers(): Promise<PlayerData[]> {
  const teamStatsTables = await waitForElements(".team-stats-table");

  if (!(teamStatsTables instanceof NodeList) || !teamStatsTables.length) {
    return [];
  }

  const players: PlayerData[] = [];
  teamStatsTables.forEach((table: Element) => {
    table.querySelectorAll(".row .player").forEach((playerLink: Element) => {
      const href = playerLink.getAttribute("href");
      if (href?.includes("/profile/")) {
        players.push({
          element: playerLink as HTMLElement,
          steamId: href.split("/profile/")[1],
        });
      }
    });
  });

  return players;
}

async function getFaceitData(
  steamIds: string[]
): Promise<Record<string, FaceitInfo>> {
  try {
    const response = await new Promise<any>((resolve) => {
      browserAPI.runtime.sendMessage(
        { type: "get_faceit_info", steam_ids: steamIds },
        (response) => {
          if (browserAPI.runtime.lastError) {
            console.warn(
              "Faceit data fetch failed:",
              browserAPI.runtime.lastError.message
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

async function initializeTeamAverageElo(settings: UserSettings): Promise<void> {
  cleanupBadges();

  if (!settings.showTeamAverageElo) {
    return;
  }

  try {
    // Wait for hydration to complete before proceeding
    await waitForHydrationComplete();

    const container = await waitForElement(".page");
    const players = await getMatchPagePlayers();

    if (!players.length) {
      return;
    }

    // Get faceit data if faceit ranks are enabled
    let faceitData: Record<string, FaceitInfo> = {};
    if (settings.showFaceitRanksOnMatchPage) {
      faceitData = await getFaceitData(players.map((p) => p.steamId));
    }

    const teamTables = container.querySelectorAll(".team-stats-table");
    if (teamTables.length !== 2) {
      return;
    }

    for (const table of teamTables) {
      const teamPlayers = players.filter((player) => {
        const playerElement = player.element;
        return table.contains(playerElement);
      });
      await processTeamTable(
        table as HTMLElement,
        teamPlayers,
        faceitData,
        settings
      );
    }
  } catch (error) {
    console.error("[TeamAverageElo] Error in initialization:", error);
  }
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "showTeamAverageElo",
  category: "match",
  defaultValue: true,
  description: "Show team average ELO",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["matchPage"]),
    ActivationHelpers.whenEnabled("showTeamAverageElo")
  ),

  handler: initializeTeamAverageElo,

  apiCalls: [
    {
      requestType: "get_faceit_info",
      responseType: "faceit_info_data",
    },
  ],
});
