import type { UserSettings } from "$lib/types";
import { waitForElement } from "../utils/profileUtils";
import { initializeTeamAverageEloLive } from "./teamAverageEloLive";
import { isLiveMatch } from "../utils/pageUtils";
import { initializeLiveFaceitRanks } from "./liveFaceitRanks";

interface PlayerData {
  steamId: string;
  element: HTMLElement;
}

interface MatchPageData {
  players: PlayerData[];
  faceitData: Record<string, { elo?: number; url?: string }>;
}

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

async function initializeLiveMatchPageData(): Promise<MatchPageData | null> {
  const players = await getLiveMatchPagePlayers();
  if (!players.length) {
    return null;
  }

  const faceitData = await getFaceitData(players.map((p) => p.steamId));
  return { players, faceitData };
}

export async function initializeLiveMatchPage(
  userSettings: UserSettings
): Promise<void> {
  if (!isLiveMatch()) {
    return;
  }

  const matchPageData = await initializeLiveMatchPageData();

  if (!matchPageData) {
    return;
  }

  const { players, faceitData } = matchPageData;

  await initializeLiveFaceitRanks(userSettings, players, faceitData);

  await initializeTeamAverageEloLive(userSettings, faceitData);
}
