import {
  formatDate,
  isProfilePage,
  getPlayerIdFromUrl,
  waitForElement,
} from "../utils/profileUtils";

interface Ban {
  category: string;
  severity: string;
  issued_on: string;
  expires_on: string | null;
  permanent: boolean;
}

async function fetchUserBans(steamId: string): Promise<Ban[]> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "fetchUserBans", steamId },
      (response) => {
        if (
          response &&
          response.success &&
          response.data &&
          response.data.bans
        ) {
          resolve(response.data.bans);
        } else {
          resolve([]);
        }
      }
    );
  });
}

function createBanBadge(ban: Ban): HTMLDivElement {
  const banBadge = document.createElement("div");
  banBadge.className = "ban-badge";
  banBadge.setAttribute("data-clutch-extension", "true");

  const strong1 = document.createElement("strong");
  strong1.textContent = `${ban.category} - ${ban.severity}`;

  if (ban.permanent) {
    banBadge.appendChild(document.createTextNode("Banned for "));
    banBadge.appendChild(strong1);
    banBadge.appendChild(document.createTextNode(" permanently"));
  } else if (ban.expires_on) {
    const expiryDate = new Date(ban.expires_on);
    const formattedDate = formatDate(expiryDate);

    const strong2 = document.createElement("strong");
    strong2.textContent = formattedDate;

    banBadge.appendChild(document.createTextNode("Banned for "));
    banBadge.appendChild(strong1);
    banBadge.appendChild(document.createTextNode(" until "));
    banBadge.appendChild(strong2);
  } else {
    banBadge.appendChild(document.createTextNode("Banned for "));
    banBadge.appendChild(strong1);
  }

  return banBadge;
}

function createNoBansBadge(): HTMLDivElement {
  const banBadge = document.createElement("div");
  banBadge.className = "ban-badge good";
  banBadge.setAttribute("data-clutch-extension", "true");
  banBadge.style.backgroundColor = "var(--toastify-color-success)";
  banBadge.style.color = "var(--toastify-color-light)";

  const checkSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  checkSvg.setAttribute("width", "16");
  checkSvg.setAttribute("height", "16");
  checkSvg.setAttribute("viewBox", "0 0 16 16");
  checkSvg.setAttribute("fill", "currentColor");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
  );
  checkSvg.appendChild(path);

  const textNode = document.createTextNode(" No previous bans");

  banBadge.appendChild(checkSvg);
  banBadge.appendChild(textNode);

  return banBadge;
}

function waitForBannerContainer(): Promise<Element> {
  return waitForElement(".profile-banner .container");
}

function removeBanBadges() {
  document
    .querySelectorAll("[data-clutch-extension='true'].ban-badge")
    .forEach((badge) => {
      badge.remove();
    });
}

async function renderBanBadges(bans: Ban[]): Promise<void> {
  const container = await waitForBannerContainer();

  let existingBanBadge = container.querySelector(
    ".ban-badge:not([data-clutch-extension='true'])"
  );

  if (!bans || bans.length === 0) {
    const noBansBadge = createNoBansBadge();
    container.appendChild(noBansBadge);
    return;
  }

  if (existingBanBadge) {
    bans = bans.slice(1);
  }

  bans.forEach((ban) => {
    const banBadgeElement = createBanBadge(ban);
    container.appendChild(banBadgeElement);
  });
}

export async function initialize(showBans: boolean): Promise<void> {
  if (!showBans || !isProfilePage()) {
    removeBanBadges();
    return;
  }

  removeBanBadges();

  const playerId = getPlayerIdFromUrl();
  if (!playerId) return;

  const bans = await fetchUserBans(playerId);
  await renderBanBadges(bans);
}
