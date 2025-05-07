import { createFaceitBadgeElement } from "../utils/faceitUtils";
import type { UserSettings } from "$lib/types";
import { getLiveMatchPagePlayers } from "./intializeLiveMatchPage";
import browserAPI from "../lib/browserAPI";

interface FaceitInfo {
  elo?: number;
  url?: string;
}

interface PlayerData {
  steamId: string;
  element: HTMLElement;
}

let observers: MutationObserver[] = [];
let processedPlayers = new Set<HTMLElement>();
let faceitIconMap = new Map<string, HTMLElement>();
let ignoreObserverChanges = false;
let mapStatsData: any = null;

const cleanupFaceitIcons = () => {
  document
    .querySelectorAll("[data-clutch-extension='faceit-badge-live-match-page']")
    .forEach((element) => {
      element?.parentNode?.removeChild(element);
    });

  document.querySelectorAll(".faceit-icon").forEach((element) => {
    element?.parentNode?.removeChild(element);
  });

  processedPlayers.clear();
  faceitIconMap.clear();
};

const processPlayers = (
  players: PlayerData[],
  faceitData: Record<string, FaceitInfo>
): void => {
  if (!ignoreObserverChanges) {
    cleanupFaceitIcons();
  }

  players.forEach(({ element, steamId }) => {
    const badgeSize = 30;

    const infoWrapper = element.querySelector(".player-info-wrapper");
    if (infoWrapper && infoWrapper instanceof HTMLElement) {
      infoWrapper.style.gap = "10px";
    }

    const faceitInfo = faceitData[steamId];

    const existingBadge = element.querySelector(
      "[data-clutch-extension='faceit-badge-live-match-page']"
    );
    if (existingBadge) {
      if (ignoreObserverChanges) {
        return;
      }
      existingBadge.parentNode?.removeChild(existingBadge);
    }

    const faceitBadge = createFaceitBadgeElement(
      faceitInfo?.elo || null,
      badgeSize,
      false,
      "",
      "faceit-badge-live-match-page",
      faceitInfo?.url
    );

    const avatarWrapper = element.querySelector(".avatar-wrapper");
    if (!avatarWrapper) {
      return;
    }

    avatarWrapper.insertAdjacentElement("afterend", faceitBadge);

    processedPlayers.add(element);
    if (steamId) {
      faceitIconMap.set(steamId, faceitBadge);
    }
  });
};

const setupPlayerListObservers = (
  userSettings: UserSettings,
  faceitData: Record<string, FaceitInfo>
): void => {
  observers.forEach((observer) => observer.disconnect());
  observers = [];

  const observerCallback = async (mutations: MutationRecord[]) => {
    const relevantMutation = mutations.some((mutation) => {
      if (
        mutation.target instanceof Element &&
        (mutation.target.hasAttribute("data-clutch-extension") ||
          mutation.target.classList.contains("clutch-tooltip"))
      ) {
        return false;
      }

      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "style" &&
        mutation.target instanceof HTMLElement &&
        mutation.oldValue !== null &&
        mutation.target.style.opacity !== mutation.oldValue &&
        (mutation.target.classList.contains("clutch-tooltip") ||
          mutation.target.closest("[data-clutch-extension]"))
      ) {
        return false;
      }

      if (
        mutation.type === "attributes" &&
        mutation.target instanceof Element &&
        mutation.target.classList.contains("player")
      ) {
        return true;
      }

      if (mutation.type === "childList") {
        const addedNodesRelevant = Array.from(mutation.addedNodes).some(
          (node) =>
            node instanceof Element &&
            !node.hasAttribute("data-clutch-extension") &&
            !node.classList.contains("clutch-tooltip")
        );
        const removedNodesRelevant = Array.from(mutation.removedNodes).some(
          (node) =>
            node instanceof Element &&
            !node.hasAttribute("data-clutch-extension") &&
            !node.classList.contains("clutch-tooltip")
        );
        return addedNodesRelevant || removedNodesRelevant;
      }

      return true;
    });

    if (relevantMutation && !ignoreObserverChanges) {
      const currentPlayers = Array.from(
        document.querySelectorAll(".player")
      ).filter((p) => !processedPlayers.has(p as HTMLElement));

      if (currentPlayers.length > 0) {
        console.log(
          "Player order changed or new players detected, updating Faceit icons"
        );
        ignoreObserverChanges = true;

        try {
          initializeLiveFaceitRanks(userSettings, faceitData);
        } finally {
          setTimeout(() => {
            ignoreObserverChanges = false;
          }, 100);
        }
      }
    }
  };

  const observerConfig = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    characterData: true,
  };

  const playerList = document.querySelector(".player-list");
  if (playerList) {
    const observer = new MutationObserver(observerCallback);
    observer.observe(playerList, observerConfig);
    observers.push(observer);
  }

  setupTeamContainerObservers(userSettings, faceitData);
};

