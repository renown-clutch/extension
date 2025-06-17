import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import {
  getPlayerIdFromUrl,
  waitForElement,
  isProfilePage,
} from "$utils/profileUtils";
import { getCurrentPage, is404Page } from "$utils/common/pageUtils";
import browserAPI from "$system/lib/browserAPI";

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

    const currentMatch = liveMatches.find((match: LiveMatch) =>
      match.MatchParticipant.some(
        (participant: MatchParticipant) => participant.steamId === playerId
      )
    );

    if (!currentMatch) {
      return;
    }

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

    const matchLink = document.createElement("a");
    matchLink.href = `/match/${currentMatch.id}`;
    matchLink.className =
      "clutch-current_match_link clutch-current-match-link primary-button sm clutch-animate-fade-in-slide";
    matchLink.setAttribute("data-clutch-extension", "current-match-link");

    matchLink.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline><line x1="13" x2="19" y1="19" y2="13"></line><line x1="16" x2="20" y1="16" y2="20"></line><line x1="19" x2="21" y1="21" y2="19"></line><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"></polyline><line x1="5" x2="9" y1="14" y2="18"></line><line x1="7" x2="4" y1="17" y2="20"></line><line x1="3" x2="5" y1="19" y2="21"></line></svg>
      <span class="text-playing-now">Playing on ${
        currentMatch.map.display_name
      } ${currentMatch.team1_current_score ?? 0}:${
      currentMatch.team2_current_score ?? 0
    }</span>
    `;

    linksContainer.insertBefore(matchLink, linksContainer.firstChild);
  } catch (error) {
    // Error handling silently fails
  }
}

function cleanupCurrentMatchLink() {
  const existingLink = document.querySelector(".clutch-current_match_link");
  if (existingLink) {
    existingLink.remove();
  }
}

async function initializeLinkToCurrentMatch(
  userSettings: UserSettings
): Promise<void> {
  if (!isProfilePage()) {
    return;
  }

  if (is404Page()) {
    return;
  }

  const existingLink = document.querySelector(
    '[data-clutch-extension="current-match-link"]'
  );

  // If feature is disabled, always clean up
  if (!userSettings.showLinkToCurrentMatch) {
    cleanupCurrentMatchLink();
    return;
  }

  // If feature is enabled but link already exists, don't re-render
  if (existingLink) {
    return;
  }

  const playerId = getPlayerIdFromUrl();
  if (!playerId) {
    return;
  }

  await displayLinkToCurrentMatch(playerId);
}

registerFeature({
  settingKey: "showLinkToCurrentMatch",
  category: "profile",
  defaultValue: false,
  description: "Show link to current match in player's profile",
  handler: initializeLinkToCurrentMatch,
  cleanupHandler: cleanupCurrentMatchLink,
  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["profile"]),
    ActivationHelpers.whenEnabled("showLinkToCurrentMatch")
  ),
  apiCalls: [
    { requestType: "fetchLiveMatches", responseType: "liveMatchesResponse" },
  ],
});
