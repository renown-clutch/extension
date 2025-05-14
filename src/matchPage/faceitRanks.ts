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

    // Second pass: apply the maximum width to all player names
    if (maxWidth > 0) {
      players.forEach((player) => {
        if (player) {
          (player as HTMLElement).style.minWidth = `${maxWidth}px`;
        }
      });

      // Find and adjust the header's grid template
      const header = table.querySelector(".header") as HTMLElement;
      if (header) {
        // Use the exact pixel width for the first column
        header.style.gridTemplateColumns = `${maxWidth}px repeat(13, 1fr)`;
      }
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
