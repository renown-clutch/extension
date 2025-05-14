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

const cleanupFaceitIcons = () => {
  document
    .querySelectorAll("[data-clutch-extension='faceit-badge-match-page']")
    .forEach((element) => {
      element?.parentNode?.removeChild(element);
    });
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

  players.forEach(({ element, steamId }) => {
    const badgeSize = 25;

    const faceitInfo = faceitData[steamId];

    const faceitBadge = createFaceitBadgeElement(
      faceitInfo.elo || null,
      badgeSize,
      true,
      "",
      "faceit-badge-match-page",
      faceitInfo.url || ""
    );

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

export async function initializeFaceitRanks(
  userSettings: UserSettings,
  players: PlayerData[],
  faceitData: Record<string, FaceitInfo>
): Promise<void> {
  if (!userSettings.showFaceitRanksOnMatchPage) {
    cleanupFaceitIcons();
    return;
  }

  processPlayers(players, faceitData);
}
