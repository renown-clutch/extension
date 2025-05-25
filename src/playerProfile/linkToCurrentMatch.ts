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

    const actionsElement = profileBanner.querySelector(
      ".actions"
    ) as HTMLElement;
    if (actionsElement) {
      actionsElement.classList.add("clutch-profile-actions-container");
    }

    const linksContainer = profileBanner.querySelector(".links");
    if (!linksContainer) {
      return;
    }

    // Create and add the link
    const matchLink = document.createElement("a");
    matchLink.href = `/match/${currentMatch.id}`;
    matchLink.className =
      "clutch-current_match_link clutch-current-match-link primary-button sm";

    matchLink.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-swords-icon lucide-swords"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline><line x1="13" x2="19" y1="19" y2="13"></line><line x1="16" x2="20" y1="16" y2="20"></line><line x1="19" x2="21" y1="21" y2="19"></line><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"></polyline><line x1="5" x2="9" y1="14" y2="18"></line><line x1="7" x2="4" y1="17" y2="20"></line><line x1="3" x2="5" y1="19" y2="21"></line></svg>
      <span class="text-playing-now">Playing on ${
        currentMatch.map.display_name
      } ${currentMatch.team1_current_score ?? 0}:${
      currentMatch.team2_current_score ?? 0
    }</span>
    `;

    // Insert as first child
    linksContainer.insertBefore(matchLink, linksContainer.firstChild);
  } catch (error) {
    // Error handling silently fails
  }
}

const removeExistingLink = () => {
  const existingLink = document.querySelector(".clutch-current_match_link");
  if (existingLink) {
    existingLink.remove();
  }

  // Remove injected CSS when cleaning up
  const styleElement = document.getElementById(
    "clutch-link-to-current-match-styles"
  );
  if (styleElement) {
    styleElement.remove();
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
