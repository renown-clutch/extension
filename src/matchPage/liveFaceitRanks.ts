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

  // Clear internal tracking maps
  processedPlayers.clear();
  faceitIconMap.clear();
};

const processPlayers = (
  players: PlayerData[],
  faceitData: Record<string, FaceitInfo>
): void => {
  // Don't clean up icons when just updating existing ones
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

    // Check if we already have an icon for this player
    const existingBadge = element.querySelector(
      "[data-clutch-extension='faceit-badge-live-match-page']"
    );
    if (existingBadge) {
      // If we're just updating icons, don't recreate them
      if (ignoreObserverChanges) {
        return;
      }
      // Remove the existing badge if we're doing a full refresh
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

    // Track the player element and faceit icon
    processedPlayers.add(element);
    if (steamId) {
      faceitIconMap.set(steamId, faceitBadge);
    }
  });
};

const setupPlayerListObservers = (
  userSettings: UserSettings,
  players: PlayerData[],
  faceitData: Record<string, FaceitInfo>
): void => {
  observers.forEach((observer) => observer.disconnect());
  observers = [];

  const observerCallback = async (mutations: MutationRecord[]) => {
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

    if (relevantMutation && !ignoreObserverChanges) {
      // Check if players have been reordered and update accordingly
      const currentPlayers = Array.from(
        document.querySelectorAll(".player")
      ).filter((p) => !processedPlayers.has(p as HTMLElement));

      if (currentPlayers.length > 0) {
        console.log(
          "Player order changed or new players detected, updating Faceit icons"
        );
        // Set flag to prevent reprocessing during our updates
        ignoreObserverChanges = true;

        try {
          // Update with existing data
          initializeLiveFaceitRanks(userSettings, players, faceitData);
        } finally {
          // Reset flag after updates are done
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

  // Find the player-list container
  const playerList = document.querySelector(".player-list");
  if (playerList) {
    const observer = new MutationObserver(observerCallback);
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
  // Watch team player containers for changes
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
        // Skip mutations on tooltip elements
        if (
          mutation.target instanceof Element &&
          (mutation.target.classList.contains("clutch-tooltip") ||
            mutation.target.closest(".clutch-tooltip") ||
            mutation.target.hasAttribute("data-clutch-extension") ||
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

          // Check if players were added or removed
          const hasPlayerChanges = filteredAddedNodes.some(
            (node) =>
              node instanceof Element &&
              (node.classList.contains("player") ||
                node.querySelector(".player"))
          );

          return hasPlayerList || hasPlayerChanges;
        }

        // Check for player position changes
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

        // Set flag to prevent reprocessing during our updates
        ignoreObserverChanges = true;

        try {
          setTimeout(() => {
            initializeLiveFaceitRanks(userSettings, players, faceitData);
          }, 50);
        } finally {
          // Reset flag after updates are done
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

  // Also observe player reordering at a higher level
  const matchContent = document.querySelector(".match-content");
  if (matchContent) {
    const observer = new MutationObserver((mutations) => {
      if (ignoreObserverChanges) return;

      const relevantMutation = mutations.some((mutation) => {
        // Check if match content or player lists have changed
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

        // Set flag to prevent reprocessing during our updates
        ignoreObserverChanges = true;

        try {
          setTimeout(() => {
            initializeLiveFaceitRanks(userSettings, players, faceitData);
          }, 50);
        } finally {
          // Reset flag after updates are done
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
  players: PlayerData[],
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

  processPlayers(players, faceitData);
  setupPlayerListObservers(userSettings, players, faceitData);
}