const setupTeamContainerObservers = (
  userSettings: UserSettings,
  faceitData: Record<string, FaceitInfo>
): void => {
  const teamPlayerContainers = document.querySelectorAll(
    ".team1-players, .team2-players"
  );

  if (teamPlayerContainers.length === 0) {
    return;
  }

  teamPlayerContainers.forEach((container) => {
    const observer = new MutationObserver((mutations) => {
      if (ignoreObserverChanges) return;

      const relevantMutation = mutations.some((mutation) => {
        if (
          mutation.target instanceof Element &&
          (mutation.target.classList.contains("clutch-tooltip") ||
            mutation.target.closest(".clutch-tooltip") ||
            mutation.target.hasAttribute("data-clutch-extension") ||
            mutation.target.closest("[data-clutch-extension]"))
        ) {
          return false;
        }

        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          const filteredAddedNodes = addedNodes.filter(
            (node) =>
              !(
                node instanceof Element &&
                (node.classList.contains("clutch-tooltip") ||
                  node.hasAttribute("data-clutch-extension"))
              )
          );

          const hasPlayerList = filteredAddedNodes.some(
            (node) =>
              node instanceof Element &&
              (node.classList.contains("player-list") ||
                node.querySelector(".player-list"))
          );

          const hasPlayerChanges = filteredAddedNodes.some(
            (node) =>
              node instanceof Element &&
              (node.classList.contains("player") ||
                node.querySelector(".player"))
          );

          return hasPlayerList || hasPlayerChanges;
        }

        if (
          mutation.type === "attributes" &&
          mutation.target instanceof Element &&
          mutation.target.classList.contains("player")
        ) {
          return true;
        }

        return false;
      });

      if (relevantMutation) {
        console.log("Team container changed, updating Faceit icons");

        ignoreObserverChanges = true;

        try {
          setTimeout(() => {
            initializeLiveFaceitRanks(userSettings, faceitData);
          }, 50);
        } finally {
          setTimeout(() => {
            ignoreObserverChanges = false;
          }, 100);
        }
      }
    });

    observer.observe(container, {
      childList: true,
      attributes: true,
      subtree: true,
    });
    observers.push(observer);
  });

  const matchContent = document.querySelector(".match-content");
  if (matchContent) {
    const observer = new MutationObserver((mutations) => {
      if (ignoreObserverChanges) return;

      const relevantMutation = mutations.some((mutation) => {
        if (mutation.type === "childList") {
          const nodeChangesRelevant = [
            ...Array.from(mutation.addedNodes),
            ...Array.from(mutation.removedNodes),
          ].some(
            (node) =>
              node instanceof Element &&
              (node.classList.contains("player-list") ||
                node.querySelector(".player-list") ||
                node.classList.contains("player") ||
                node.querySelector(".player"))
          );

          return nodeChangesRelevant;
        }
        return false;
      });

      if (relevantMutation) {
        console.log("Match content changed, updating Faceit icons");

        ignoreObserverChanges = true;

        try {
          setTimeout(() => {
            initializeLiveFaceitRanks(userSettings, faceitData);
          }, 50);
        } finally {
          setTimeout(() => {
            ignoreObserverChanges = false;
          }, 100);
        }
      }
    });

    observer.observe(matchContent, {
      childList: true,
      subtree: true,
    });
    observers.push(observer);
  }
};

