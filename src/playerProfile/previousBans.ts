import {
  formatDate,
  isProfilePage,
  getPlayerIdFromUrl,
  waitForElement,
} from "../utils/profileUtils";
import { addTooltip } from "../utils/faceitUtils";
import { is404Page } from "../utils/pageUtils";
import browserAPI from "../lib/browserAPI";
import type { UserSettings } from "$lib/types";
import { registerProfileFeature } from "../lib/featureRegistry";

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
  const tooltipWrapper = document.createElement("div");
  tooltipWrapper.className = "tooltip-wrapper clutch-ban-tooltip-wrapper";
  tooltipWrapper.setAttribute("data-clutch-extension", "ban-element");

  const banBadge = document.createElement("div");
  banBadge.className = "ban-badge clutch-ban-badge";

  const issuedDate = new Date(ban.issued_on);
  const formattedIssuedDate = formatDate(issuedDate);

  let tooltipText = "";
  if (ban.permanent) {
    tooltipText = `Issued on: ${formattedIssuedDate}`;
  } else if (ban.expires_on) {
    const expiryDate = new Date(ban.expires_on);
    const formattedExpiryDate = formatDate(expiryDate);
    tooltipText = `${formattedIssuedDate} - ${formattedExpiryDate}`;
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

  tooltipWrapper.appendChild(banBadge);

  if (tooltipText) {
    addTooltip(tooltipWrapper, tooltipText);
  }

  return tooltipWrapper;
}

function createNoBansBadge(): HTMLDivElement {
  const banBadge = document.createElement("div");
  banBadge.className = "ban-badge good clutch-ban-badge";
  banBadge.setAttribute("data-clutch-extension", "ban-element");

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
  badgeCheckSvg.classList.add("clutch-ban-check-svg");

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
  banBadge.className = "ban-badge no-other-bans clutch-ban-badge";
  banBadge.setAttribute("data-clutch-extension", "ban-element");

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
  searchXSvg.classList.add("clutch-ban-search-svg");

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

  // Remove injected CSS when cleaning up
  const styleElement = document.getElementById("clutch-previous-bans-styles");
  if (styleElement) {
    styleElement.remove();
  }
}

async function renderBanBadges(bans: Ban[]): Promise<void> {
  const existingClutchBanBadge = document.querySelector(
    ".clutch-ban-history-header"
  );
  if (existingClutchBanBadge) {
    return;
  }

  const container = await waitForElement(".profile-banner .container");

  let existingBanBadge = container.querySelector(
    ".ban-badge:not([data-clutch-extension='ban-element'])"
  );

  const headerDiv = document.createElement("div");
  headerDiv.className = "text clutch-ban-history-header";
  headerDiv.setAttribute("data-clutch-extension", "ban-element");
  headerDiv.textContent = "Ban History";
  container.appendChild(headerDiv);

  if (existingBanBadge) {
    const strongElement = existingBanBadge.querySelector("strong");
    const categoryAndSeverity = strongElement?.textContent?.split(" - ") || [];
    const existingBanCategory = categoryAndSeverity[0] || "";
    const existingBanSeverity = categoryAndSeverity[1] || "";

    const isPermanent =
      existingBanBadge.textContent?.includes("permanently") || false;

    const secondStrong = existingBanBadge.querySelector("strong:nth-child(2)");
    const existingBanUntil = secondStrong?.textContent || null;

    const duplicateBan = bans.find((ban) => {
      if (isPermanent && ban.permanent) {
        return (
          ban.category === existingBanCategory &&
          ban.severity === existingBanSeverity
        );
      }

      if (!isPermanent && existingBanUntil && ban.expires_on) {
        const existingBanDate = new Date(existingBanUntil);
        const apiBanDate = new Date(ban.expires_on);

        const sameDateExpiry =
          existingBanDate.getDate() === apiBanDate.getDate() &&
          existingBanDate.getMonth() === apiBanDate.getMonth() &&
          existingBanDate.getFullYear() === apiBanDate.getFullYear();

        return (
          ban.category === existingBanCategory &&
          ban.severity === existingBanSeverity &&
          sameDateExpiry
        );
      }

      return false;
    });

    if (duplicateBan) {
      bans = bans.filter((ban) => {
        if (isPermanent && ban.permanent) {
          return !(
            ban.category === existingBanCategory &&
            ban.severity === existingBanSeverity
          );
        }

        if (!isPermanent && existingBanUntil && ban.expires_on) {
          const existingBanDate = new Date(existingBanUntil);
          const apiBanDate = new Date(ban.expires_on);

          const sameDateExpiry =
            existingBanDate.getDate() === apiBanDate.getDate() &&
            existingBanDate.getMonth() === apiBanDate.getMonth() &&
            existingBanDate.getFullYear() === apiBanDate.getFullYear();

          return !(
            ban.category === existingBanCategory &&
            ban.severity === existingBanSeverity &&
            sameDateExpiry
          );
        }

        return true;
      });
    }
  }

  if (!bans || bans.length === 0) {
    if (existingBanBadge) {
      const noOtherBansBadge = createNoOtherBansBadge();
      container.appendChild(noOtherBansBadge);
    } else {
      const noBansBadge = createNoBansBadge();
      container.appendChild(noBansBadge);
    }
    return;
  }

  bans.forEach((ban) => {
    const banBadgeElement = createBanBadge(ban);
    container.appendChild(banBadgeElement);
  });
}

export async function initializeProfileBans(
  userSettings: UserSettings
): Promise<void> {
  if (!isProfilePage()) {
    return;
  }

  if (!userSettings.showBans) {
    removeBanElements();
    return;
  }

  if (is404Page()) {
    return;
  }

  const playerId = getPlayerIdFromUrl();
  if (!playerId) {
    return;
  }
  const bans = await fetchUserBans(playerId);

  await renderBanBadges(bans);
}

// Register this feature with the new system
registerProfileFeature({
  settingKey: "showBans",
  category: "profile",
  defaultValue: true,
  description: "Show ban information",
  apiCalls: [
    {
      requestType: "fetchUserBans",
      responseType: "user_bans",
    },
  ],
  handler: initializeProfileBans,
});
