import {
  getPlayerIdFromUrl,
  isProfilePage,
  waitForElement,
} from "../utils/profileUtils";

let currentPlayerId = "";
let faceitUrl: string | null = null;
let faceitUrlPromise: Promise<string | null> | null = null;

let csstatsButton: HTMLAnchorElement | null = null;
let faceitButton: HTMLAnchorElement | null = null;

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

function updateButtonHrefs(playerId: string, faceitUrl: string | null) {
  if (csstatsButton) {
    csstatsButton.href = `https://csstats.gg/player/${playerId}`;
    csstatsButton.style.display = "flex";
  }
  if (faceitButton) {
    if (faceitUrl) {
      faceitButton.href = faceitUrl;
      faceitButton.style.display = "flex";
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

async function fetchFaceitUrl(steamId: string): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "fetchFaceitUrl", steamId },
      (response) => {
        if (response && response.success) {
          if (typeof response.data === "string") {
            resolve(response.data);
          } else if (
            typeof response.data === "object" &&
            response.data.faceit_url
          ) {
            resolve(response.data.faceit_url);
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
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
  updateButtonHrefs(currentPlayerId, null);

  try {
    // Wait for the container to be available
    await waitForLinksDiv();
    appendButtonsToDom();

    // Fetch and update Faceit URL if needed
    if (profileButtons.faceit) {
      faceitUrlPromise = fetchFaceitUrl(currentPlayerId);
      faceitUrl = await faceitUrlPromise;
      updateButtonHrefs(currentPlayerId, faceitUrl);
      appendButtonsToDom();
    }
  } catch (error) {
    console.error("Error initializing profile buttons:", error);
  }
}
