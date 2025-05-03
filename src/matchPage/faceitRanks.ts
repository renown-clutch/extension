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
      console.log("Removing faceit badge match page", element);
      element?.parentNode?.removeChild(element);
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
    if (!faceitInfo?.elo) return;

    const faceitBadge = createFaceitBadgeElement(
      faceitInfo.elo,
      badgeSize,
      true
    );

    if (faceitInfo.url) {
      const link = document.createElement("a");
      link.href = faceitInfo.url;
      link.target = "_blank";
      link.style.cursor = "pointer";
      link.setAttribute("data-clutch-extension", "faceit-badge-match-page");
      link.appendChild(faceitBadge);

      if (element.firstElementChild?.nextElementSibling) {
        element.insertBefore(
          link,
          element.firstElementChild.nextElementSibling
        );
      } else {
        element.appendChild(link);
      }
    } else {
      if (element.firstElementChild?.nextElementSibling) {
        element.insertBefore(
          faceitBadge,
          element.firstElementChild.nextElementSibling
        );
      } else {
        element.appendChild(faceitBadge);
      }
    }
  });
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