async function fetchTeamMapStats(players: PlayerData[]): Promise<void> {
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
    console.log("Not enough players found to fetch team map stats");
    return;
  }

  console.log("Fetching map stats for teams:", {
    team1: team1Players,
    team2: team2Players,
  });

  try {
    const response = await browserAPI.runtime.sendMessage({
      type: "fetchTeamsMapStats",
      team1SteamIds: team1Players,
      team2SteamIds: team2Players,
    });

    if (response.success) {
      console.log("Team map stats retrieved:", response.data);
      mapStatsData = response.data;
      setupMapVetoObserver();
      injectMapStats();
    } else {
      console.error("Failed to retrieve team map stats:", response.error);
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
            const matchVeto = document.querySelector(".match-veto");
            if (matchVeto) {
              console.log("Map veto section detected");
              injectMapStats();
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

function injectMapStats(): void {
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

    const existingStats = mapNameElement.querySelector("div");
    if (existingStats) {
      existingStats.remove();
    }

    const mapKey = Object.keys(mapStatsData).find(
      (key) => key.toLowerCase() === mapName.toLowerCase()
    );

    if (!mapKey) {
      return;
    }

    const mapStats = mapStatsData[mapKey];

    const team1Wins = mapStats.team1 || 0;
    const team2Wins = mapStats.team2 || 0;

    // Add gradient border based on team stats
    const cardElement = card as HTMLElement;
    const gradientDirection = team1Wins > team2Wins ? "to right" : "to left";
    const gradientColors = "#4bf903, #ff0d00";

    cardElement.style.cssText = `
      border: 2px solid transparent;
      border-radius: 16px;
      background: linear-gradient(${gradientDirection}, ${gradientColors}) border-box;
    `;

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

    mapNameElement.appendChild(statsWrapper);

    console.log(
      `Injected colored stats for ${mapName}: ${team1Wins} ${comparisonSpan.textContent} ${team2Wins}`
    );
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

export async function initializeLiveFaceitRanks(
  userSettings: UserSettings,
  faceitData: Record<string, FaceitInfo>
): Promise<void> {
  if (!userSettings.showFaceitRanksOnMatchPage) {
    cleanupFaceitIcons();
    observers.forEach((observer) => observer.disconnect());
    observers = [];
    return;
  }

  if (!document.getElementById("clutch-faceit-live-tooltip-styles")) {
    const style = document.createElement("style");
    style.id = "clutch-faceit-live-tooltip-styles";
    style.textContent = `
      /* Ensure tooltip containers have proper positioning */
      .team1-players .player .avatar-wrapper + [data-clutch-extension="faceit-badge-live-match-page"],
      .team2-players .player .avatar-wrapper + [data-clutch-extension="faceit-badge-live-match-page"] {
        position: relative !important;
        z-index: 10;
      }
      
      /* Ensure image containers inside faceit badges have positioning context for tooltips */
      [data-clutch-extension="faceit-badge-live-match-page"] > div,
      .faceit-icon-container {
        position: relative !important;
      }
      
      /* Make sure tooltips appear above other elements */
      .clutch-tooltip {
        z-index: 100 !important;
      }
      
      /* Fix tooltip positioning specifically for team1 players if needed */
      .team1-players .player .avatar-wrapper + [data-clutch-extension="faceit-badge-live-match-page"] .clutch-tooltip {
        left: 50% !important;
        transform: translateX(-50%) !important;
      }
    `;
    document.head.appendChild(style);
  }

  const players = await getLiveMatchPagePlayers();
  processPlayers(players, faceitData);
  setupPlayerListObservers(userSettings, faceitData);

  await fetchTeamMapStats(players);
}
