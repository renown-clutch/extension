import { getPlayerIdFromUrl, waitForElement } from "../utils/profileUtils";
import { isProfilePage } from "../utils/profileUtils";
import { is404Page } from "../utils/pageUtils";
import browserAPI from "../lib/browserAPI";
import type { UserSettings } from "$lib/types";

interface MatchParticipant {
  steamId: string;
  team: string;
}

interface MapInfo {
  name: string;
  display_name: string;
  icon_url: string;
  image_url: string;
}

interface LiveMatch {
  id: number;
  map: MapInfo;
  team1_current_score: number;
  team2_current_score: number;
  MatchParticipant: MatchParticipant[];
  status: string;
}

interface LiveMatchesResponse {
  success: boolean;
  data: {
    liveMatches: LiveMatch[];
  };
}

async function displayLinkToCurrentMatch(playerId: string) {
  console.log(
    "[Current Match Link] Starting to fetch and display link for player:",
    playerId
  );
  try {
    // Fetch live matches from background script
    console.log("[Current Match Link] Fetching live matches from API...");
    const response = await new Promise<LiveMatchesResponse>((resolve) => {
      browserAPI.runtime.sendMessage({ type: "fetchLiveMatches" }, (response) =>
        resolve(response as LiveMatchesResponse)
      );
    });

    if (!response || !response.success) {
      console.warn(
        "[Current Match Link] Failed to fetch live matches:",
        response
      );
      return;
    }

    const { liveMatches } = response.data;
    console.log(
      "[Current Match Link] Received live matches:",
      liveMatches?.length || 0,
      "matches found"
    );

    if (!liveMatches || !liveMatches.length) {
      console.log("[Current Match Link] No live matches currently active");
      return;
    }

    // Find if player is in any live match
    console.log("[Current Match Link] Searching for player in live matches...");
    const currentMatch = liveMatches.find((match: LiveMatch) =>
      match.MatchParticipant.some(
        (participant: MatchParticipant) => participant.steamId === playerId
      )
    );

    if (!currentMatch) {
      console.log("[Current Match Link] Player not found in any live match");
      return;
    }

    console.log(
      "[Current Match Link] Found player in match:",
      currentMatch.id,
      "on",
      currentMatch.map.display_name
    );

    // Wait for profile banner to be available
    console.log("[Current Match Link] Waiting for profile banner element...");
    const profileBanner = await waitForElement(".profile-banner");
    if (!profileBanner) {
      console.warn("[Current Match Link] Profile banner not found");
      return;
    }

    const actionsContainer = profileBanner.querySelector(".actions");
    if (!actionsContainer) {
      console.warn("[Current Match Link] Actions container not found");
      return;
    }

    console.log(
      "[Current Match Link] Found required DOM elements, creating link..."
    );

    // Create and add the link
    const matchLink = document.createElement("a");
    matchLink.href = `/match/${currentMatch.id}`;
    matchLink.className = "clutch-current_match_link primary-button sm";
    matchLink.innerHTML = `
      <span class="text">Playing on ${currentMatch.map.display_name} (${
      currentMatch.team1_current_score ?? 0
    }-${currentMatch.team2_current_score ?? 0})</span>
    `;

    actionsContainer.appendChild(matchLink);
    console.log("[Current Match Link] Successfully added link to profile");
  } catch (error) {
    console.error(
      "[Current Match Link] Error displaying link to current match:",
      error
    );
  }
}

export function initializeLinkToCurrentMatch(userSettings: UserSettings): void {
  const enabled = userSettings.showLinkToCurrentMatch;
  console.log("[Current Match Link] Initializing with enabled:", enabled);

  if (!isProfilePage()) {
    console.log("[Current Match Link] Not a profile page, skipping");
    return;
  }

  if (!enabled) {
    console.log(
      "[Current Match Link] Feature disabled, removing existing link if present"
    );
    const existingLink = document.querySelector(".clutch-current_match_link");
    if (existingLink) {
      existingLink.remove();
      console.log("[Current Match Link] Removed existing link");
    }
    return;
  }

  if (is404Page()) {
    console.log("[Current Match Link] 404 page detected, skipping");
    return;
  }

  const playerId = getPlayerIdFromUrl();
  if (!playerId) {
    console.warn("[Current Match Link] Could not determine player ID from URL");
    return;
  }

  console.log(
    "[Current Match Link] Starting display process for player:",
    playerId
  );
  displayLinkToCurrentMatch(playerId);
}
