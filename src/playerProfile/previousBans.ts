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
  if (!bans || bans.length === 0) return;

  const container = await waitForBannerContainer();

  let existingBanBadge = container.querySelector(
    ".ban-badge:not([data-clutch-extension='true'])"
  );

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
