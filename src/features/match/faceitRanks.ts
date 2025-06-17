import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { createFaceitBadgeElement } from "$utils/data/faceitUtils";
import { waitForElements } from "$utils/profileUtils";
import { waitForHydrationComplete } from "$utils/ui/hydrationUtils";
import { getCurrentPage } from "$utils/common/pageUtils";
import { applyPresetAnimation } from "$utils/ui/animationUtils";
import browserAPI from "$system/lib/browserAPI";

interface FaceitInfo {
  elo?: number;
  url?: string;
}

interface PlayerData {
  steamId: string;
  element: HTMLElement;
}

const cleanupFaceitIcons = () => {
  document
    .querySelectorAll("[data-clutch-extension='faceit-badge-match-page']")
    .forEach((element) => {
      element?.parentNode?.removeChild(element);
    });

  // Remove injected CSS when cleaning up
  const styleElement = document.getElementById("clutch-faceit-ranks-styles");
  if (styleElement) {
    styleElement.remove();
  }
};

const normalizePlayerNameWidths = () => {
  // Find all team stats tables
  const teamTables = document.querySelectorAll(".team-stats-table");

  teamTables.forEach((table) => {
    // Find all player name elements within this table
    const players = table.querySelectorAll(".row .player");
    let maxWidth = 0;

    // First pass: find the maximum width
    players.forEach((player) => {
      if (player) {
        const width = player.getBoundingClientRect().width;
        maxWidth = Math.max(maxWidth, width);
      }
    });

    // Apply the grid template to both header and rows if we found a valid width
    if (maxWidth > 0) {
      // Find and adjust the header's grid template
      const header = table.querySelector(".header") as HTMLElement;
      if (header) {
        // Count the number of columns by getting the number of children in header
        const columnCount = header.children.length;
        // Use columnCount - 1 for the repeat value (subtracting the player name column)
        header.style.gridTemplateColumns = `${maxWidth}px repeat(${
          columnCount - 1
        }, 1fr)`;
      }

      // Find and adjust all row elements
      const rows = table.querySelectorAll(".row");
      const columnCount =
        (table.querySelector(".header")?.children.length || 13) - 1;
      rows.forEach((row) => {
        (
          row as HTMLElement
        ).style.gridTemplateColumns = `${maxWidth}px repeat(${columnCount}, 1fr)`;
      });
    }
  });
};

const processPlayers = (
  players: PlayerData[],
  faceitData: Record<string, FaceitInfo>
): void => {
  cleanupFaceitIcons();

  players.forEach(({ element, steamId }, index) => {
    const badgeSize = 25;

    const faceitInfo = faceitData[steamId];

    const faceitBadge = createFaceitBadgeElement(
      faceitInfo?.elo || null,
      badgeSize,
      true,
      "",
      "faceit-badge-match-page",
      faceitInfo?.url || ""
    );

    // Apply entrance animation
    applyPresetAnimation(faceitBadge, "faceitBadge");

    if (element.firstElementChild?.nextElementSibling) {
      element.insertBefore(
        faceitBadge,
        element.firstElementChild.nextElementSibling
      );
    } else {
      element.appendChild(faceitBadge);
    }
  });

  normalizePlayerNameWidths();
};

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
          const lastError =
            typeof chrome !== "undefined"
              ? chrome.runtime.lastError
              : typeof browser !== "undefined"
              ? browser.runtime.lastError
              : null;
          if (lastError) {
            console.warn("Faceit data fetch failed:", lastError.message);
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

async function initializeFaceitRanks(settings: UserSettings): Promise<void> {
  console.log("[FaceitRanks] Initializing with settings:", {
    showFaceitRanksOnMatchPage: settings.showFaceitRanksOnMatchPage,
    currentUrl: window.location.href,
    currentPage: getCurrentPage(),
  });

  if (!settings.showFaceitRanksOnMatchPage) {
    console.log("[FaceitRanks] Feature disabled in settings");
    cleanupFaceitIcons();
    return;
  }

  try {
    console.log("[FaceitRanks] Waiting for hydration...");
    // Wait for hydration to complete before proceeding
    await waitForHydrationComplete();

    console.log("[FaceitRanks] Getting players...");
    const players = await getMatchPagePlayers();
    if (!players.length) {
      console.log("[FaceitRanks] No players found on page");
      return;
    }

    console.log(`[FaceitRanks] Found ${players.length} players`);
    const faceitData = await getFaceitData(players.map((p) => p.steamId));

    processPlayers(players, faceitData);
  } catch (error) {
    console.error("[FaceitRanks] Error in initialization:", error);
  }
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "showFaceitRanksOnMatchPage",
  category: "match",
  defaultValue: true,
  description: "Show Faceit ranks on match pages",
  featureId: "matchPageFaceitRanks",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["matchPage"]),
    ActivationHelpers.whenEnabled("showFaceitRanksOnMatchPage")
  ),

  handler: initializeFaceitRanks,
  cleanupHandler: async (settings: UserSettings) => {
    console.log("[FaceitRanks] Cleaning up faceit ranks");
    cleanupFaceitIcons();
  },

  apiCalls: [
    {
      requestType: "get_faceit_info",
      responseType: "faceit_info_data",
    },
  ],
});
