import { createFaceitBadgeElement } from "../utils/faceitUtils";
import type { UserSettings } from "$lib/types";

interface FaceitInfo {
  elo?: number;
  url?: string;
}

interface PlayerData {
  steamId: string;
  element: HTMLElement;
}

let observers: MutationObserver[] = [];

const cleanupFaceitIcons = () => {
  document
    .querySelectorAll("[data-clutch-extension='faceit-badge-live-match-page']")
    .forEach((element) => {
      element?.parentNode?.removeChild(element);
    });

  document.querySelectorAll(".faceit-icon").forEach((element) => {
    element?.parentNode?.removeChild(element);
  });
};

const processPlayers = (
  players: PlayerData[],
  faceitData: Record<string, FaceitInfo>
): void => {
  cleanupFaceitIcons();

  players.forEach(({ element, steamId }) => {
    const badgeSize = 30;

    const infoWrapper = element.querySelector(".player-info-wrapper");
    if (infoWrapper && infoWrapper instanceof HTMLElement) {
      infoWrapper.style.gap = "10px";
    }

    const faceitInfo = faceitData[steamId];

    const faceitBadge = createFaceitBadgeElement(
      faceitInfo.elo || null,
      badgeSize,
      false,
      "",
      "faceit-badge-live-match-page",
      faceitInfo.url
    );

    const avatarWrapper = element.querySelector(".avatar-wrapper");
    if (!avatarWrapper) {
      return;
    }

    avatarWrapper.insertAdjacentElement("afterend", faceitBadge);
  });
};

const setupPlayerListObservers = (
  userSettings: UserSettings,
  players: PlayerData[],
  faceitData: Record<string, FaceitInfo>
): void => {
  observers.forEach((observer) => observer.disconnect());
  observers = [];

  const observerCallback = async () => {
    initializeLiveFaceitRanks(userSettings, players, faceitData);
  };

  const observerConfig = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    characterData: true,
  };

  // Find the player-list container
  const playerList = document.querySelector(".player-list");
  if (playerList) {
    const observer = new MutationObserver((mutations) => {
      // Filter out mutations that only affect our extension elements
      const relevantMutation = mutations.some((mutation) => {
        // Skip mutations on our extension elements or tooltips
        if (
          mutation.target instanceof Element &&
          (mutation.target.hasAttribute("data-clutch-extension") ||
            mutation.target.classList.contains("clutch-tooltip"))
        ) {
          return false;
        }

        // Skip opacity style changes (tooltip showing/hiding)
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

        // Check for player attribute changes (position changes)
        if (
          mutation.type === "attributes" &&
          mutation.target instanceof Element &&
          mutation.target.classList.contains("player")
        ) {
          return true;
        }

        // Skip if the mutation only affects our extension elements
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

      if (relevantMutation) {
        observerCallback();
      }
    });

    observer.observe(playerList, observerConfig);
    observers.push(observer);
  }

  setupTeamContainerObservers(userSettings, players, faceitData);
};

const setupTeamContainerObservers = (
  userSettings: UserSettings,
  players: PlayerData[],
  faceitData: Record<string, FaceitInfo>
): void => {
  const observerCallback = async () => {
    initializeLiveFaceitRanks(userSettings, players, faceitData);
  };

  // Watch team player containers for changes
  const teamPlayerContainers = document.querySelectorAll(
    ".team1-players, .team2-players"
  );

  if (teamPlayerContainers.length === 0) {
    return;
  }

  teamPlayerContainers.forEach((container) => {
    const observer = new MutationObserver((mutations) => {
      const relevantMutation = mutations.some((mutation) => {
        // Skip mutations on tooltip elements
        if (
          mutation.target instanceof Element &&
          (mutation.target.classList.contains("clutch-tooltip") ||
            mutation.target.closest(".clutch-tooltip"))
        ) {
          return false;
        }

        // Skip style changes on tooltip elements (opacity changes)
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style" &&
          mutation.target instanceof HTMLElement &&
          mutation.oldValue !== null &&
          (mutation.target.classList.contains("clutch-tooltip") ||
            mutation.target.closest("[data-clutch-extension]"))
        ) {
          return false;
        }

        // Only care about childList changes in team containers
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          // Filter out tooltip elements
          const filteredAddedNodes = addedNodes.filter(
            (node) =>
              !(
                node instanceof Element &&
                (node.classList.contains("clutch-tooltip") ||
                  node.hasAttribute("data-clutch-extension"))
              )
          );

          // Check if a player-list was added
          const hasPlayerList = filteredAddedNodes.some(
            (node) =>
              node instanceof Element &&
              (node.classList.contains("player-list") ||
                node.querySelector(".player-list"))
          );

          return hasPlayerList;
        }
        return false;
      });

      if (relevantMutation) {
        observerCallback();
      }
    });

    observer.observe(container, {
      childList: true,
      attributes: true,
      subtree: true,
    });
    observers.push(observer);
  });
};

export async function initializeLiveFaceitRanks(
  userSettings: UserSettings,
  players: PlayerData[],
  faceitData: Record<string, FaceitInfo>
): Promise<void> {
  console.log("initializeLiveFaceitRanks called");

  if (!userSettings.showFaceitRanksOnMatchPage) {
    cleanupFaceitIcons();
    observers.forEach((observer) => observer.disconnect());
    observers = [];
    return;
  }

  // Add CSS to ensure tooltips work properly on both teams
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

  processPlayers(players, faceitData);
  setupPlayerListObservers(userSettings, players, faceitData);
}
