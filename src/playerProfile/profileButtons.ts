import {
  getPlayerIdFromUrl,
  isProfilePage,
  waitForElement,
} from "../utils/profileUtils";
import { getFaceitLevelIcon, getFaceitLevel } from "../utils/faceitUtils";

let currentPlayerId = "";
let faceitUrl: string | null = null;
let faceitElo: number | null = null;

let faceitDataPromise: Promise<{
  url: string | null;
  elo: number | null;
}> | null = null;

let csstatsButton: HTMLAnchorElement | null = null;
let faceitButton: HTMLAnchorElement | null = null;
let buttonObserver: MutationObserver | null = null;

function getExtensionUrl(path: string): string {
  const extensionId =
    chrome.runtime.id ||
    document.currentScript?.getAttribute("src")?.split("/")[2] ||
    window.location.href.match(/chrome-extension:\/\/([^\/]+)/)?.[1];
  return `chrome-extension://${extensionId}/${path}`;
}

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

function ensureButtons(profileButtons: {
  csstats: boolean;
  faceit: boolean;
}): void {
  if (profileButtons.csstats && !csstatsButton) {
    csstatsButton = createButton({
      className: "clutch-csstats-button",
      href: "#",
      bgColor: "#292c34",
      iconPath: "static/csstats.svg",
    });
  }
  if (profileButtons.faceit && !faceitButton) {
    faceitButton = createButton({
      className: "clutch-faceit-button",
      href: "#",
      bgColor: "#141616",
      iconPath: "static/faceit.svg",
      visible: false,
    });
  }
}

function updateButtonHrefs(
  playerId: string,
  faceitData: { url: string | null; elo: number | null }
) {
  if (csstatsButton) {
    csstatsButton.href = `https://csstats.gg/player/${playerId}`;
    csstatsButton.style.display = "flex";
  }
  if (faceitButton) {
    if (faceitData.url) {
      faceitButton.href = faceitData.url;
      faceitButton.style.display = "flex";

      // Update the faceit button icon based on ELO
      const img = faceitButton.querySelector("img");
      if (img) {
        img.src = getExtensionUrl(getFaceitLevelIcon(faceitData.elo));
      }

      // Update tooltip based on whether we have ELO data or not
      if (faceitData.elo) {
        faceitButton.title = `Faceit Level ${getFaceitLevel(
          faceitData.elo
        )} (ELO: ${faceitData.elo})`;
      } else {
        faceitButton.title = "No Faceit CS2 record found";
      }
    } else {
      faceitButton.href = "#";
      faceitButton.style.display = "none";
    }
  }
}

function removeButtons() {
  // Find and remove buttons from DOM if they exist
  const buttonsInDom = document.querySelectorAll(
    '[data-clutch-extension="true"]'
  );
  buttonsInDom.forEach((button) => button.remove());

  // Reset button references
  csstatsButton = null;
  faceitButton = null;

  // Disconnect any existing observer
  if (buttonObserver) {
    buttonObserver.disconnect();
    buttonObserver = null;
  }
}

function appendButtonsToDom() {
  const linksDiv = document.querySelector(".profile-banner div.links");
  if (!linksDiv) return;

  if (csstatsButton && !linksDiv.contains(csstatsButton)) {
    linksDiv.appendChild(csstatsButton);
  }
  if (
    faceitButton &&
    !linksDiv.contains(faceitButton) &&
    faceitButton.style.display !== "none"
  ) {
    linksDiv.appendChild(faceitButton);
  }

  // Set up mutation observer to detect if our div gets replaced
  setupButtonObserver(linksDiv);
}

function setupButtonObserver(linksDiv: Element) {
  // Only set up the observer once
  if (buttonObserver) return;

  // We need to observe the parent element to detect if linksDiv gets replaced
  const parent = linksDiv.parentElement;
  if (!parent) return;

  buttonObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        // Check if our buttons were removed or if the links div was replaced
        const currentLinksDiv = document.querySelector(
          ".profile-banner div.links"
        );
        if (!currentLinksDiv) continue;

        // If there are no extension buttons in the current links div, re-inject them
        const hasButtons = currentLinksDiv.querySelector(
          '[data-clutch-extension="true"]'
        );
        if (!hasButtons) {
          appendButtonsToDom();
        }
      }
    }
  });

  buttonObserver.observe(parent, {
    childList: true,
    subtree: true,
  });
}

async function fetchFaceitData(
  steamId: string
): Promise<{ url: string | null; elo: number | null }> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: "get_faceit_info", steam_ids: [steamId] },
        (response) => {
          // Check for runtime error (like extension context invalidated)
          if (chrome.runtime.lastError) {
            console.warn(
              "Faceit data fetch failed:",
              chrome.runtime.lastError.message
            );
            resolve({ url: null, elo: null });
            return;
          }

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

function waitForLinksDiv(): Promise<Element> {
  return waitForElement(".profile-banner div.links");
}

export async function initialize(profileButtons: {
  csstats?: boolean;
  faceit?: boolean;
}): Promise<void> {
  try {
    // Clean up previous buttons
    removeButtons();

    // If we're not on a profile page or no buttons enabled, we're done
    if (
      !isProfilePage() ||
      (!profileButtons.csstats && !profileButtons.faceit)
    ) {
      return;
    }

    // Set up buttons for current profile
    const playerId = getPlayerIdFromUrl();
    if (!playerId) return;

    currentPlayerId = playerId;
    ensureButtons({
      csstats: profileButtons.csstats ?? false,
      faceit: profileButtons.faceit ?? false,
    });
    updateButtonHrefs(currentPlayerId, { url: null, elo: null });

    try {
      // Wait for the container to be available
      await waitForLinksDiv();
      appendButtonsToDom();

      // Fetch and update Faceit data if needed
      if (profileButtons.faceit) {
        faceitDataPromise = fetchFaceitData(currentPlayerId);
        const faceitData = await faceitDataPromise;
        faceitUrl = faceitData.url;
        faceitElo = faceitData.elo;
        updateButtonHrefs(currentPlayerId, faceitData);
        appendButtonsToDom();
      }
    } catch (error) {
      // Handle specific extension context invalidated error
      if (
        error instanceof Error &&
        error.message.includes("Extension context invalidated")
      ) {
        console.warn(
          "Extension context was invalidated. This usually happens during extension reload or update."
        );
      } else {
        console.error("Error initializing profile buttons:", error);
      }
    }
  } catch (error) {
    // Catch any unexpected top-level errors
    console.warn("Top-level error in profile buttons initialization:", error);
  }
}
