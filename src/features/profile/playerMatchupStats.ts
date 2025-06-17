import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import {
  getPlayerIdFromUrl,
  isMainProfilePage,
  waitForElement,
} from "$utils/profileUtils";
import { is404Page } from "$utils/common/pageUtils";
import browserAPI from "$system/lib/browserAPI";
import { getUserInfo } from "$system/auth/steamIdParser";

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
  card.className = `stat-card ${performanceClass} clutch-animate-fade-in-scale`;
  card.style.animationDelay = "0.1s";

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
  section.className =
    "profile-recent-stats clutch-matchup-stats clutch-animate-fade-in-down";
  section.setAttribute("data-clutch-extension", "matchup-stats");

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
    '[data-clutch-extension="matchup-stats"]'
  );
  existing.forEach((element) => element.remove());
}

async function injectMatchupStats(matchupData: any): Promise<void> {
  try {
    // Wait for the profile banner container first, like other profile features
    const profileBannerContainer = await waitForElement(
      ".profile-banner .container"
    );
    if (!profileBannerContainer) {
      console.log("[Clutch] Could not find profile banner container");
      return;
    }

    // Wait for the recent stats section specifically
    const recentStats = await waitForElement(".profile-recent-stats");
    if (!recentStats) {
      console.log("[Clutch] Could not find profile-recent-stats section");
      return;
    }

    // Remove any existing matchup stats
    removeExistingMatchupStats();

    // Create and inject the matchup stats section
    const matchupSection = createMatchupStatsSection(matchupData);

    // Insert before the existing recent stats
    recentStats.parentNode?.insertBefore(matchupSection, recentStats);

    console.log("[Clutch] Successfully injected matchup stats");
  } catch (error) {
    console.error("[Clutch] Error injecting matchup stats:", error);
  }
}

async function initializePlayerMatchupStats(
  settings: UserSettings
): Promise<void> {
  console.log(
    "[Clutch] initializePlayerMatchupStats called with settings:",
    settings.playerMatchupStats
  );

  if (!isMainProfilePage()) {
    console.log("[Clutch] Not on main profile page");
    return;
  }

  if (is404Page()) {
    console.log("[Clutch] 404 page detected");
    return;
  }

  // Always cleanup first
  removeExistingMatchupStats();

  if (!settings.playerMatchupStats) {
    console.log("[Clutch] Player matchup stats disabled");
    return;
  }

  const targetPlayerId = getPlayerIdFromUrl();
  console.log("[Clutch] Target player ID:", targetPlayerId);
  if (!targetPlayerId) {
    console.log("[Clutch] Could not extract target player ID from URL");
    return;
  }

  const { steamId: currentUserSteamId } = await getUserInfo();
  console.log("[Clutch] Current user Steam ID:", currentUserSteamId);
  if (!currentUserSteamId) {
    console.log("[Clutch] Could not get current user steam ID");
    return;
  }

  if (currentUserSteamId === targetPlayerId) {
    console.log("[Clutch] Cannot show matchup stats for own profile");
    return;
  }

  console.log(
    "[Clutch] Fetching matchup stats between",
    currentUserSteamId,
    "and",
    targetPlayerId
  );
  const matchupStats = await fetchMatchupStats(
    currentUserSteamId,
    targetPlayerId
  );
  console.log("[Clutch] Matchup stats response:", matchupStats);

  // Check if we have valid matchup data (not an error response)
  if (
    matchupStats &&
    !matchupStats.error &&
    typeof matchupStats.matches_played_together !== "undefined"
  ) {
    await injectMatchupStats(matchupStats);
  } else {
    if (matchupStats && matchupStats.error) {
      console.log("[Clutch] API error:", matchupStats.error);
    } else {
      console.log("[Clutch] Failed to fetch matchup data");
    }
  }
}

registerFeature({
  settingKey: "playerMatchupStats",
  category: "profile",
  defaultValue: false,
  description: "Show matchup statistics between you and the viewed player",
  handler: initializePlayerMatchupStats,
  cleanupHandler: removeExistingMatchupStats,
  shouldActivate: ActivationHelpers.and(
    (currentPage, settings) =>
      currentPage.type === "profile" && isMainProfilePage(),
    ActivationHelpers.whenEnabled("playerMatchupStats")
  ),
  apiCalls: [
    {
      requestType: "get_player_matchup",
      responseType: "playerMatchupResponse",
    },
  ],
});
