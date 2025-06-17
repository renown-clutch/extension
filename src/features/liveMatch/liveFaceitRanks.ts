import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { createFaceitBadgeElement } from "$utils/data/faceitUtils";
import { waitForElement } from "$utils/profileUtils";
import { getCurrentPage } from "$utils/common/pageUtils";
import { applyPresetAnimation } from "$utils/ui/animationUtils";

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
): Promise<Record<string, FaceitInfo>> {
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

    // Debug: Log if URL is being passed
    if (faceitInfo?.url) {
      console.log(
        `[LiveFaceitRanks] Created clickable badge for ${steamId} with URL:`,
        faceitInfo.url
      );
    } else {
      console.log(
        `[LiveFaceitRanks] No URL for ${steamId}, badge won't be clickable`
      );
    }

    // Apply entrance animation
    applyPresetAnimation(faceitBadge, "faceitBadge");

    // Add click event handler to prevent parent link navigation
    if (faceitInfo?.url) {
      faceitBadge.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(faceitInfo.url, "_blank");
      });
    }

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
          const players = await getLiveMatchPagePlayers();
          const steamIds = players.map((p) => p.steamId);
          const newFaceitData = await getFaceitData(steamIds);
          processPlayers(players, newFaceitData);
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
          setTimeout(async () => {
            const players = await getLiveMatchPagePlayers();
            const steamIds = players.map((p) => p.steamId);
            const newFaceitData = await getFaceitData(steamIds);
            processPlayers(players, newFaceitData);
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
          setTimeout(async () => {
            const players = await getLiveMatchPagePlayers();
            const steamIds = players.map((p) => p.steamId);
            const newFaceitData = await getFaceitData(steamIds);
            processPlayers(players, newFaceitData);
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

function injectLiveFaceitStyles(): void {
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
}

async function initializeLiveFaceitRanks(
  settings: UserSettings
): Promise<void> {
  console.log("[LiveFaceitRanks] Initializing with settings:", settings);
  console.log(
    "[LiveFaceitRanks] showFaceitRanksOnMatchPage:",
    settings.showFaceitRanksOnMatchPage
  );
  console.log("[LiveFaceitRanks] Current URL:", window.location.href);
  console.log("[LiveFaceitRanks] Current page type:", getCurrentPage());

  if (!settings.showFaceitRanksOnMatchPage) {
    console.log("[LiveFaceitRanks] Feature disabled, cleaning up");
    cleanupFaceitIcons();
    observers.forEach((observer) => observer.disconnect());
    observers = [];
    return;
  }

  try {
    console.log("[LiveFaceitRanks] Starting initialization...");

    // Inject styles
    console.log("[LiveFaceitRanks] Injecting styles...");
    injectLiveFaceitStyles();

    // Wait for page elements
    console.log("[LiveFaceitRanks] Waiting for .page element...");
    const pageContainer = await waitForElement(".page");
    console.log("[LiveFaceitRanks] Page container found:", !!pageContainer);

    // Check for team containers
    const team1Container = pageContainer.querySelector(".team1-players");
    const team2Container = pageContainer.querySelector(".team2-players");
    console.log("[LiveFaceitRanks] Team containers found:", {
      team1: !!team1Container,
      team2: !!team2Container,
    });

    if (!team1Container || !team2Container) {
      console.log(
        "[LiveFaceitRanks] Team containers not found, retrying in 2s..."
      );
      setTimeout(() => initializeLiveFaceitRanks(settings), 2000);
      return;
    }

    // Get players
    console.log("[LiveFaceitRanks] Getting players...");
    const players = await getLiveMatchPagePlayers();
    console.log("[LiveFaceitRanks] Found players:", players.length, players);

    if (players.length === 0) {
      console.log("[LiveFaceitRanks] No players found, retrying in 2s...");
      setTimeout(() => initializeLiveFaceitRanks(settings), 2000);
      return;
    }

    // Get Faceit data
    const steamIds = players.map((p) => p.steamId);
    console.log(
      "[LiveFaceitRanks] Fetching Faceit data for steam IDs:",
      steamIds
    );
    const faceitData = await getFaceitData(steamIds);
    console.log("[LiveFaceitRanks] Faceit data received:", faceitData);

    // Process players
    console.log("[LiveFaceitRanks] Processing players...");
    processPlayers(players, faceitData);

    // Setup observers
    console.log("[LiveFaceitRanks] Setting up observers...");
    setupPlayerListObservers(settings, faceitData);

    console.log("[LiveFaceitRanks] Initialization complete!");
  } catch (error) {
    console.error("[LiveFaceitRanks] Error during initialization:", error);
  }
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "showFaceitRanksOnMatchPage",
  category: "match",
  defaultValue: true,
  description: "Show Faceit ranks on live match pages",
  featureId: "liveFaceitRanks",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["playMatch"]),
    ActivationHelpers.whenEnabled("showFaceitRanksOnMatchPage")
  ),

  handler: initializeLiveFaceitRanks,
  cleanupHandler: async (settings: UserSettings) => {
    console.log("[LiveFaceitRanks] Cleaning up live faceit ranks");
    cleanupFaceitIcons();
    observers.forEach((observer) => observer.disconnect());
    observers = [];
    processedPlayers.clear();
    faceitIconMap.clear();
  },

  apiCalls: [
    {
      requestType: "get_faceit_info",
      responseType: "faceit_info_data",
    },
  ],
});
