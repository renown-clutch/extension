import { getFaceitLevel } from "../utils/faceitUtils";
import type { UserSettings } from "$lib/types";
import { waitForElements } from "../utils/profileUtils";

interface FaceitInfo {
  elo?: number;
  url?: string;
}

interface PlayerElement {
  element: HTMLElement;
  steamId: string;
}

const isMatchPage = (): boolean => window.location.pathname.includes("/match/");

const getLevelIconPath = (level: number): string =>
  chrome.runtime.getURL(`static/faceitlevels/lvl${level}.svg`);

const getFallbackIconPath = (): string =>
  chrome.runtime.getURL("static/faceitlevels/lvlx.svg");

const cleanupFaceitIcons = () => {
  document.querySelectorAll(".faceit-icon").forEach((element) => {
    element?.parentNode?.removeChild(element);
  });
};

const getFaceitData = async (
  steamIds: string[]
): Promise<Record<string, FaceitInfo>> => {
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
};

const createTooltipElement = (text: string): HTMLElement => {
  const tooltip = document.createElement("div");
  tooltip.className = "clutch-tooltip";
  tooltip.textContent = text;
  Object.assign(tooltip.style, {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "white",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    whiteSpace: "nowrap",
    zIndex: "9999",
    pointerEvents: "none",
    opacity: "0",
    transition: "opacity 0.1s",
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    marginBottom: "5px",
  });
  return tooltip;
};

const getFaceitDisplayInfo = (faceitInfo: FaceitInfo | undefined) => {
  if (!faceitInfo?.elo) {
    return {
      levelIconPath: getFallbackIconPath(),
      tooltipText: "No Faceit profile found",
      profileUrl: undefined,
    };
  }

  const faceitLevel = getFaceitLevel(faceitInfo.elo);
  return {
    levelIconPath: getLevelIconPath(faceitLevel),
    tooltipText: `Faceit Level ${faceitLevel} (ELO: ${faceitInfo.elo})`,
    profileUrl: faceitInfo.url,
  };
};

const createFaceitIcon = (
  steamId: string,
  faceitInfo: FaceitInfo | undefined,
  dimensions: { width: number; height: number }
): HTMLElement => {
  const { levelIconPath, tooltipText, profileUrl } =
    getFaceitDisplayInfo(faceitInfo);

  const faceitIcon = document.createElement(profileUrl ? "a" : "div");
  faceitIcon.className = "tooltip-wrapper faceit-icon";
  faceitIcon.setAttribute("tabindex", "0");
  faceitIcon.setAttribute("data-steam-id", steamId);
  faceitIcon.style.position = "relative";

  if (profileUrl) {
    faceitIcon.setAttribute("href", profileUrl);
    faceitIcon.setAttribute("target", "_blank");
    faceitIcon.style.cursor = "pointer";
  }

  const icon = document.createElement("img");
  icon.src = levelIconPath;
  icon.width = dimensions.width;
  icon.height = dimensions.height;
  icon.alt = tooltipText;
  icon.style.display = "inline-block";

  const tooltip = createTooltipElement(tooltipText);

  faceitIcon.appendChild(icon);
  faceitIcon.appendChild(tooltip);

  faceitIcon.addEventListener(
    "mouseenter",
    () => (tooltip.style.opacity = "1")
  );
  faceitIcon.addEventListener(
    "mouseleave",
    () => (tooltip.style.opacity = "0")
  );

  return faceitIcon;
};

const processTeamStatsTables = async () => {
  const teamStatsTables = await waitForElements(".team-stats-table");
  if (!(teamStatsTables instanceof NodeList) || !teamStatsTables.length) return;

  const players: PlayerElement[] = [];
  teamStatsTables.forEach((table: Element) => {
    table.querySelectorAll(".row .player").forEach((playerLink: Element) => {
      const href = playerLink.getAttribute("href");
      if (href?.startsWith("/profile/")) {
        players.push({
          element: playerLink as HTMLElement,
          steamId: href.replace("/profile/", ""),
        });
      }
    });
  });

  if (players.length) {
    const faceitData = await getFaceitData(players.map((p) => p.steamId));
    players.forEach(({ element, steamId }) => {
      const dimensions = { width: 34, height: 34 };
      const avatarWrapper = element.querySelector(".avatar-wrapper");
      const avatarImg = avatarWrapper?.querySelector("img");
      if (avatarImg) {
        dimensions.width = avatarImg.width || dimensions.width;
        dimensions.height = avatarImg.height || dimensions.height;
      }

      const existingIcon = element.querySelector(".faceit-icon");
      if (existingIcon) {
        const { levelIconPath, tooltipText, profileUrl } = getFaceitDisplayInfo(
          faceitData[steamId]
        );
        const img = existingIcon.querySelector("img");
        const tooltip = existingIcon.querySelector(".clutch-tooltip");
        if (img) img.src = levelIconPath;
        if (tooltip) tooltip.textContent = tooltipText;
        if (profileUrl && existingIcon instanceof HTMLAnchorElement) {
          existingIcon.href = profileUrl;
        }
        return;
      }

      const faceitIcon = createFaceitIcon(
        steamId,
        faceitData[steamId],
        dimensions
      );
      if (element.firstElementChild?.nextElementSibling) {
        element.insertBefore(
          faceitIcon,
          element.firstElementChild.nextElementSibling
        );
      } else {
        element.appendChild(faceitIcon);
      }
    });
  }
};

export function initializeFaceitRanks(userSettings: UserSettings) {
  if (!isMatchPage()) {
    return;
  }

  if (!userSettings.showFaceitRanksOnMatchPage) {
    cleanupFaceitIcons();
    return;
  }

  processTeamStatsTables();
}
