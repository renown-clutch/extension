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
      console.log("removing ban badge", badge);
      badge.remove();
    });
}

async function renderBanBadges(bans: Ban[]): Promise<void> {
  console.log("renderBanBadges", bans);
  console.log("bans length", bans.length);

  if (!bans || bans.length === 0) return;

  const container = await waitForBannerContainer();
  console.log("container", container);

  // Check if there's already a ban badge from the site
  let existingBanBadge = container.querySelector(
    ".ban-badge:not([data-clutch-extension='true'])"
  );

  // if there's already a ban badge from the site, we skip first ban from response
  if (existingBanBadge) {
    bans = bans.slice(1);
  }

  bans.forEach((ban) => {
    const banBadgeElement = createBanBadge(ban);
    console.log("banBadgeElement created");
    container.appendChild(banBadgeElement);
    console.log("banBadgeElement appended");
  });
}

export async function initialize(showBans: boolean): Promise<void> {
  console.log("initialize ban badges", showBans);

  if (!showBans || !isProfilePage()) {
    removeBanBadges();
    return;
  }

  removeBanBadges();
  console.log("ban_badges removed");

  const playerId = getPlayerIdFromUrl();
  console.log("playerId", playerId);
  if (!playerId) return;

  const bans = await fetchUserBans(playerId);
  console.log("bans", bans);
  await renderBanBadges(bans);
  console.log("ban_badges rendered");
}
