import type { UserSettings } from "$lib/types";
import { waitForElements } from "../utils/profileUtils";
import { initializeFaceitRanks } from "./faceitRanks";
import { initializeTeamAverageElo } from "./teamAverageElo";
import { isMatchPage } from "../utils/pageUtils";

interface PlayerData {
  steamId: string;
  element: HTMLElement;
}

interface MatchPageData {
  players: PlayerData[];
  faceitData: Record<string, { elo?: number; url?: string }>;
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

async function initializeMatchPageData(): Promise<MatchPageData | null> {
  const players = await getMatchPagePlayers();
  if (!players.length) {
    return null;
  }

  const faceitData = await getFaceitData(players.map((p) => p.steamId));
  return { players, faceitData };
}

export async function initializeMatchPage(
  userSettings: UserSettings
): Promise<void> {
  if (!isMatchPage()) {
    return;
  }

  const matchPageData = await initializeMatchPageData();
  if (!matchPageData) {
    return;
  }

  const { players, faceitData } = matchPageData;

  await initializeFaceitRanks(userSettings, players, faceitData);

  await initializeTeamAverageElo(userSettings, players, faceitData);
}
