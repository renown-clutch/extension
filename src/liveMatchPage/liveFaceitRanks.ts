import { createFaceitBadgeElement } from "../utils/faceitUtils";
import type { UserSettings } from "$lib/types";
import { getLiveMatchPagePlayers } from "./intializeLiveMatchPage";
import { initializeLivePlayerStats } from "./livePlayerStats";

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
  if (players.length === 0) {
    return;
  }
  processPlayers(players, faceitData);
  setupPlayerListObservers(userSettings, faceitData);

  // Also rerender player stats when Faceit ranks are updated
  if (userSettings.liveMatchPlayerStats) {
    await initializeLivePlayerStats(userSettings);
  }
}
