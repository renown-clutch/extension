import { type UserSettings } from "../lib/types";
import { getCurrentPage } from "../utils/pageUtils";
import browserAPI from "../lib/browserAPI";
import { getUserSteamId } from "../steamId/steamIdParser";
import { waitForElement } from "../utils/profileUtils";

const MATCHES_EXPANDED_KEY = "clutchLastMatchesExpanded";

async function getStoredExpandedState(): Promise<boolean> {
  try {
    const result = (await browserAPI.storage.local.get(
      MATCHES_EXPANDED_KEY
    )) as Record<string, boolean>;
    return result[MATCHES_EXPANDED_KEY] ?? false; // Default to collapsed
  } catch (error) {
    console.error("Error loading matches expanded state:", error);
    return false; // Default to collapsed on error
  }
}

async function saveExpandedState(isExpanded: boolean): Promise<void> {
  try {
    await browserAPI.storage.local.set({ [MATCHES_EXPANDED_KEY]: isExpanded });
  } catch (error) {
    console.error("Error saving matches expanded state:", error);
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

async function injectLastMatches(settings: UserSettings): Promise<void> {
  const liveMatchesDiv = await waitForElement("div.live-matches");
  if (!liveMatchesDiv) return;

  // Get the user's Steam ID dynamically
  const steamId = await getUserSteamId();
  if (!steamId) {
    console.error("Could not get user's Steam ID");
    return;
  }

  try {
    const response = await browserAPI.runtime.sendMessage({
      type: "fetchUserLastMatches",
      steamId: steamId,
    });

    if (!response.success || !response.data?.matches) {
      console.error("Failed to fetch last matches:", response.error);
      return;
    }

    const matches: Match[] = response.data.matches;

    // Create the container for past matches
    const pastMatchesContainer = document.createElement("div");
    pastMatchesContainer.className = "profile-match-list clutch-past-matches";
    Object.assign(pastMatchesContainer.style, {
      marginTop: "2.5rem",
      marginBottom: "-4rem",
    });

    // Create and append the title section
    const titleDiv = document.createElement("div");
    titleDiv.className = "clutch-last-matches-title";
    Object.assign(titleDiv.style, {
      display: "flex",
      justifyContent: "space-between",
      scrollMarginTop: "30px",
      alignItems: "center",
    });

    const leftSection = document.createElement("div");
    Object.assign(leftSection.style, {
      display: "flex",
      alignItems: "center",
    });

    leftSection.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-history-icon lucide-history" style="margin-right: 12px;">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M12 7v5l4 2"/>
        </svg>
        <span style="margin-right: 6px; font-weight: 500; font-size: 18px;">Your last 3 matches</span>
        <button class="clutch-matches-toggle" style="background: none; border: none; cursor: pointer; padding: 0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="transform: rotate(0deg); transition: transform 0.3s ease;">
                <path d="M7 10L12 15L17 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    `;

    const rightSection = document.createElement("div");
    Object.assign(rightSection.style, {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      color: "white",
    });
    rightSection.innerHTML = `
        <a href="/profile/${steamId}/matches" style="display: flex; align-items: center; gap: 4px; color: white; text-decoration: none; transition: opacity 0.2s;">
            <span style="font-weight: 500; font-size: 14px; opacity: 0.7; transition: opacity 0.2s;">View all matches</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-up-right-icon lucide-move-up-right" style="opacity: 0.7; transition: opacity 0.2s;">
                <path d="M13 5H19V11"></path>
                <path d="M19 5L5 19"></path>
            </svg>
        </a>
    `;

    // Add hover effect
    const viewAllLink = rightSection.querySelector("a");
    if (viewAllLink) {
      viewAllLink.addEventListener("mouseenter", () => {
        const span = viewAllLink.querySelector("span");
        const svg = viewAllLink.querySelector("svg");
        if (span) span.style.opacity = "1";
        if (svg) svg.style.opacity = "1";
      });

      viewAllLink.addEventListener("mouseleave", () => {
        const span = viewAllLink.querySelector("span");
        const svg = viewAllLink.querySelector("svg");
        if (span) span.style.opacity = "0.7";
        if (svg) svg.style.opacity = "0.7";
      });
    }

    titleDiv.appendChild(leftSection);
    titleDiv.appendChild(rightSection);

    // Create a container for match links that will be animated
    const matchesContainer = document.createElement("div");
    const isExpanded = await getStoredExpandedState();
    matchesContainer.style.cssText = `max-height: ${
      isExpanded ? "1000px" : "0"
    }; overflow: hidden; transition: max-height 0.3s ease-in-out; display: grid; gap: 8px;`;

    // Add header
    const headerDiv = document.createElement("div");
    headerDiv.className = "header clutch-last-matches-header";
    Object.assign(headerDiv.style, {
      marginTop: "12px",
      marginBottom: "8px",
      display: "grid",
    });
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
      console.log(mapName);
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
                    <div class="tooltip-wrapper" tabindex="0">
                        <div class="rank-badge diamond" aria-label="Rank: Diamond, Elo: ${
                          match.elo_before
                        }" style="--size: 28px;">
                            <img alt="Renown rank Diamond" loading="lazy" width="28" height="28" decoding="async" data-nimg="1" 
                                 src="https://cdn.renown.gg/images/ranks/diamond.svg" style="color: transparent;">
                            <span>${match.elo_before.toLocaleString()}</span>
                        </div>
                    </div>
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

    // Add toggle functionality
    const toggleButton = titleDiv.querySelector(
      ".clutch-matches-toggle"
    ) as HTMLButtonElement;
    let isExpandedState = isExpanded;

    // Update arrow initial state
    const arrow = toggleButton.querySelector("svg");
    if (arrow) {
      arrow.style.transform = isExpandedState
        ? "rotate(0deg)"
        : "rotate(180deg)";
    }

    toggleButton.addEventListener("click", () => {
      isExpandedState = !isExpandedState;
      const arrow = toggleButton.querySelector("svg");
      if (arrow) {
        arrow.style.transform = isExpandedState
          ? "rotate(0deg)"
          : "rotate(180deg)";
      }
      matchesContainer.style.maxHeight = isExpandedState ? "1000px" : "0";
      saveExpandedState(isExpandedState);
    });

    // Insert the past matches container before the live matches div
    liveMatchesDiv.parentNode?.insertBefore(
      pastMatchesContainer,
      liveMatchesDiv
    );
  } catch (error) {
    console.error("Error injecting last matches:", error);
  }
}

export function initializeLastMatches(settings: UserSettings): void {
  if (!settings) return;

  if (getCurrentPage().type !== "play") {
    return;
  }

  if (!settings.showLastPlayedMatches) {
    return;
  }

  injectLastMatches(settings);
}
