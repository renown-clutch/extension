import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import browserAPI from "$system/lib/browserAPI";
import { getUserSteamId } from "$system/auth/steamIdParser";
import { waitForElement } from "$utils/profileUtils";

interface PlayerData {
  steamId: string;
  element: HTMLElement;
}

let mapStatsData: any = null;
let userTeam: "team1" | "team2" | null = null;

function removeMapStats(): void {
  const mapStats = document.querySelectorAll(".clutch-map-stats-wrapper");
  mapStats.forEach((stat) => {
    stat.remove();
  });

  const votingCards = document.querySelectorAll(".voting-options .voting-card");
  votingCards.forEach((card) => {
    const cardElement = card as HTMLElement;
    cardElement.style.cssText = "";
  });
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

async function determineUserTeam(players: PlayerData[]): Promise<void> {
  const userSteamId = await getUserSteamId();
  if (!userSteamId) return;

  const userPlayer = players.find((player) => player.steamId === userSteamId);
  if (!userPlayer) return;

  if (userPlayer.element.closest(".team1-players")) {
    userTeam = "team1";
  } else if (userPlayer.element.closest(".team2-players")) {
    userTeam = "team2";
  }
}

async function injectMapStats(
  players: PlayerData[],
  userSettings: UserSettings
): Promise<void> {
  await determineUserTeam(players);

  const team1Players: string[] = [];
  const team2Players: string[] = [];

  const processedSteamIds = new Set<string>();

  players.forEach(({ steamId, element }) => {
    if (!steamId || processedSteamIds.has(steamId)) return;
    processedSteamIds.add(steamId);

    if (element.closest(".team1-players")) {
      team1Players.push(steamId);
    } else if (element.closest(".team2-players")) {
      team2Players.push(steamId);
    }
  });

  if (team1Players.length === 0 || team2Players.length === 0) {
    return;
  }

  try {
    const response = await browserAPI.runtime.sendMessage({
      type: "fetchTeamsMapStats",
      team1SteamIds: team1Players,
      team2SteamIds: team2Players,
    });

    if (response && response.success) {
      mapStatsData = response.data;
      setupMapVetoObserver();
      renderMapStats(userSettings);
    } else {
      console.error("Failed to retrieve team map stats:", response?.error);
    }
  } catch (error) {
    console.error("Error fetching team map stats:", error);
  }
}

function setupMapVetoObserver(): void {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (
              node.classList.contains("match-veto") ||
              node.querySelector(".match-veto")
            ) {
              observer.disconnect();
              return;
            }
          }
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function createLucideIcon(iconName: string, size: number = 16): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", size.toString());
  svg.setAttribute("height", size.toString());
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.classList.add("lucide", `lucide-${iconName}`);

  const iconPaths: Record<string, string> = {
    swords: `<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/>`,
    arrow: `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`,
  };

  svg.innerHTML = iconPaths[iconName] || "";
  return svg;
}

function applyGradientStyle(
  element: HTMLElement,
  team1Wins: number,
  team2Wins: number
): void {
  const isUserTeamWinning =
    userTeam === "team1" ? team1Wins > team2Wins : team2Wins > team1Wins;
  const gradientColor = isUserTeamWinning ? "52, 207, 108" : "255, 82, 82";

  element.style.cssText = `
    border-top: 2px solid transparent;
    
    background: 
      linear-gradient(
        to right,
        rgba(${gradientColor}, 0) 0%,
        rgba(${gradientColor}, 1) 50%,
        rgba(${gradientColor}, 0) 100%
      );
  `;
}

function renderMapStats(userSettings: UserSettings): void {
  if (!mapStatsData) {
    return;
  }

  const matchVeto = document.querySelector(".match-veto");
  if (!matchVeto) {
    return;
  }

  const votingCards = matchVeto.querySelectorAll(
    ".voting-options .voting-card"
  );
  if (votingCards.length === 0) {
    return;
  }

  votingCards.forEach((card) => {
    const mapNameElement = card.querySelector(".map-name");
    if (!mapNameElement) return;

    const mapName = mapNameElement.textContent?.trim();
    if (!mapName) return;

    const mapKey = Object.keys(mapStatsData).find(
      (key) => key.toLowerCase() === mapName.toLowerCase()
    );

    if (!mapKey) {
      return;
    }

    const mapStats = mapStatsData[mapKey];

    const team1Wins = mapStats.team1 || 0;
    const team2Wins = mapStats.team2 || 0;

    if (userSettings.showMapStatsColors) {
      const cardElement = card as HTMLElement;
      if (!cardElement.classList.contains("banned")) {
        applyGradientStyle(cardElement, team1Wins, team2Wins);
      }
    }

    const statsWrapper = document.createElement("div");
    statsWrapper.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background-color: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(4px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 0.5px solid rgba(255, 255, 255, 0.5);
      padding: 1px 10px;
      font-size: 12px;
      border-radius: 6px;
      margin-left: 16px;
    `;

    const positionedWrapper = document.createElement("div");
    positionedWrapper.classList.add("clutch-map-stats-wrapper");
    positionedWrapper.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    positionedWrapper.appendChild(statsWrapper);

    const team1Span = document.createElement("span");
    const team2Span = document.createElement("span");
    const comparisonSpan = document.createElement("span");

    team1Span.textContent = team1Wins.toString();
    team2Span.textContent = team2Wins.toString();

    comparisonSpan.style.cssText = `
      display: inline-flex;
      align-items: center;
    `;

    const svg = createLucideIcon("swords", 12);

    comparisonSpan.appendChild(svg);

    statsWrapper.appendChild(team1Span);
    statsWrapper.appendChild(comparisonSpan);
    statsWrapper.appendChild(team2Span);

    mapNameElement.appendChild(positionedWrapper);
  });
}

async function initializeMapStats(settings: UserSettings): Promise<void> {
  if (!settings.showMapStats) {
    removeMapStats();
    return;
  }

  try {
    const players = await getLiveMatchPagePlayers();
    await injectMapStats(players, settings);
  } catch (error) {
    console.error("[MapStats] Error in initialization:", error);
  }
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "showMapStats",
  category: "match",
  defaultValue: true,
  description: "Show map statistics",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["playMatch"]),
    ActivationHelpers.whenEnabled("showMapStats")
  ),

  handler: initializeMapStats,

  apiCalls: [
    {
      requestType: "fetchTeamsMapStats",
      responseType: "teams_map_stats_data",
    },
  ],
});
