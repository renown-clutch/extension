import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { getCurrentPage } from "$utils/common/pageUtils";
import browserAPI from "$system/lib/browserAPI";
import { getUserSteamId } from "$system/auth/steamIdParser";
import { waitForElement } from "$utils/profileUtils";
import { createRankBadgeElement } from "$utils/data/rankBadgeUtils";
import { getStoredUIState, saveUIState } from "$utils/ui/uiStateUtils";

const MATCHES_EXPANDED_KEY = "clutchLastMatchesExpanded";

async function getStoredExpandedState(): Promise<boolean> {
  try {
    const result = (await browserAPI.storage.local.get(
      MATCHES_EXPANDED_KEY
    )) as Record<string, boolean>;
    return result[MATCHES_EXPANDED_KEY] ?? false; // Default to collapsed
  } catch (error) {
    return false; // Default to collapsed on error
  }
}

async function saveExpandedState(isExpanded: boolean): Promise<void> {
  try {
    await browserAPI.storage.local.set({ [MATCHES_EXPANDED_KEY]: isExpanded });
  } catch (error) {
    // Silently fail
  }
}

interface Match {
  match_id: number;
  map: string;
  played_at: string;
  team_score: number;
  opponent_score: number;
  won: boolean;
  kills: number;
  assists: number;
  deaths: number;
  adr: number;
  elo_before: number;
  elo_change: number;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date
    .toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", " ·");
}

function removeLastMatches(): void {
  const pastMatchesContainer = document.querySelector(".clutch-past-matches");
  if (pastMatchesContainer) {
    pastMatchesContainer.remove();
  }

  // Remove injected CSS
  const styleElement = document.getElementById("clutch-last-matches-styles");
  if (styleElement) {
    styleElement.remove();
  }
}

