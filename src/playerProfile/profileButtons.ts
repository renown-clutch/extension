import {
  getPlayerIdFromUrl,
  isProfilePage,
  waitForElement,
} from "../utils/profileUtils";

let currentPlayerId = "";
let faceitUrl: string | null = null;
let faceitElo: number | null = null;
let faceitDataPromise: Promise<{
  url: string | null;
  elo: number | null;
}> | null = null;

let csstatsButton: HTMLAnchorElement | null = null;
let faceitButton: HTMLAnchorElement | null = null;

function getExtensionUrl(path: string): string {
  const extensionId =
    chrome.runtime.id ||
    document.currentScript?.getAttribute("src")?.split("/")[2] ||
    window.location.href.match(/chrome-extension:\/\/([^\/]+)/)?.[1];
  return `chrome-extension://${extensionId}/${path}`;
}

// Function to determine the faceit level icon based on ELO
function getFaceitLevelIcon(elo: number | null): string {
  if (elo === null) return "static/faceit.svg";

  if (elo < 800) return "static/faceitlevels/lvl1.svg";
  if (elo < 950) return "static/faceitlevels/lvl2.svg";
  if (elo < 1100) return "static/faceitlevels/lvl3.svg";
  if (elo < 1250) return "static/faceitlevels/lvl4.svg";
  if (elo < 1400) return "static/faceitlevels/lvl5.svg";
  if (elo < 1550) return "static/faceitlevels/lvl6.svg";
  if (elo < 1700) return "static/faceitlevels/lvl7.svg";
  if (elo < 1850) return "static/faceitlevels/lvl8.svg";
  if (elo < 2000) return "static/faceitlevels/lvl9.svg";
  return "static/faceitlevels/lvl10.svg";
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
      className: "clutch-button1",
      href: "#",
      bgColor: "#292c34",
      iconPath: "static/csstats.svg",
    });
  }
  if (profileButtons.faceit && !faceitButton) {
    faceitButton = createButton({
      className: "clutch-button2",
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
    } else {
      faceitButton.href = "#";
      faceitButton.style.display = "none";
    }
  }
}

function removeButtons() {
  csstatsButton?.remove();
  faceitButton?.remove();
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
}

async function fetchFaceitData(
  steamId: string
): Promise<{ url: string | null; elo: number | null }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "fetchFaceitUrl", steamId },
      (response) => {
        if (response && response.success) {
          if (typeof response.data === "object") {
            const url = response.data.url || null;
            const elo = response.data.elo || null;
            resolve({ url, elo });
          } else {
            resolve({ url: null, elo: null });
          }
        } else {
          resolve({ url: null, elo: null });
        }
      }
    );
  });
}

function waitForLinksDiv(): Promise<Element> {
  return waitForElement(".profile-banner div.links");
}

export async function initialize(profileButtons: {
  csstats: boolean;
  faceit: boolean;
}): Promise<void> {
  // Clean up previous buttons
  removeButtons();

  // If we're not on a profile page or no buttons enabled, we're done
  if (!isProfilePage() || (!profileButtons.csstats && !profileButtons.faceit)) {
    return;
  }

  // Set up buttons for current profile
  const playerId = getPlayerIdFromUrl();
  if (!playerId) return;

  currentPlayerId = playerId;
  ensureButtons(profileButtons);
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
    console.error("Error initializing profile buttons:", error);
  }
}
