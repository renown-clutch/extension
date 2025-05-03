import { createRankBadgeElement } from "../utils/rankBadgeUtils";
import { createFaceitBadgeElement } from "../utils/faceitUtils";
import { waitForElement } from "../utils/profileUtils";
import type { UserSettings } from "$lib/types";

interface PlayerData {
  steamId: string;
  element: HTMLElement;
}

interface FaceitInfo {
  elo?: number;
  url?: string;
}

export async function initializeTeamAverageElo(
  userSettings: UserSettings,
  players: PlayerData[],
  faceitData: Record<string, FaceitInfo>
) {
  cleanupBadges();
  if (!userSettings.showTeamAverageElo) {
    return;
  }

  const container = await waitForElement(".page");

  const teamTables = container.querySelectorAll(".team-stats-table");
  if (teamTables.length !== 2) {
    return;
  }

  for (const table of teamTables) {
    const teamPlayers = players.filter((player) => {
      const playerElement = player.element;
      return table.contains(playerElement);
    });
    processTeamTable(
      table as HTMLElement,
      teamPlayers,
      faceitData,
      userSettings
    );
  }
}

function cleanupBadges() {
  const elements = document.querySelectorAll(
    '[data-clutch-extension="team-average-elo-element"]'
  );
  elements.forEach((element) => {
    console.log("Removing team average elo element", element);
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
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
    .filter((elo): elo is number => elo !== undefined);

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
  wrapper.style.cssText =
    "display: flex; align-items: center; gap: 1rem; border-left: solid var(--slate-600); padding-left: 1rem; ";
  wrapper.setAttribute("data-clutch-extension", "team-average-elo-element");
  wrapper.setAttribute(
    "data-team-id",
    table.getAttribute("data-team-id") || ""
  );

  const avgRankLabel = document.createElement("div");
  avgRankLabel.textContent = "Average Team Rank:";
  avgRankLabel.style.fontSize = "14px";
  wrapper.appendChild(avgRankLabel);

  const badgesContainer = document.createElement("div");
  badgesContainer.style.cssText =
    "display: flex; align-items: center; gap: 8px;";

  if (avgRenownElo !== null) {
    const rankBadgeElement = createRankBadgeElement(avgRenownElo, 25, true);
    badgesContainer.appendChild(rankBadgeElement);
  }

  if (avgFaceitElo !== null) {
    const faceitBadgeElement = createFaceitBadgeElement(
      avgFaceitElo,
      25,
      true,
      "margin-top: 1px;"
    );
    badgesContainer.appendChild(faceitBadgeElement);
  }

  wrapper.appendChild(badgesContainer);

  h3.insertAdjacentElement("afterend", wrapper);
}
