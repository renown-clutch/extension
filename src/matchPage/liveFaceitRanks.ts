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

export async function initializeLiveFaceitRanks(
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
