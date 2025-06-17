import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import {
  getPlayerIdFromUrl,
  isProfilePage,
  waitForElement,
} from "$utils/profileUtils";
import { getFaceitLevelIcon } from "$utils/data/faceitUtils";
import browserAPI from "$system/lib/browserAPI";
import { getCurrentPage, is404Page } from "$utils/common/pageUtils";

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
  button.className = `${className} clutch-profile-button clutch-animate-fade-in-scale`;
  button.target = "_blank";
  button.href = href;
  button.style.display = visible ? "flex" : "none";
  button.setAttribute("data-clutch-extension", "profile-button");

  if (!href) {
    button.classList.add("disabled");
  }

  const img = document.createElement("img");
  img.src = browserAPI.runtime.getURL(iconPath);
  button.appendChild(img);

  return button;
}

function removeButton(className: string) {
  const buttonsInDom = document.querySelectorAll(className);
  buttonsInDom.forEach((button) => button.remove());
}

async function appendButtonsToDom(settings: UserSettings) {
  const linksDiv = await waitForElement(".profile-banner .links");
  if (!linksDiv) {
    return;
  }

  const playerId = getPlayerIdFromUrl();
  if (!playerId) {
    return;
  }

  let csstatsButton = null;
  let faceitButton = null;

  // Handle Faceit button
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

  // Handle CSStats button
  const existingCsstatsButton = document.querySelector(
    ".clutch-csstats-button"
  );
  if (settings.csstatsProfileButton && !existingCsstatsButton) {
    try {
      csstatsButton = createButton({
        className: "clutch-csstats-button",
        href: `https://csstats.gg/player/${playerId}`,
        bgColor: "#292c34",
        iconPath: "assets/graphics/csstats.svg",
      });
    } catch (error) {}
  }

  // Append buttons to DOM
  if (csstatsButton) {
    linksDiv.appendChild(csstatsButton);
  }

  if (faceitButton) {
    linksDiv.appendChild(faceitButton);
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

function cleanupProfileButtons() {
  const existingButtons = document.querySelectorAll(
    '[data-clutch-extension="profile-button"]'
  );
  existingButtons.forEach((button) => button.remove());
}

async function initializeProfileButtons(settings: UserSettings): Promise<void> {
  if (!isProfilePage()) {
    return;
  }

  if (is404Page()) {
    return;
  }

  const existingCsstatsButton = document.querySelector(
    ".clutch-csstats-button"
  );
  const existingFaceitButton = document.querySelector(".clutch-faceit-button");

  // Handle CSStats button
  if (!settings.csstatsProfileButton && existingCsstatsButton) {
    existingCsstatsButton.remove();
  }

  // Handle Faceit button
  if (!settings.faceitProfileButton && existingFaceitButton) {
    existingFaceitButton.remove();
  }

  // If both are disabled, we're done
  if (!settings.csstatsProfileButton && !settings.faceitProfileButton) {
    return;
  }

  // Add missing enabled buttons
  const needsCsstats = settings.csstatsProfileButton && !existingCsstatsButton;
  const needsFaceit = settings.faceitProfileButton && !existingFaceitButton;

  if (needsCsstats || needsFaceit) {
    await appendButtonsToDom(settings);
  }
}

registerFeature({
  settingKey: "csstatsProfileButton",
  category: "profile",
  defaultValue: false,
  description: "Show CSStats profile button",
  handler: initializeProfileButtons,
  cleanupHandler: cleanupProfileButtons,
  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["profile"]),
    (currentPage, settings) =>
      settings.csstatsProfileButton || settings.faceitProfileButton
  ),
  dependsOn: ["faceitProfileButton"],
});

registerFeature({
  settingKey: "faceitProfileButton",
  category: "profile",
  defaultValue: false,
  description: "Show Faceit profile button",
  handler: initializeProfileButtons,
  cleanupHandler: cleanupProfileButtons,
  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["profile"]),
    (currentPage, settings) =>
      settings.csstatsProfileButton || settings.faceitProfileButton
  ),
  dependsOn: ["csstatsProfileButton"],
  apiCalls: [
    { requestType: "get_faceit_info", responseType: "faceitInfoResponse" },
  ],
});
