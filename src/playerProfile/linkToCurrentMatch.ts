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
  // check if link already exists
  if (document.querySelector(".clutch-current_match_link")) {
    return;
  }

  try {
    const response = await new Promise<LiveMatchesResponse>((resolve) => {
      browserAPI.runtime.sendMessage({ type: "fetchLiveMatches" }, (response) =>
        resolve(response as LiveMatchesResponse)
      );
    });

    if (!response || !response.success) {
      return;
    }

    const { liveMatches } = response.data;

    if (!liveMatches || !liveMatches.length) {
      return;
    }

    // Find if player is in any live match
    const currentMatch = liveMatches.find((match: LiveMatch) =>
      match.MatchParticipant.some(
        (participant: MatchParticipant) => participant.steamId === playerId
      )
    );

    if (!currentMatch) {
      return;
    }

    // Wait for profile banner to be available
    const profileBanner = await waitForElement(".profile-banner");
    if (!profileBanner) {
      return;
    }

    const actionsContainer = profileBanner.querySelector(".actions");
    if (!actionsContainer) {
      return;
    }

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
  } catch (error) {
    // Error handling silently fails
  }
}

const removeExistingLink = () => {
  const existingLink = document.querySelector(".clutch-current_match_link");
  if (existingLink) {
    existingLink.remove();
  }
};

export function initializeLinkToCurrentMatch(userSettings: UserSettings): void {
  const enabled = userSettings.showLinkToCurrentMatch;

  if (!isProfilePage()) {
    return;
  }

  if (!enabled) {
    removeExistingLink();
    return;
  }

  if (is404Page()) {
    return;
  }

  const playerId = getPlayerIdFromUrl();
  if (!playerId) {
    return;
  }

  displayLinkToCurrentMatch(playerId);
}