async function injectLastMatches(settings: UserSettings): Promise<void> {
  const existingLastMatches = document.querySelector(".clutch-past-matches");
  if (existingLastMatches) {
    return;
  }

  const liveMatchesDiv = await waitForElement("div.live-matches");
  if (!liveMatchesDiv) {
    return;
  }

  // Get the user's Steam ID dynamically
  const steamId = await getUserSteamId();
  if (!steamId) {
    return;
  }

  try {
    const response = await browserAPI.runtime.sendMessage({
      type: "fetchUserLastMatches",
      steamId: steamId,
    });

    if (!response || !response.success || !response.data?.matches) {
      return;
    }

    const matches: Match[] = response.data.matches;

    const pastMatchesContainer = document.createElement("div");
    pastMatchesContainer.className = "profile-match-list clutch-past-matches";

    const titleDiv = document.createElement("div");
    titleDiv.className = "clutch-last-matches-title";

    const leftSection = document.createElement("div");
    leftSection.className = "clutch-title-left-section";

    leftSection.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-history-icon lucide-history clutch-history-icon">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M12 7v5l4 2"/>
        </svg>
        <span class="clutch-title-text">Your last 3 matches</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="clutch-title-arrow">
            <path d="M7 10L12 15L17 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;

    const rightSection = document.createElement("div");
    rightSection.className = "clutch-title-right-section";
    rightSection.innerHTML = `
        <a href="/profile/${steamId}/matches">
            <span>View all matches</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-up-right-icon lucide-move-up-right">
                <path d="M13 5H19V11"></path>
                <path d="M19 5L5 19"></path>
            </svg>
        </a>
    `;

    // Create a container for match links that will be animated
    const matchesContainer = document.createElement("div");
    const isExpanded = await getStoredUIState(MATCHES_EXPANDED_KEY);
    matchesContainer.className = `clutch-matches-container ${
      isExpanded ? "expanded" : "collapsed"
    }`;

    // Add toggle functionality
    let isExpandedState = isExpanded;
    const arrow = leftSection.querySelector(
      ".clutch-title-arrow"
    ) as SVGElement;

    // Update arrow initial state
    if (arrow) {
      arrow.classList.toggle("expanded", isExpandedState);
    }

    leftSection.addEventListener("click", () => {
      isExpandedState = !isExpandedState;
      if (arrow) {
        arrow.classList.toggle("expanded", isExpandedState);
      }
      matchesContainer.classList.toggle("expanded", isExpandedState);
      matchesContainer.classList.toggle("collapsed", !isExpandedState);
      saveUIState(MATCHES_EXPANDED_KEY, isExpandedState);
    });

    titleDiv.appendChild(leftSection);
    titleDiv.appendChild(rightSection);

    // Add header
    const headerDiv = document.createElement("div");
    headerDiv.className = "header clutch-last-matches-header";
    headerDiv.innerHTML = `
        <div class="map">Map & Time</div>
        <div class="score">Score</div>
        <div class="stats">K / A / D</div>
        <div class="adr">ADR</div>
        <div class="elo">Elo</div>
    `;
    matchesContainer.appendChild(headerDiv);

    // Add match entries from the API data
    matches.forEach((match) => {
      let mapName = `de_${match.map.toLowerCase().replace(" ", "_")}`;
      if (mapName === "de_dust_ii") {
        mapName = "de_dust2";
      }
      const matchLink = document.createElement("a");
      matchLink.className = `match ${match.won ? "won" : "lost"}`;
      matchLink.href = `/match/${match.match_id}`;
      matchLink.style.setProperty(
        "--match-bg",
        `url(https://cdn.renown.gg/images/maps/backgrounds/${mapName}.png)`
      );

      matchLink.innerHTML = `
                <div class="map">
                    <img alt="${
                      match.map
                    } icon" loading="lazy" width="32" height="32" decoding="async" data-nimg="1" 
                         src="https://cdn.renown.gg/images/maps/icons/${mapName}.svg" style="color: transparent;">
                    <div class="map-name">${
                      match.map
                    }<span class="match-start"> ${formatDate(
        match.played_at
      )}</span></div>
                </div>
                <div class="score">
                    <div class="badge"><div class="match-result-card ${
                      match.won ? "win" : "loss"
                    }">${match.won ? "W" : "L"}</div></div>
                    <div class="numbers"><span>${
                      match.team_score
                    }</span><span>:</span><span>${
        match.opponent_score
      }</span></div>
                </div>
                <div class="stats">${match.kills} / ${match.assists} / ${
        match.deaths
      }</div>
                <div class="adr">${match.adr}</div>
                <div class="elo">
                    ${
                      createRankBadgeElement(match.elo_before, 28, true)
                        .outerHTML
                    }
                    <div class="elo-change ${
                      match.elo_change >= 0 ? "positive" : "negative"
                    }">
                        ${match.elo_change >= 0 ? "+" : ""}${match.elo_change}
                    </div>
                </div>
            `;

      matchesContainer.appendChild(matchLink);
    });

    pastMatchesContainer.appendChild(titleDiv);
    pastMatchesContainer.appendChild(matchesContainer);

    // Insert the past matches container before the live matches div
    liveMatchesDiv.parentNode?.insertBefore(
      pastMatchesContainer,
      liveMatchesDiv
    );
  } catch (error) {
    console.error("[LastMatches] ❌ Exception in injectLastMatches:", error);
  }
}

async function initializeLastMatches(settings: UserSettings): Promise<void> {
  if (!settings) {
    return;
  }

  const currentPage = getCurrentPage();

  if (currentPage.type !== "play") {
    return;
  }

  if (!settings.showLastPlayedMatches) {
    removeLastMatches();
    return;
  }

  await injectLastMatches(settings);
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "showLastPlayedMatches",
  category: "mainPage",
  defaultValue: true,
  description: "Show last played matches",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["play"]),
    ActivationHelpers.whenEnabled("showLastPlayedMatches")
  ),

  handler: initializeLastMatches,

  apiCalls: [
    {
      requestType: "fetchUserLastMatches",
      responseType: "user_last_matches_data",
    },
  ],
});
