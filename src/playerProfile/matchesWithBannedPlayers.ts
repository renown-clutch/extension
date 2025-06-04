import { isProfilePage, waitForElement } from "../utils/profileUtils";
import { is404Page } from "../utils/pageUtils";
import browserAPI from "../lib/browserAPI";
import type { UserSettings } from "$lib/types";
import { registerProfileFeature } from "../lib/featureRegistry";

interface MatchWithBannedPlayersResponse {
  success: boolean;
  data?: number[];
  error?: string;
}

function isMatchesSubPage(): boolean {
  return window.location.pathname.includes("/matches");
}

function extractMatchIds(): number[] {
  const matchElements = document.querySelectorAll(
    '.profile-match-list a.match[href^="/match/"]'
  );
  const matchIds: number[] = [];

  matchElements.forEach((element) => {
    const href = element.getAttribute("href");
    if (href) {
      const match = href.match(/\/match\/(\d+)/);
      if (match) {
        const matchId = parseInt(match[1], 10);
        if (!isNaN(matchId)) {
          matchIds.push(matchId);
        }
      }
    }
  });

  return matchIds;
}

async function fetchMatchesWithBannedPlayers(
  matchIds: number[]
): Promise<number[]> {
  try {
    console.log(
      "[Clutch] 🚀 Sending matches with banned players request:",
      matchIds
    );

    const response = await browserAPI.runtime.sendMessage({
      type: "get_matches_with_banned_players",
      match_ids: matchIds,
    });

    console.log(
      "[Clutch] 📥 Received matches with banned players response:",
      response
    );

    // Handle the actual response format from the server
    if (response && response.matches_with_banned_players) {
      console.log(
        "[Clutch] ✅ Successfully parsed banned players data:",
        response.matches_with_banned_players
      );
      return Array.isArray(response.matches_with_banned_players)
        ? response.matches_with_banned_players
        : [];
    } else if (response && response.success && response.data) {
      console.log(
        "[Clutch] ✅ Successfully parsed banned players data from standardized format:",
        response.data
      );
      return Array.isArray(response.data) ? response.data : [];
    } else if (response && response.success === false) {
      console.warn("[Clutch] API returned error:", response.error);
      return [];
    } else {
      console.warn("[Clutch] Unexpected response format:", response);
      return [];
    }
  } catch (error) {
    console.error(
      "[Clutch] Error fetching matches with banned players:",
      error
    );
    return [];
  }
}

async function checkAndReportMatchesWithBannedPlayers(): Promise<void> {
  try {
    // Wait for the match list to load
    const matchList = await waitForElement(".profile-match-list");
    if (!matchList) {
      console.log("[Clutch] No match list found on profile matches page");
      return;
    }

    // Extract match IDs from the DOM
    const matchIds = extractMatchIds();
    if (matchIds.length === 0) {
      console.log("[Clutch] No match IDs found in profile matches page");
      return;
    }

    console.log(
      `[Clutch] Found ${matchIds.length} matches on profile page:`,
      matchIds
    );

    // Request which matches have banned players
    const matchesWithBannedPlayers = await fetchMatchesWithBannedPlayers(
      matchIds
    );

    if (matchesWithBannedPlayers.length > 0) {
      console.log(
        `[Clutch] ⚠️ Found ${matchesWithBannedPlayers.length} matches with banned players:`,
        matchesWithBannedPlayers
      );

      // Optionally, you could also highlight these matches in the UI
      highlightMatchesWithBannedPlayers(matchesWithBannedPlayers);
    } else {
      console.log("[Clutch] ✅ No matches with banned players found");
    }
  } catch (error) {
    console.error(
      "[Clutch] Error checking matches with banned players:",
      error
    );
  }
}

function highlightMatchesWithBannedPlayers(matchIds: number[]): void {
  matchIds.forEach((matchId) => {
    const matchElement = document.querySelector(
      `a.match[href="/match/${matchId}"]`
    );
    if (matchElement) {
      // Add a visual indicator to matches with banned players
      matchElement.classList.add("clutch-has-banned-players");

      // Add a warning icon or badge
      const warningBadge = document.createElement("div");
      warningBadge.className = "clutch-banned-players-warning";
      warningBadge.innerHTML = "⚠️";
      warningBadge.title = "This match contains banned players";
      warningBadge.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: #ff4444;
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        z-index: 10;
      `;

      // Make the match element position relative so we can position the badge
      (matchElement as HTMLElement).style.position = "relative";
      matchElement.appendChild(warningBadge);
    }
  });
}

function removeExistingBannedPlayerIndicators(): void {
  // Remove existing warning badges
  document
    .querySelectorAll(".clutch-banned-players-warning")
    .forEach((el) => el.remove());

  // Remove classes from match elements
  document.querySelectorAll(".clutch-has-banned-players").forEach((el) => {
    el.classList.remove("clutch-has-banned-players");
    (el as HTMLElement).style.position = "";
  });
}

export async function initializeMatchesWithBannedPlayersCheck(
  userSettings: UserSettings
): Promise<void> {
  // Only run on profile pages
  if (!isProfilePage()) {
    return;
  }

  // Only run on the matches subpage of profiles
  if (!isMatchesSubPage()) {
    removeExistingBannedPlayerIndicators();
    return;
  }

  // Skip if it's a 404 page
  if (is404Page()) {
    return;
  }

  // Check if the feature is enabled in settings
  if (!userSettings.checkMatchesWithBannedPlayers) {
    removeExistingBannedPlayerIndicators();
    return;
  }

  await checkAndReportMatchesWithBannedPlayers();
}

// Register this feature with the new system
registerProfileFeature({
  settingKey: "checkMatchesWithBannedPlayers",
  category: "profile",
  defaultValue: true,
  description: "Check and highlight matches with banned players",
  apiCalls: [
    {
      requestType: "get_matches_with_banned_players",
      responseType: "matches_with_banned_players",
    },
  ],
  handler: initializeMatchesWithBannedPlayersCheck,
});
