import type { UserSettings } from "$lib/types";
import { waitForElement } from "../utils/profileUtils";

function injectPlayerStatsCSS() {
  if (document.getElementById("clutch-player-stats-style")) return;
  const style = document.createElement("style");
  style.id = "clutch-player-stats-style";
  style.textContent = `
    a.player-stats-clutch-wrapper {
      width: auto;
      background: var(--slate-800);
      padding: 2rem 2rem 0.5rem 2rem;
      margin-top: -3.8rem;
      margin-left: -1px;
      border-radius: 0px 0px 2rem 2rem;
      border: 1px solid var(--slate-700);
      color: white;
      font-size: 12px;
    }
    .clutch-stats-block {
      display: flex;
      gap: 2rem;
    }
    .clutch-stats-block-item {
      color: var(--slate-300);
    }
  `;
  document.head.appendChild(style);
}

async function fetchPlayersStats(
  steamIds: string[]
): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "fetchPlayersStats", steamIds },
      (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          resolve({});
        } else {
          resolve(response.data || {});
        }
      }
    );
  });
}

function removeExistingPlayerStats() {
  const existingPlayerStats = document.querySelectorAll(
    ".player-stats-clutch-wrapper"
  );
  existingPlayerStats.forEach((el) => el.remove());
}

export async function initializeLivePlayerStats(
  userSettings: UserSettings
): Promise<void> {
  if (!userSettings.liveMatchPlayerStats) {
    removeExistingPlayerStats();
    return;
  }

  injectPlayerStatsCSS();

  const pageContainer = await waitForElement(".page");
  const team1Container = pageContainer.querySelector(".team1-players");
  const team2Container = pageContainer.querySelector(".team2-players");

  if (!team1Container || !team2Container) return;

  const playerLinks = [
    ...team1Container.querySelectorAll("a.player"),
    ...team2Container.querySelectorAll("a.player"),
  ];

  pageContainer
    .querySelectorAll("a.player-stats-clutch-wrapper")
    .forEach((el) => el.remove());

  const steamIds = playerLinks
    .map((playerLink) => playerLink.getAttribute("href")?.split("/profile/")[1])
    .filter((id): id is string => id !== undefined);

  document.querySelectorAll(".player-list-header").forEach((header) => {
    const kdHeader = Array.from(header.querySelectorAll("div")).find(
      (div) => div.textContent?.trim() === "K/D"
    );
    if (kdHeader) kdHeader.textContent = "W/L";
  });

  const statsData = await fetchPlayersStats(steamIds);

  playerLinks.forEach((playerLink) => {
    const href = playerLink.getAttribute("href");
    if (!href?.includes("/profile/")) return;

    const steamId = href.split("/profile/")[1];
    const stats = statsData[steamId];

    const existingKd = playerLink.querySelector(".kd");
    if (existingKd) existingKd.textContent = "n/a";

    const statsWrapper = document.createElement("a");
    statsWrapper.className = "player-stats-clutch-wrapper";
    statsWrapper.target = "_blank";
    statsWrapper.href = `https://renown.gg/profile/${steamId}`;

    const statsBlock = document.createElement("div");
    statsBlock.className = "clutch-stats-block";

    if (!stats) {
      statsBlock.innerHTML = `<div class="clutch-stats-block-item">No stats found</div>`;
    } else {
      statsBlock.innerHTML = `
        <div class="clutch-stats-block-item">Matches: ${stats.total_matches}</div>
        <div class="clutch-stats-block-item">Leetify: ${stats.avg_leetify_rating}</div>
        <div class="clutch-stats-block-item">Win Rate: ${stats.winrate}%</div>
        <div class="clutch-stats-block-item">Kills: ${stats.avg_kills}</div>
        <div class="clutch-stats-block-item">K/D: ${stats.avg_kd}</div>
        <div class="clutch-stats-block-item">ADR: ${stats.avg_adr}</div>
        <div class="clutch-stats-block-item">HS%: ${stats.avg_hs_percent}</div>
      `;
    }

    statsWrapper.appendChild(statsBlock);
    playerLink.insertAdjacentElement("afterend", statsWrapper);
  });
}
