import {
  getPlayerIdFromUrl,
  isProfilePage,
  waitForElement,
} from "../utils/profileUtils";
import { is404Page } from "../utils/pageUtils";
import type { UserSettings } from "../lib/types";
import browserAPI from "../lib/browserAPI";
import { getUserSteamId } from "../steamId/steamIdParser";
import { registerProfileFeature } from "../lib/featureRegistry";

function isBaseProfilePage(): boolean {
  const path = window.location.pathname;
  return /^\/profile\/\d+$/.test(path);
}

async function fetchMatchupStats(
  player1SteamId: string,
  player2SteamId: string
): Promise<any> {
  try {
    const response = await browserAPI.runtime.sendMessage({
      type: "get_player_matchup",
      player1SteamId,
      player2SteamId,
    });
    return response;
  } catch (error) {
    console.error("[Clutch] Error fetching matchup stats:", error);
    return null;
  }
}

function createStatCard(
  label: string,
  value: string,
  performanceClass: string = "average"
): HTMLElement {
  const card = document.createElement("div");
  card.className = `stat-card ${performanceClass}`;

  const header = document.createElement("div");
  header.className = "stat-header";

  const statLabel = document.createElement("div");
  statLabel.className = "stat-label";
  statLabel.textContent = label;

  const statValue = document.createElement("div");
  statValue.className = "stat-value";
  statValue.textContent = value;

  header.appendChild(statLabel);
  header.appendChild(statValue);
  card.appendChild(header);

  return card;
}

function createMatchupStatsSection(matchupData: any): HTMLElement {
  const section = document.createElement("div");
  section.className = "profile-recent-stats clutch-matchup-stats";
  section.setAttribute("data-clutch-extension", "true");

  // Create top section
  const top = document.createElement("div");
  top.className = "top";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = "Matchup History";

  const text = document.createElement("div");
  text.className = "text";
  text.textContent =
    "Your performance history when playing with and against this player.";

  top.appendChild(title);
  top.appendChild(text);

  // Create stats section
  const stats = document.createElement("div");
  stats.className = "stats";

  // Create stat cards - always show all 4
  const matchesTogetherClass =
    matchupData.matches_played_together === 0 ? "average" : "good";
  const matchesTogetherCard = createStatCard(
    "Matches together",
    matchupData.matches_played_together.toString(),
    matchesTogetherClass
  );

  const winrateTogether = matchupData.winrate_together || 0;
  const winrateTogetherClass = getWinrateClass(
    winrateTogether,
    matchupData.matches_played_together
  );
  const winrateTogetherCard = createStatCard(
    "Win rate together",
    `${winrateTogether}%`,
    winrateTogetherClass
  );

  const matchesAgainstClass =
    matchupData.matches_played_against === 0 ? "average" : "good";
  const matchesAgainstCard = createStatCard(
    "Matches against",
    matchupData.matches_played_against.toString(),
    matchesAgainstClass
  );

  const winrateAgainst = matchupData.winrate_against || 0;
  const winrateAgainstClass = getWinrateClass(
    winrateAgainst,
    matchupData.matches_played_against
  );
  const winrateAgainstCard = createStatCard(
    "Win rate against",
    `${winrateAgainst}%`,
    winrateAgainstClass
  );

  stats.appendChild(matchesTogetherCard);
  stats.appendChild(winrateTogetherCard);
  stats.appendChild(matchesAgainstCard);
  stats.appendChild(winrateAgainstCard);

  section.appendChild(top);
  section.appendChild(stats);

  return section;
}

function getWinrateClass(winrate: number, matchesPlayed: number): string {
  // If no matches played, show as average (neutral)
  if (matchesPlayed === 0) return "average";

  // Apply normal color logic for actual win rates
  if (winrate >= 80) return "great"; // 80-100%: bright green
  if (winrate >= 60) return "good"; // 60-79%: green
  if (winrate >= 40) return "average"; // 40-59%: yellow
  if (winrate >= 20) return "subpar"; // 20-39%: orange
  return "poor"; // 0-19%: red
}

function removeExistingMatchupStats(): void {
  const existing = document.querySelectorAll(
    '.clutch-matchup-stats[data-clutch-extension="true"]'
  );
  existing.forEach((element) => element.remove());
}

async function injectMatchupStats(matchupData: any): Promise<void> {
  try {
    const profileBannerContainer = await waitForElement(
      ".profile-banner .container"
    );
    if (!profileBannerContainer) {
      return;
    }

    // Wait for the recent stats section specifically
    const recentStats = await waitForElement(".profile-recent-stats");
    if (!recentStats) {
      return;
    }

    // Remove any existing matchup stats
    removeExistingMatchupStats();

    // Create and inject the matchup stats section
    const matchupSection = createMatchupStatsSection(matchupData);

    // Insert before the existing recent stats
    recentStats.parentNode?.insertBefore(matchupSection, recentStats);
  } catch (error) {
    console.error("[Clutch] Error injecting matchup stats:", error);
  }
}

export async function initializePlayerMatchupStats(
  settings: UserSettings
): Promise<void> {
  if (!isProfilePage()) {
    return;
  }

  if (!isBaseProfilePage()) {
    removeExistingMatchupStats();
    return;
  }

  if (!settings.playerMatchupStats) {
    removeExistingMatchupStats();
    return;
  }

  if (is404Page()) {
    return;
  }

  const targetPlayerId = getPlayerIdFromUrl();
  if (!targetPlayerId) {
    return;
  }

  const currentUserSteamId = await getUserSteamId();
  if (!currentUserSteamId) {
    return;
  }

  if (currentUserSteamId === targetPlayerId) {
    return;
  }

  const matchupStats = await fetchMatchupStats(
    currentUserSteamId,
    targetPlayerId
  );

  if (
    matchupStats &&
    !matchupStats.error &&
    typeof matchupStats.matches_played_together !== "undefined"
  ) {
    await injectMatchupStats(matchupStats);
  } else {
    removeExistingMatchupStats();
  }
}

// Register this feature with the new system
registerProfileFeature({
  settingKey: "playerMatchupStats",
  category: "profile",
  defaultValue: true,
  description: "Show matchup stats on player profiles",
  apiCalls: [
    {
      requestType: "get_player_matchup",
      responseType: "player_matchup",
    },
  ],
  handler: initializePlayerMatchupStats,
});
