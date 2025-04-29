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
  duration_days: number | null;
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
  banBadge.setAttribute("data-clutch-extension", "ban-element");
  banBadge.style.padding = "8px 12px";
  banBadge.style.margin = "0 8px 0 0";
  banBadge.style.fontSize = "12px";
  banBadge.style.backgroundColor = "transparent";
  banBadge.style.border = "1px solid var(--toastify-color-error)";

  // Add tooltip with date information
  const issuedDate = new Date(ban.issued_on);
  const formattedIssuedDate = formatDate(issuedDate);

  if (ban.permanent) {
    banBadge.title = `Issued on: ${formattedIssuedDate}`;
  } else if (ban.expires_on) {
    const expiryDate = new Date(ban.expires_on);
    const formattedExpiryDate = formatDate(expiryDate);
    banBadge.title = `${formattedIssuedDate} - ${formattedExpiryDate}`;
  }

  const strong1 = document.createElement("strong");

  if (ban.permanent) {
    strong1.textContent = `${ban.category} - ${ban.severity}`;
    banBadge.appendChild(document.createTextNode("Banned for "));
    banBadge.appendChild(strong1);
    banBadge.appendChild(document.createTextNode(" permanently"));
  } else if (ban.duration_days) {
    strong1.textContent = `${ban.category} - ${ban.severity} (${ban.duration_days} Days)`;
    banBadge.appendChild(document.createTextNode("Banned for "));
    banBadge.appendChild(strong1);
  } else if (ban.expires_on) {
    // Fallback to the old format if duration_days is not available
    const expiryDate = new Date(ban.expires_on);
    const formattedDate = formatDate(expiryDate);

    strong1.textContent = `${ban.category} - ${ban.severity}`;
    const strong2 = document.createElement("strong");
    strong2.textContent = formattedDate;

    banBadge.appendChild(document.createTextNode("Banned for "));
    banBadge.appendChild(strong1);
    banBadge.appendChild(document.createTextNode(" until "));
    banBadge.appendChild(strong2);
  } else {
    strong1.textContent = `${ban.category} - ${ban.severity}`;
    banBadge.appendChild(document.createTextNode("Banned for "));
    banBadge.appendChild(strong1);
  }

  return banBadge;
}

function createNoBansBadge(): HTMLDivElement {
  const banBadge = document.createElement("div");
  banBadge.className = "ban-badge good";
  banBadge.setAttribute("data-clutch-extension", "ban-element");
  banBadge.style.backgroundColor = "var(--toastify-color-success)";
  banBadge.style.color = "var(--toastify-color-light)";
  banBadge.style.padding = "8px 12px";
  banBadge.style.margin = "0 4px 0 0";
  banBadge.style.fontSize = "12px";
  banBadge.style.lineHeight = "16px";
  banBadge.style.maxWidth = "160px";
  banBadge.style.justifyContent = "center";
  banBadge.style.display = "flex";
  banBadge.style.alignItems = "center";

  // Create badge-check SVG from Lucide
  const badgeCheckSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  badgeCheckSvg.setAttribute("width", "16");
  badgeCheckSvg.setAttribute("height", "16");
  badgeCheckSvg.setAttribute("viewBox", "0 0 24 24");
  badgeCheckSvg.setAttribute("fill", "none");
  badgeCheckSvg.setAttribute("stroke", "currentColor");
  badgeCheckSvg.setAttribute("stroke-width", "2");
  badgeCheckSvg.setAttribute("stroke-linecap", "round");
  badgeCheckSvg.setAttribute("stroke-linejoin", "round");
  badgeCheckSvg.style.verticalAlign = "middle";
  badgeCheckSvg.style.marginRight = "6px";

  // Badge-check path
  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute(
    "d",
    "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
  );

  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.setAttribute("d", "m9 12 2 2 4-4");

  badgeCheckSvg.appendChild(path1);
  badgeCheckSvg.appendChild(path2);

  const textNode = document.createTextNode(" No previous bans");

  banBadge.appendChild(badgeCheckSvg);
  banBadge.appendChild(textNode);

  return banBadge;
}

function createNoOtherBansBadge(): HTMLDivElement {
  const banBadge = document.createElement("div");
  banBadge.className = "ban-badge";
  banBadge.setAttribute("data-clutch-extension", "ban-element");
  banBadge.style.padding = "6px 10px";
  banBadge.style.margin = "0 8px 0 0";
  banBadge.style.fontSize = "12px";
  banBadge.style.backgroundColor = "transparent";
  banBadge.style.border = "1px solid var(--toastify-color-transparent)";
  banBadge.style.color = "var(--toastify-color-transparent)";
  banBadge.style.display = "inline-flex";
  banBadge.style.alignItems = "center";
  banBadge.style.whiteSpace = "nowrap";

  // Create search-x SVG from Lucide
  const searchXSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  searchXSvg.setAttribute("width", "14");
  searchXSvg.setAttribute("height", "14");
  searchXSvg.setAttribute("viewBox", "0 0 24 24");
  searchXSvg.setAttribute("fill", "none");
  searchXSvg.setAttribute("stroke", "currentColor");
  searchXSvg.setAttribute("stroke-width", "2");
  searchXSvg.setAttribute("stroke-linecap", "round");
  searchXSvg.setAttribute("stroke-linejoin", "round");
  searchXSvg.style.verticalAlign = "middle";
  searchXSvg.style.marginRight = "4px";

  // Search-x paths
  const circle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  circle.setAttribute("cx", "11");
  circle.setAttribute("cy", "11");
  circle.setAttribute("r", "8");

  const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line1.setAttribute("x1", "21");
  line1.setAttribute("x2", "16.65");
  line1.setAttribute("y1", "21");
  line1.setAttribute("y2", "16.65");

  const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line2.setAttribute("x1", "8");
  line2.setAttribute("x2", "14");
  line2.setAttribute("y1", "11");
  line2.setAttribute("y2", "11");

  searchXSvg.appendChild(circle);
  searchXSvg.appendChild(line1);
  searchXSvg.appendChild(line2);

  const textNode = document.createTextNode("No other bans found");

  banBadge.appendChild(searchXSvg);
  banBadge.appendChild(textNode);

  return banBadge;
}

function removeBanElements() {
  document
    .querySelectorAll("[data-clutch-extension='ban-element']")
    .forEach((element) => {
      element.remove();
    });
}

async function renderBanBadges(bans: Ban[]): Promise<void> {
  const container = await waitForElement(".profile-banner .container");

  let existingBanBadge = container.querySelector(
    ".ban-badge:not([data-clutch-extension='ban-element'])"
  );

  // Add ban history header in all cases
  const headerDiv = document.createElement("div");
  headerDiv.className = "text";
  headerDiv.setAttribute("data-clutch-extension", "ban-element");
  headerDiv.style.marginBottom = "8px";
  headerDiv.style.marginTop = "16px";
  headerDiv.style.fontWeight = "600";
  headerDiv.textContent = "Ban History";
  container.appendChild(headerDiv);

  // If there's an existing ban badge and no additional bans to show
  if (existingBanBadge && (!bans || bans.length <= 1)) {
    const noOtherBansBadge = createNoOtherBansBadge();
    container.appendChild(noOtherBansBadge);
    return;
  }

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
    return;
  }

  const playerId = getPlayerIdFromUrl();
  if (!playerId) {
    console.log(`[Clutch] Could not get player ID from URL`);
    return;
  }
  const bans = await fetchUserBans(playerId);

  await renderBanBadges(bans);
}
