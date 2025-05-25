import {
  getPlayerIdFromUrl,
  isProfilePage,
  waitForElement,
} from "../utils/profileUtils";
import { getFaceitLevelIcon } from "../utils/faceitUtils";
import browserAPI from "../lib/browserAPI";
import { type UserSettings } from "../lib/types";
import { getExtensionUrl } from "../utils/staticUtils";
import { is404Page } from "../utils/pageUtils";

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
  button.className = `${className} clutch-profile-button`;
  button.target = "_blank";
  button.href = href;
  button.style.display = visible ? "flex" : "none";
  button.setAttribute("data-clutch-extension", "true");

  if (!href) {
    button.classList.add("disabled");
  }

  const img = document.createElement("img");
  img.src = getExtensionUrl(iconPath);
  button.appendChild(img);
  return button;
}

function removeButton(className: string) {
  const buttonsInDom = document.querySelectorAll(className);
  buttonsInDom.forEach((button) => button.remove());
}

function removeProfileButtonsCSS() {
  const styleElement = document.getElementById("clutch-profile-buttons-styles");
  if (styleElement) {
    styleElement.remove();
  }
}

async function appendButtonsToDom(settings: UserSettings) {
  const linksDiv = await waitForElement(".profile-banner div.links");

  if (!linksDiv) {
    return;
  }

  const playerId = getPlayerIdFromUrl();

  if (!playerId) {
    return;
  }

  let faceitButton: HTMLAnchorElement | null = null;
  let csstatsButton: HTMLAnchorElement | null = null;

  const existingFaceitButton = document.querySelector(".clutch-faceit-button");

  if (settings.faceitProfileButton && !existingFaceitButton) {
    const faceitData = await fetchFaceitData(playerId);

    const faceitIcon = getFaceitLevelIcon(faceitData.elo);

    try {
      faceitButton = createButton({
        className: "clutch-faceit-button",
        href: faceitData.url || "",
        bgColor: "#141616",
        iconPath: faceitIcon,
      });
    } catch (error) {}
  }

  const existingCsstatsButton = document.querySelector(
    ".clutch-csstats-button"
  );

  if (settings.csstatsProfileButton && !existingCsstatsButton) {
    try {
      csstatsButton = createButton({
        className: "clutch-csstats-button",
        href: `https://csstats.gg/player/${playerId}`,
        bgColor: "#292c34",
        iconPath: "static/csstats.svg",
      });
      linksDiv.appendChild(csstatsButton);
    } catch (error) {}
  }

  if (faceitButton) {
    try {
      linksDiv.appendChild(faceitButton);
    } catch (error) {}
  }
}

async function fetchFaceitData(
  steamId: string
): Promise<{ url: string | null; elo: number | null }> {
  return new Promise((resolve) => {
    try {
      const timeoutId = setTimeout(() => {
        resolve({ url: null, elo: null });
      }, 10000);

      browserAPI.runtime.sendMessage(
        { type: "get_faceit_info", steam_ids: [steamId] },
        (response) => {
          clearTimeout(timeoutId);

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
      resolve({ url: null, elo: null });
    }
  });
}

export async function initializeProfileButtons(
  settings: UserSettings
): Promise<void> {
  if (!isProfilePage()) {
    return;
  }

  if (!settings.csstatsProfileButton) {
    removeButton(".clutch-csstats-button");
  }

  if (!settings.faceitProfileButton) {
    removeButton(".clutch-faceit-button");
  }

  if (!settings.csstatsProfileButton && !settings.faceitProfileButton) {
    removeProfileButtonsCSS();
    return;
  }

  if (is404Page()) {
    return;
  }

  await appendButtonsToDom(settings);
}
