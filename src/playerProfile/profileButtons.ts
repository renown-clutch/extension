import {
  getPlayerIdFromUrl,
  isProfilePage,
  waitForElement,
} from "../utils/profileUtils";
import { getFaceitLevelIcon } from "../utils/faceitUtils";
import browserAPI from "../lib/browserAPI";
import { type UserSettings } from "../lib/types";
import { getExtensionUrl } from "../utils/staticUtils";

function createButton({
  className,
  href,
  bgColor,
  iconPath,
  visible = true,
}: {
  className: string;
  href: string;
  bgColor: string;
  iconPath: string;
  visible?: boolean;
}): HTMLAnchorElement {
  const button = document.createElement("a");
  button.className = className;
  button.target = "_blank";
  button.href = href;
  button.style.display = visible ? "flex" : "none";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.height = "40px";
  button.style.width = "40px";
  button.style.borderRadius = "4px";
  button.style.color = "#000";
  button.style.backgroundColor = bgColor;
  button.setAttribute("data-clutch-extension", "true");
  button.addEventListener("mouseover", () => {
    button.style.backgroundColor =
      bgColor === "#292c34" ? "#333640" : "#ffb74d";
  });
  button.addEventListener("mouseout", () => {
    button.style.backgroundColor = bgColor;
  });
  const img = document.createElement("img");
  img.src = getExtensionUrl(iconPath);
  img.style.width = "24px";
  img.style.height = "24px";
  button.appendChild(img);
  return button;
}

function removeButton(className: string) {
  const buttonsInDom = document.querySelectorAll(className);
  buttonsInDom.forEach((button) => button.remove());
}

async function appendButtonsToDom(settings: UserSettings) {
  const linksDiv = document.querySelector(".profile-banner div.links");
  if (!linksDiv) return;

  const playerId = getPlayerIdFromUrl();
  if (!playerId) return;

  let faceitButton: HTMLAnchorElement | null = null;
  let csstatsButton: HTMLAnchorElement | null = null;

  const existingFaceitButton = document.querySelector(".clutch-faceit-button");

  if (settings.faceitProfileButton && !existingFaceitButton) {
    const faceitData = await fetchFaceitData(playerId);
    const faceitIcon = getFaceitLevelIcon(faceitData.elo);

    faceitButton = createButton({
      className: "clutch-faceit-button",
      href: faceitData.url || "#",
      bgColor: "#141616",
      iconPath: faceitIcon,
    });
  }

  const existingCsstatsButton = document.querySelector(
    ".clutch-csstats-button"
  );

  if (settings.csstatsProfileButton && !existingCsstatsButton) {
    csstatsButton = createButton({
      className: "clutch-csstats-button",
      href: `https://csstats.gg/player/${playerId}`,
      bgColor: "#292c34",
      iconPath: "static/csstats.svg",
    });
    linksDiv.appendChild(csstatsButton);
  }

  if (faceitButton) {
    linksDiv.appendChild(faceitButton);
  }
  if (csstatsButton) {
    linksDiv.appendChild(csstatsButton);
  }
}

async function fetchFaceitData(
  steamId: string
): Promise<{ url: string | null; elo: number | null }> {
  return new Promise((resolve) => {
    try {
      // Use browserAPI with proper response handling
      browserAPI.runtime.sendMessage(
        { type: "get_faceit_info", steam_ids: [steamId] },
        (response) => {
          if (response && Object.keys(response).length > 0) {
            const faceitData = response[steamId];
            if (faceitData) {
              const url = faceitData.url || null;
              const elo = faceitData.elo || null;
              resolve({ url, elo });
            } else {
              resolve({ url: null, elo: null });
            }
          } else {
            resolve({ url: null, elo: null });
          }
        }
      );
    } catch (error) {
      console.warn("Error in faceit data fetch:", error);
      resolve({ url: null, elo: null });
    }
  });
}

export async function initialize(settings: UserSettings): Promise<void> {
  if (!isProfilePage()) {
    return;
  }
  if (!settings.csstatsProfileButton) {
    removeButton(".clutch-csstats-button");
  }
  if (!settings.faceitProfileButton) {
    removeButton(".clutch-faceit-button");
  }

  await appendButtonsToDom(settings);
}
