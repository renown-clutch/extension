import type { UserSettings } from "$lib/types";
import { waitForElement } from "../utils/profileUtils";

function injectPlayerStatsCSS() {
  if (document.getElementById("clutch-player-stats-style")) return;
  const style = document.createElement("style");
  style.id = "clutch-player-stats-style";
  style.textContent = `
    a.player-stats-clutch-wrapper {
    width: auto;
    display: flex;
    background: var(--slate-800);
    padding: 2.4rem 0rem 0.2rem 0rem;
    margin-top: -3.6rem;
    border-radius: 0px 0px 2rem 2rem;
    color: white;
    font-size: 0.8rem;
    justify-content: center;
    margin-right: 1px;
    }
    .clutch-stats-block {
      display: flex;
      gap: 1.2rem;
      
    }
    .clutch-stats-block-item {
      color: var(--slate-300);
      display: flex;
      align-items: center;
      gap: 0.3rem;
      position: relative;
      
    }
    .clutch-stats-block-item .stat-icon {
      width: 0.9rem;
      height: 0.9rem;
    }
    .clutch-stats-block-item:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      padding: 4px 8px;
      background: var(--slate-700);
      color: white;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 1000;
    }
    .clutch-stats-block-item:hover::before {
      content: '';
      position: absolute;
      bottom: calc(100% - 4px);
      left: 50%;
      transform: translateX(-50%);
      border: 4px solid transparent;
      border-top-color: var(--slate-700);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 1000;
    }
    .clutch-stats-block-item:hover::after,
    .clutch-stats-block-item:hover::before {
      opacity: 1;
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
    if (existingKd) existingKd.textContent = stats.current_streak;

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
        <div class="clutch-stats-block-item" data-tooltip="Total matches played">
          <svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-swords-icon lucide-swords"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/></svg>
          ${stats.total_matches}
        </div>
        <div class="clutch-stats-block-item" data-tooltip="Average Leetify rating">
          <svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 23 16"><path fill="#fff" d="M8.69 4.913 9.733 0h11.706a1.136 1.136 0 0 1 1.11 1.375L19.69 14.8c-.15.7-.767 1.2-1.482 1.2h-4.67l2.143-9.985a.91.91 0 0 0-.888-1.102z"></path><path fill="#fff" d="m7.402 5.748-.015.062-.848 3.93a.758.758 0 0 0 .74.92h2.673a.758.758 0 0 1 .74.916L9.746 16h-8.61a1.136 1.136 0 0 1-1.111-1.375L2.886 1.2c.15-.7.767-1.2 1.48-1.2h4.25z"></path></svg>
          ${stats.avg_leetify_rating}
        </div>
        <div class="clutch-stats-block-item" data-tooltip="Win rate percentage">
          <svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trophy-icon lucide-trophy"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          ${stats.winrate}%
        </div>
        <div class="clutch-stats-block-item" data-tooltip="Average kills per match">
          <svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-target-icon lucide-target"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          ${stats.avg_kills}
        </div>
        <div class="clutch-stats-block-item" data-tooltip="Kill/Death ratio">
          <svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chart-spline-icon lucide-chart-spline"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7"/></svg>
          ${stats.avg_kd}
        </div>
        <div class="clutch-stats-block-item" data-tooltip="Average Damage per Round">
          <svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart-crack-icon lucide-heart-crack"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="m12 13-1-1 2-2-3-3 2-2"/></svg>
          ${stats.avg_adr}
        </div>
        <div class="clutch-stats-block-item" data-tooltip="Headshot percentage">
          <svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crosshair-icon lucide-crosshair"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>
          ${stats.avg_hs_percent}%
        </div>
      `;
    }

    statsWrapper.appendChild(statsBlock);
    playerLink.insertAdjacentElement("afterend", statsWrapper);
  });
}
