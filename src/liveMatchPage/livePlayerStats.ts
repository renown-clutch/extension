import type { UserSettings } from "$lib/types";
import { waitForElement } from "../utils/profileUtils";
import { addTooltip } from "../utils/faceitUtils";

function injectPlayerStatsCSS() {
  if (document.getElementById("clutch-player-stats-style")) return;
  const style = document.createElement("style");
  style.id = "clutch-player-stats-style";
  style.textContent = `
    @media (max-width: 1410px) {
      .player-stats-clutch-wrapper {
        display: none !important;
      }
    }

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
          // Console log the win/loss streak data for testing
          console.log(
            "[WIN/LOSS STREAK TEST] Raw player stats data:",
            response.data
          );

          if (response.data) {
            Object.entries(response.data).forEach(
              ([steamId, stats]: [string, any]) => {
                if (stats && stats.current_streak !== undefined) {
                  console.log(
                    `[WIN/LOSS STREAK TEST] Player ${steamId}: current_streak = ${stats.current_streak}`
                  );
                }
              }
            );
          }

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

function updatePlayerStreakAndHeader(
  playerLinks: Element[],
  statsData: Record<string, any>
) {
  console.log(
    "[WIN/LOSS STREAK TEST] updatePlayerStreakAndHeader called with statsData:",
    statsData
  );

  // Update K/D header to W/L
  document.querySelectorAll(".player-list-header").forEach((header) => {
    const kdHeader = Array.from(header.querySelectorAll("div")).find(
      (div) => div.textContent?.trim() === "K/D"
    );
    if (kdHeader) kdHeader.textContent = "W/L";
  });

  // Update streak numbers
  playerLinks.forEach((playerLink) => {
    const href = playerLink.getAttribute("href");
    if (!href?.includes("/profile/")) return;

    const steamId = href.split("/profile/")[1];
    const stats = statsData[steamId];
    const existingKd = playerLink.querySelector(".kd") as HTMLElement;

    console.log(`[WIN/LOSS STREAK TEST] Processing player ${steamId}:`, {
      stats,
      current_streak: stats?.current_streak,
      existingKdElement: !!existingKd,
    });

    if (!existingKd || !stats) {
      if (existingKd) {
        existingKd.textContent = "-";
        existingKd.style.cssText = "";
      }
      return;
    }

    let formattedStreak = stats.current_streak;

    if (stats.current_streak < -1) {
      formattedStreak = stats.current_streak.toString().replace("-", "");
      existingKd.style.color = "#ef4444";
      console.log(
        `[WIN/LOSS STREAK TEST] Player ${steamId} has loss streak: ${formattedStreak} (red)`
      );
    } else if (stats.current_streak > 1) {
      existingKd.style.color = "#22c55e";
      console.log(
        `[WIN/LOSS STREAK TEST] Player ${steamId} has win streak: ${formattedStreak} (green)`
      );
    } else {
      formattedStreak = "-";
      console.log(
        `[WIN/LOSS STREAK TEST] Player ${steamId} has no significant streak: ${stats.current_streak} (showing as -)`
      );
    }
    existingKd.textContent = formattedStreak;

    addTooltip(
      existingKd,
      stats.current_streak < 0 ? "Loss Streak" : "Win Streak"
    );
  });
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

  if (!team1Container || !team2Container) {
    return;
  }

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

  const statsData = await fetchPlayersStats(steamIds);

  if (userSettings.showLiveMatchPlayerStreak) {
    updatePlayerStreakAndHeader(playerLinks, statsData);
  }

  playerLinks.forEach((playerLink) => {
    const href = playerLink.getAttribute("href");
    if (!href?.includes("/profile/")) {
      return;
    }

    const steamId = href.split("/profile/")[1];
    const stats = statsData[steamId];

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
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24"><g fill="#fff" clip-path="url(#a)"><path d="M5.914 1.75c-.031.007-.258.03-.5.057-.242.023-.56.069-.71.104-.273.061-1.002.292-1.121.353l-.357.173c-.334.162-.35.173-.722.42-.323.214-.384.26-.75.603-.276.257-.832.888-.832.941 0 .008-.05.089-.112.181a6.82 6.82 0 0 0-.487.93C.038 6.3 0 6.54 0 7.427c0 1.214.154 2.321.522 3.778.035.127.085.335.12.462.03.126.084.334.114.46.12.466.158.62.204.808.276 1.211.257 2.553-.05 3.46-.123.353-.211.9-.234 1.426l-.016.426.684.689c.703.707 1.448 1.422 1.786 1.706.107.093.2.177.21.189.012.015.143.119.289.234.15.115.272.223.28.238.008.02.035.031.065.031.027 0 .066.023.089.05.023.027.176.116.341.2.166.08.308.158.32.17.01.01.103.065.203.118.238.123.315.166.376.22.161.126 1.048.58 1.298.665.522.172.641.192 1.225.192.315 0 .668-.02.78-.043.115-.023.303-.053.418-.073a4.467 4.467 0 0 0 1.206-.407c.119-.058.215-.123.215-.138 0-.016.027-.031.057-.031.031 0 .058-.016.058-.03 0-.016.05-.059.107-.097.062-.035.216-.165.342-.288.188-.189.234-.262.277-.435.057-.246.023-.419-.158-.792-.138-.284-.134-.492.008-.791.092-.197.434-.566.522-.566.066 0 .419-.353.534-.538a4.7 4.7 0 0 0 .215-.392c.065-.134.134-.273.154-.311.019-.035.073-.165.115-.288a5.88 5.88 0 0 1 .111-.296c.062-.139.265-.788.365-1.173.154-.596.196-.723.46-1.288.07-.153.27-.718.343-.98.192-.684.218-1.022.122-1.63-.21-1.322-.23-1.61-.13-1.925.034-.108.088-.304.127-.443.038-.138.115-.384.176-.55.096-.26.112-.357.112-.691 0-.215-.02-.454-.039-.527a2.89 2.89 0 0 1-.073-.288c-.103-.48-.219-.83-.334-1.03-.165-.28-.165-.346 0-.427.115-.054.392-.061 2.373-.061 2.423-.004 2.654-.02 2.988-.204.096-.054.25-.142.345-.192l.308-.173c.073-.043.265-.146.422-.227.284-.146.422-.239.422-.285 0-.019-1.324-.688-1.632-.822-.111-.05-.418-.123-.864-.208-.13-.023-1.378-.05-3.214-.061l-2.999-.023-.322-.32a7.548 7.548 0 0 0-.511-.468 1.261 1.261 0 0 1-.204-.181c-.007-.015-.038-.027-.065-.027-.027 0-.057-.015-.065-.035-.004-.019-.123-.103-.261-.192a9.167 9.167 0 0 1-.288-.184 17.413 17.413 0 0 0-.96-.473 6.608 6.608 0 0 1-.192-.077 1.62 1.62 0 0 0-.23-.077c-.062-.02-.166-.05-.231-.073a6.606 6.606 0 0 0-.346-.096c-.126-.03-.303-.073-.391-.096-.35-.092-1.897-.223-2.085-.177Zm-.5 1.464.058.38.173-.004c.096 0 .319-.05.495-.103.334-.108.61-.131.73-.066.077.039.196.3.196.427 0 .042.053.204.115.357.119.281.123.285.495.535.208.138.469.296.584.353.253.127.342.204.342.289 0 .061-.411.43-.665.595-.169.112-.134.204.204.52.169.16.307.318.307.357 0 .1-.146.154-.591.204-.546.061-.557.073-.503.519.019.142.011.242-.02.3-.042.084-.053.088-.503.06-.537-.034-.58-.018-.76.3-.146.254-.265.385-.426.47-.123.065-.127.065-.323-.073a3.7 3.7 0 0 1-.388-.33c-.338-.34-.357-.335-.733.064-.184.204-.246.246-.311.227-.077-.023-.211-.277-.257-.484a20.276 20.276 0 0 0-.204-.838c-.011-.023-.077-.046-.142-.046-.211 0-.265-.073-.28-.37a2.886 2.886 0 0 0-.035-.35c-.027-.141-.157-.23-.372-.257-.423-.053-.764-.146-.864-.238l-.104-.092.134-.12c.12-.103.296-.168.626-.242a.487.487 0 0 0 .185-.103c.096-.096.084-.25-.035-.508-.307-.672-.319-.653.43-.646.553.008.56.008.657-.088.077-.077.096-.134.096-.3 0-.23.107-.503.223-.565.092-.05.299.023.499.177.069.054.15.085.176.077.031-.012.135-.139.238-.285.223-.322.404-.515.457-.5.02.008.066.185.096.397ZM10.05 8.99c.515.277.78.619.78 1.015 0 .292-.062.4-.373.646-.142.115-.268.219-.272.238-.023.05-.238.146-.446.2-.353.088-.66.1-.994.035-.546-.108-.73-.193-1.003-.458-.28-.28-.368-.446-.368-.68.004-.227.107-.438.326-.658.373-.372.76-.488 1.632-.472.465.003.488.007.718.134Zm3.906.45c.08.03.076.142-.004.296-.158.307-.215.58-.238 1.142l-.023.557-.215-.008c-.588-.019-1.03-.573-.884-1.115.066-.234.361-.542.68-.7.346-.172.55-.222.684-.172Zm-1.225 5.627c.238.147.326.473.253.912-.1.58-.357.887-.84.995-.27.058-.312.058-.696-.004-.626-.1-.99-.196-1.186-.311a4.037 4.037 0 0 1-.726-.53c-.315-.296-.2-.52.445-.842.51-.258.684-.289 1.728-.293.837-.003.906 0 1.022.074ZM20.44 2.756c-.034.062-.157.25-.268.423-.112.173-.204.346-.204.384 0 .073.123.204.192.204.023 0 .104.035.18.077.27.142.373.092.492-.25.035-.108.088-.234.115-.288.142-.273.112-.488-.08-.588-.2-.1-.346-.085-.427.038ZM21.562 3.452c-.565.553-.573.569-.576.734 0 .154.015.18.192.335.28.246.345.234.702-.131.292-.288.657-.68.78-.834a.6.6 0 0 0 .092-.2c.023-.112.008-.142-.15-.3-.146-.142-.2-.173-.322-.173-.13 0-.185.042-.718.569ZM21.58 5.37c0 .515-.057.488 1.13.504.53.007 1.033-.004 1.117-.02l.154-.034.011-.323c.008-.296.004-.33-.069-.377-.061-.038-.384-.057-1.213-.073l-1.13-.023v.346ZM21.389 6.316c-.365.33-.361.469.019.853.541.542 1.11 1.057 1.167 1.057.077 0 .35-.261.396-.377.077-.196.046-.242-.672-.96-.384-.385-.718-.7-.738-.7-.023 0-.1.058-.172.127ZM20.525 7.03c-.165.093-.196.128-.227.266-.034.161.023.392.096.392.02 0 .035.02.035.042 0 .023.08.162.18.312l.18.269.173-.02c.311-.034.492-.36.33-.591a3.574 3.574 0 0 1-.184-.323c-.265-.512-.276-.52-.583-.346Z"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h24v22.949H0z"/></clipPath></defs></svg>
          ${stats.avg_hs_percent}%
        </div>
      `;
    }

    statsWrapper.appendChild(statsBlock);
    playerLink.insertAdjacentElement("afterend", statsWrapper);
  });
}
