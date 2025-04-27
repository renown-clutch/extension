import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";
import { createRankBadgeElement } from "../utils/rankBadgeUtils";
import { createFaceitBadgeElement } from "../utils/faceitUtils";
import { waitForElement } from "../utils/profileUtils";

// Keep track of observer and state
let currentObserver: MutationObserver | null = null;
let matchScoreObserver: MutationObserver | null = null;
let isFeatureEnabled = false;
let isFaceitFeatureEnabled = false;
let processedTeams = new Set<HTMLElement>();
let processedMatchHeaders = new Set<HTMLElement>();
let addedBadges: HTMLElement[] = [];

/**
 * Checks if the extension context is still valid
 */
function isExtensionContextValid(): boolean {
  return chrome.runtime && !!chrome.runtime.id;
}

/**
 * Initialize the team average ELO feature
 */
export function initialize(enabled: boolean, faceitEnabled = false) {
  try {
    // Check if extension context is still valid before initializing
    if (!isExtensionContextValid()) {
      console.warn(
        "Extension context invalid, skipping team average ELO initialization"
      );
      return;
    }

    console.log(
      "Initializing team average ELO with enabled:",
      enabled,
      "faceitEnabled:",
      faceitEnabled
    );

    // Always clean up existing badges when initializing
    cleanupBadges();

    // Ensure we're not in an inconsistent state
    if (currentObserver) {
      disconnectSafeObserver(currentObserver);
      currentObserver = null;
    }

    if (matchScoreObserver) {
      disconnectSafeObserver(matchScoreObserver);
      matchScoreObserver = null;
    }

    // Update feature state
    isFeatureEnabled = enabled;
    isFaceitFeatureEnabled = faceitEnabled;
    processedTeams = new Set();
    processedMatchHeaders = new Set();

    // If feature is disabled, we already cleaned up badges
    if (!enabled) {
      return;
    }

    // Create observer to watch for new team stat tables and match headers
    currentObserver = createSafeObserver(
      (mutations) => {
        // Skip processing if feature has been disabled
        if (!isFeatureEnabled) return;

        let shouldProcessTables = false;
        let shouldProcessMatchHeader = false;

        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            // Check for team stats tables
            const tables = document.querySelectorAll(".team-stats-table");
            if (tables.length > 0) {
              shouldProcessTables = true;
            }

            // Check for match score wrapper
            const matchScoreWrappers = document.querySelectorAll(
              ".match-score-wrapper"
            );
            if (matchScoreWrappers.length > 0) {
              shouldProcessMatchHeader = true;
            }

            if (shouldProcessTables && shouldProcessMatchHeader) break;
          }
        }

        if (shouldProcessTables) {
          // Find all team tables and process each one
          const teamTables = document.querySelectorAll(".team-stats-table");
          console.log("Found team tables:", teamTables.length);
          teamTables.forEach((table) => {
            if (!processedTeams.has(table as HTMLElement)) {
              processTeamTable(table as HTMLElement);
            }
          });
        }

        if (shouldProcessMatchHeader) {
          // Process match score header
          const matchScoreWrappers = document.querySelectorAll(
            ".match-score-wrapper"
          );
          console.log("Found match score wrappers:", matchScoreWrappers.length);
          matchScoreWrappers.forEach((wrapper) => {
            if (!processedMatchHeaders.has(wrapper as HTMLElement)) {
              processMatchHeader(wrapper as HTMLElement);
            }
          });
        }
      },
      () => document.body,
      { childList: true, subtree: true }
    );

    // Immediately check for existing elements
    console.log("Checking for existing elements");

    // Process any existing team tables
    const teamTables = document.querySelectorAll(".team-stats-table");
    console.log("Found existing team tables:", teamTables.length);
    teamTables.forEach((table) => {
      processTeamTable(table as HTMLElement);
    });

    // Process any existing match headers
    const matchScoreWrappers = document.querySelectorAll(
      ".match-score-wrapper"
    );
    console.log(
      "Found existing match score wrappers:",
      matchScoreWrappers.length
    );
    matchScoreWrappers.forEach((wrapper) => {
      processMatchHeader(wrapper as HTMLElement);
    });

    // If nothing was found immediately, try again with a delay
    if (teamTables.length === 0 || matchScoreWrappers.length === 0) {
      console.log("No elements found immediately, trying with delay");
      setTimeout(() => {
        const delayedTeamTables =
          document.querySelectorAll(".team-stats-table");
        const delayedMatchScoreWrappers = document.querySelectorAll(
          ".match-score-wrapper"
        );

        console.log("Delayed search found:", {
          tables: delayedTeamTables.length,
          wrappers: delayedMatchScoreWrappers.length,
        });

        delayedTeamTables.forEach((table) => {
          if (!processedTeams.has(table as HTMLElement)) {
            processTeamTable(table as HTMLElement);
          }
        });

        delayedMatchScoreWrappers.forEach((wrapper) => {
          if (!processedMatchHeaders.has(wrapper as HTMLElement)) {
            processMatchHeader(wrapper as HTMLElement);
          }
        });
      }, 2000);
    }
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn(
        "Extension context invalidated during team average ELO initialization"
      );
    } else {
      console.error("Error initializing team average ELO:", error);
    }
  }
}

/**
 * Clean up any badges that have been added to the page
 */
function cleanupBadges() {
  addedBadges.forEach((badge) => {
    if (badge && badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }
  });

  addedBadges = [];

  // Also clean up by data attribute (more thorough cleanup)
  const elements = document.querySelectorAll(
    '[data-clutch-extension="team-average-elo-element"], [data-clutch-extension="team-average-elo-match-header"]'
  );
  elements.forEach((element) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
}

/**
 * Process a single team table and add average ELO badges
 */
async function processTeamTable(table: HTMLElement) {
  try {
    // Mark as processed to avoid duplicate processing
    processedTeams.add(table);

    // Find the heading element within this specific table
    const heading = table.querySelector(".heading");
    if (!heading) return;

    // Find the h3 element within the heading
    const h3 = heading.querySelector("h3");
    if (!h3) return;

    // Wait for the table to have player rows before calculating
    const rows = table.querySelectorAll(".row");
    if (rows.length === 0) {
      // Wait briefly for rows to appear
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // If Faceit feature is enabled, give time for Faceit data to load
    if (isFaceitFeatureEnabled) {
      // Wait a bit for Faceit data to appear
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // Calculate average ELOs
    const avgRenownElo = calculateTeamAverageElo(table);
    const avgFaceitElo = isFaceitFeatureEnabled
      ? calculateTeamAverageFaceitElo(table)
      : null;

    // Only proceed if we have at least one valid average
    if (avgRenownElo === null && avgFaceitElo === null) return;

    // Check if there's already a badge and remove it to prevent duplicates
    const existingBadge = heading.querySelector(
      '[data-clutch-extension="team-average-elo-element"]'
    );
    if (existingBadge && existingBadge.parentNode) {
      existingBadge.parentNode.removeChild(existingBadge);
      // Also remove from tracking array if it exists
      const index = addedBadges.indexOf(existingBadge as HTMLElement);
      if (index !== -1) {
        addedBadges.splice(index, 1);
      }
    }

    // Create wrapper with styling similar to highest ELO
    const wrapper = document.createElement("div");
    wrapper.style.cssText =
      "display: flex; align-items: center; gap: 1rem; border-left: solid var(--slate-600); padding-left: 1rem; margin-left: 8px;";
    wrapper.setAttribute("data-clutch-extension", "team-average-elo-element");
    wrapper.setAttribute(
      "data-team-id",
      table.getAttribute("data-team-id") || ""
    );

    // Add "Average Team Rank:" label
    const avgRankLabel = document.createElement("div");
    avgRankLabel.textContent = "Average Team Rank:";
    avgRankLabel.style.fontSize = "14px";
    wrapper.appendChild(avgRankLabel);

    // Create a container for the badges to display them side by side
    const badgesContainer = document.createElement("div");
    badgesContainer.style.cssText =
      "display: flex; align-items: center; gap: 8px;";

    // Add Renown rank badge if available
    if (avgRenownElo !== null) {
      const rankBadgeElement = createRankBadgeElement(avgRenownElo, 25, true);
      badgesContainer.appendChild(rankBadgeElement);
    }

    // Add Faceit badge if available
    if (avgFaceitElo !== null) {
      const faceitBadgeElement = createFaceitBadgeElement(
        avgFaceitElo,
        25,
        true,
        "margin-top: 1px;"
      );
      badgesContainer.appendChild(faceitBadgeElement);
    }

    // Add badges container to the wrapper
    wrapper.appendChild(badgesContainer);

    // Add wrapper to heading after h3
    h3.insertAdjacentElement("afterend", wrapper);

    // Track added badge for cleanup
    addedBadges.push(wrapper);
  } catch (error) {
    console.error("Error processing team table:", error);
  }
}

/**
 * Calculate average Renown ELO for a team
 */
function calculateTeamAverageElo(teamStatsTable: HTMLElement): number | null {
  try {
    // Find all rank badges in player rows
    const rankBadges = teamStatsTable.querySelectorAll(".rank-badge");
    if (rankBadges.length === 0) return null;

    let totalElo = 0;
    let playerCount = 0;

    rankBadges.forEach((badge) => {
      // Extract ELO from aria-label or find the span with ELO text
      const ariaLabel = badge.getAttribute("aria-label");
      let eloValue: number | null = null;

      if (ariaLabel) {
        // Extract ELO from aria-label (format: "Rank: Diamond, Elo: 20892")
        const match = ariaLabel.match(/Elo: ([0-9,]+)/);
        if (match && match[1]) {
          eloValue = parseInt(match[1].replace(/,/g, ""), 10);
        }
      }

      // If we couldn't get ELO from aria-label, try to get it from the span
      if (eloValue === null) {
        const eloSpan = badge.querySelector("span");
        if (eloSpan && eloSpan.textContent) {
          eloValue = parseInt(eloSpan.textContent.replace(/,/g, ""), 10);
        }
      }

      if (eloValue !== null && !isNaN(eloValue)) {
        totalElo += eloValue;
        playerCount++;
      }
    });

    if (playerCount === 0) return null;

    return Math.round(totalElo / playerCount);
  } catch (error) {
    console.error("Error calculating team average ELO:", error);
    return null;
  }
}

/**
 * Calculate average Faceit ELO for a team
 */
function calculateTeamAverageFaceitElo(
  teamStatsTable: HTMLElement
): number | null {
  try {
    // Find all Faceit icons in player rows
    const faceitIcons = teamStatsTable.querySelectorAll(".faceit-icon");
    if (faceitIcons.length === 0) return null;

    let totalElo = 0;
    let playerCount = 0;

    faceitIcons.forEach((icon) => {
      if (icon instanceof HTMLElement) {
        // Extract ELO from tooltip text or aria-label
        const tooltipElement = icon.querySelector(".clutch-tooltip");
        let eloValue: number | null = null;

        if (tooltipElement && tooltipElement.textContent) {
          // Extract ELO from tooltip (format: "Faceit Level 10 (ELO: 2338)")
          const match = tooltipElement.textContent.match(/ELO: (\d+)/);
          if (match && match[1]) {
            eloValue = parseInt(match[1], 10);
          }
        }

        // If not found in tooltip, try from img alt attribute
        if (eloValue === null) {
          const imgElement = icon.querySelector("img");
          if (imgElement) {
            const altText = imgElement.getAttribute("alt");
            if (altText) {
              const match = altText.match(/ELO: (\d+)/);
              if (match && match[1]) {
                eloValue = parseInt(match[1], 10);
              }
            }
          }
        }

        if (eloValue !== null && !isNaN(eloValue)) {
          totalElo += eloValue;
          playerCount++;
        }
      }
    });

    if (playerCount === 0) return null;

    return Math.round(totalElo / playerCount);
  } catch (error) {
    console.error("Error calculating team average Faceit ELO:", error);
    return null;
  }
}

/**
 * Process the match header and add average ELO badges
 */
async function processMatchHeader(wrapper: HTMLElement) {
  try {
    console.log("Processing match header", wrapper);

    // Mark as processed to avoid duplicate processing
    processedMatchHeaders.add(wrapper);

    // Find the match score container
    const matchScore = wrapper.querySelector(".match-score");
    if (!matchScore) {
      console.log("No match score container found");
      return;
    }

    // Find team1 and team2 elements
    const team1 = matchScore.querySelector(".team1");
    const team2 = matchScore.querySelector(".team2");
    if (!team1 || !team2) {
      console.log("Team elements not found", { team1, team2 });
      return;
    }

    // Find team names
    const team1Name = team1.querySelector(".team-name");
    const team2Name = team2.querySelector(".team-name");
    if (!team1Name || !team2Name) {
      console.log("Team name elements not found", { team1Name, team2Name });
      return;
    }

    console.log(
      "Found team names:",
      team1Name.textContent,
      team2Name.textContent
    );

    // Wait for player data to be available - reduced initial timeout to increase responsiveness
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get team names to match with player data
    const team1NameText = team1Name.textContent?.trim() || "";
    const team2NameText = team2Name.textContent?.trim() || "";

    // Directly calculate averages from player table rows which are more reliable
    const playerElements = document.querySelectorAll(
      "tr .player, .row .player"
    );
    console.log("Found player elements:", playerElements.length);

    // Get player ELO data based on the player elements visible on the page
    const allPlayerElos: {
      steamId: string;
      renownElo: number | null;
      faceitElo: number | null;
      team?: string; // Try to determine team if possible
    }[] = [];

    // First attempt: look for players with team information
    let teamInfoAvailable = false;
    document.querySelectorAll("tr .player, .row .player").forEach((player) => {
      if (player instanceof HTMLElement) {
        // Get steam ID from href
        const href = player.getAttribute("href");
        const steamId = href ? href.replace("/profile/", "") : null;
        if (!steamId) return;

        // Try to determine team
        let team: string | undefined = undefined;
        // Look for team name in parent elements
        let currentElement = player.parentElement;
        const maxDepth = 5; // Limit search depth to avoid performance issues
        for (let i = 0; i < maxDepth && currentElement; i++) {
          const teamNameElement = currentElement.querySelector(
            ".team-name, .team-title"
          );
          if (teamNameElement && teamNameElement.textContent) {
            team = teamNameElement.textContent.trim();
            teamInfoAvailable = true;
            break;
          }
          currentElement = currentElement.parentElement;
        }

        // Find Renown ELO
        let renownElo: number | null = null;
        const rankBadge = player
          .closest("tr, .row")
          ?.querySelector(".rank-badge");
        if (rankBadge) {
          const ariaLabel = rankBadge.getAttribute("aria-label");
          if (ariaLabel) {
            const match = ariaLabel.match(/Elo: ([0-9,]+)/);
            if (match && match[1]) {
              renownElo = parseInt(match[1].replace(/,/g, ""), 10);
            }
          }

          if (renownElo === null) {
            const eloSpan = rankBadge.querySelector("span");
            if (eloSpan && eloSpan.textContent) {
              renownElo = parseInt(eloSpan.textContent.replace(/,/g, ""), 10);
            }
          }
        }

        // Find Faceit ELO
        let faceitElo: number | null = null;
        const faceitIcon = player
          .closest("tr, .row")
          ?.querySelector(".faceit-icon");

        if (faceitIcon instanceof HTMLElement) {
          const tooltipElement = faceitIcon.querySelector(".clutch-tooltip");
          if (tooltipElement && tooltipElement.textContent) {
            const match = tooltipElement.textContent.match(/ELO: (\d+)/);
            if (match && match[1]) {
              faceitElo = parseInt(match[1], 10);
            }
          }
        }

        console.log(
          `Player ELO data: ${player.textContent?.trim()} - Renown: ${renownElo}, Faceit: ${faceitElo}, Team: ${team}`
        );
        allPlayerElos.push({ steamId, renownElo, faceitElo, team });
      }
    });

    let team1Elos: typeof allPlayerElos;
    let team2Elos: typeof allPlayerElos;

    // If we found team info, use it to split players
    if (teamInfoAvailable) {
      team1Elos = allPlayerElos.filter(
        (p) => p.team && p.team.includes(team1NameText)
      );
      team2Elos = allPlayerElos.filter(
        (p) => p.team && p.team.includes(team2NameText)
      );

      // If no matches were found with direct team name, use half-and-half approach
      if (team1Elos.length === 0 || team2Elos.length === 0) {
        const halfIndex = Math.floor(allPlayerElos.length / 2);
        team1Elos = allPlayerElos.slice(0, halfIndex);
        team2Elos = allPlayerElos.slice(halfIndex);
      }
    } else {
      // Fallback: split players into teams - first half is team1, second half is team2
      const halfIndex = Math.floor(allPlayerElos.length / 2);
      team1Elos = allPlayerElos.slice(0, halfIndex);
      team2Elos = allPlayerElos.slice(halfIndex);
    }

    console.log("Team 1 ELOs:", team1Elos);
    console.log("Team 2 ELOs:", team2Elos);

    // Calculate averages
    const team1Averages = {
      avgRenownElo: calculateAverageElo(
        team1Elos.map((p) => p.renownElo).filter(Boolean) as number[]
      ),
      avgFaceitElo: isFaceitFeatureEnabled
        ? calculateAverageElo(
            team1Elos.map((p) => p.faceitElo).filter(Boolean) as number[]
          )
        : null,
    };

    const team2Averages = {
      avgRenownElo: calculateAverageElo(
        team2Elos.map((p) => p.renownElo).filter(Boolean) as number[]
      ),
      avgFaceitElo: isFaceitFeatureEnabled
        ? calculateAverageElo(
            team2Elos.map((p) => p.faceitElo).filter(Boolean) as number[]
          )
        : null,
    };

    console.log("Team 1 Averages:", team1Averages);
    console.log("Team 2 Averages:", team2Averages);

    // Create and add badges for team1
    if (
      team1Averages.avgRenownElo !== null ||
      team1Averages.avgFaceitElo !== null
    ) {
      // Check for existing badges and remove them
      const existingBadge = team1.querySelector(
        '[data-clutch-extension="team-average-elo-match-header"]'
      );
      if (existingBadge && existingBadge.parentNode) {
        existingBadge.parentNode.removeChild(existingBadge);
        // Also remove from tracking array
        const index = addedBadges.indexOf(existingBadge as HTMLElement);
        if (index !== -1) {
          addedBadges.splice(index, 1);
        }
      }

      // Create container for team1 badges with improved visibility
      const badgesContainer = document.createElement("div");
      badgesContainer.style.cssText =
        "display: flex; align-items: center; margin-right: 8px; border-right: 2px solid var(--slate-600); padding-right: 8px; min-height: 30px; z-index: 10;";
      badgesContainer.setAttribute(
        "data-clutch-extension",
        "team-average-elo-match-header"
      );
      badgesContainer.setAttribute("data-team", "1");

      // Create wrapper for badges to display them side by side
      const badgesWrapper = document.createElement("div");
      badgesWrapper.style.cssText =
        "display: flex; align-items: center; gap: 8px;";

      // Add Renown rank badge if available
      if (team1Averages.avgRenownElo !== null) {
        const rankBadgeElement = createRankBadgeElement(
          team1Averages.avgRenownElo,
          24, // Increased size for better visibility
          true
        );
        badgesWrapper.appendChild(rankBadgeElement);
      }

      // Add Faceit badge if available and feature enabled
      if (isFaceitFeatureEnabled && team1Averages.avgFaceitElo !== null) {
        const faceitBadgeElement = createFaceitBadgeElement(
          team1Averages.avgFaceitElo,
          24, // Increased size for better visibility
          true,
          "margin-top: 1px;"
        );
        badgesWrapper.appendChild(faceitBadgeElement);
      }

      badgesContainer.appendChild(badgesWrapper);

      // Insert before team name with more robust insertion
      const team1Content = team1.querySelector(".content");
      if (team1Content) {
        // Try to insert after team result if it exists, otherwise before team name
        const teamResult = team1Content.querySelector(".team-result");

        if (teamResult && teamResult.nextSibling) {
          team1Content.insertBefore(badgesContainer, teamResult.nextSibling);
          console.log("Added badges to team1 after team result");
        } else if (team1Name) {
          team1Content.insertBefore(badgesContainer, team1Name);
          console.log("Added badges to team1 before team name");
        } else {
          // Last resort - append to content
          team1Content.appendChild(badgesContainer);
          console.log("Added badges to team1 content (appended)");
        }

        // Track added badge for cleanup
        addedBadges.push(badgesContainer);
      } else {
        console.log("No team1 content element found");
      }
    }

    // Create and add badges for team2
    if (
      team2Averages.avgRenownElo !== null ||
      team2Averages.avgFaceitElo !== null
    ) {
      // Check for existing badges and remove them
      const existingBadge = team2.querySelector(
        '[data-clutch-extension="team-average-elo-match-header"]'
      );
      if (existingBadge && existingBadge.parentNode) {
        existingBadge.parentNode.removeChild(existingBadge);
        // Also remove from tracking array
        const index = addedBadges.indexOf(existingBadge as HTMLElement);
        if (index !== -1) {
          addedBadges.splice(index, 1);
        }
      }

      // Create container for team2 badges with improved visibility
      const badgesContainer = document.createElement("div");
      badgesContainer.style.cssText =
        "display: flex; align-items: center; margin-left: 8px; border-left: 2px solid var(--slate-600); padding-left: 8px; min-height: 30px; z-index: 10;";
      badgesContainer.setAttribute(
        "data-clutch-extension",
        "team-average-elo-match-header"
      );
      badgesContainer.setAttribute("data-team", "2");

      // Create wrapper for badges to display them side by side
      const badgesWrapper = document.createElement("div");
      badgesWrapper.style.cssText =
        "display: flex; align-items: center; gap: 8px;";

      // Add Renown rank badge if available
      if (team2Averages.avgRenownElo !== null) {
        const rankBadgeElement = createRankBadgeElement(
          team2Averages.avgRenownElo,
          24, // Increased size for better visibility
          true
        );
        badgesWrapper.appendChild(rankBadgeElement);
      }

      // Add Faceit badge if available and feature enabled
      if (isFaceitFeatureEnabled && team2Averages.avgFaceitElo !== null) {
        const faceitBadgeElement = createFaceitBadgeElement(
          team2Averages.avgFaceitElo,
          24, // Increased size for better visibility
          true,
          "margin-top: 1px;"
        );
        badgesWrapper.appendChild(faceitBadgeElement);
      }

      badgesContainer.appendChild(badgesWrapper);

      // More robust insertion for team2
      const team2Content = team2.querySelector(".content");
      if (team2Content) {
        // For team2, we typically want to append after the team name
        const teamName = team2Content.querySelector(".team-name");
        if (teamName && teamName.nextSibling) {
          team2Content.insertBefore(badgesContainer, teamName.nextSibling);
          console.log("Added badges to team2 after team name");
        } else {
          // Append to the end of content as fallback
          team2Content.appendChild(badgesContainer);
          console.log("Added badges to team2 content (appended)");
        }

        // Track added badge for cleanup
        addedBadges.push(badgesContainer);
      } else {
        console.log("No team2 content element found");
      }
    }

    // Set up observer for team position changes
    setupMatchScoreObserver(wrapper);
  } catch (error) {
    console.error("Error processing match header:", error);
  }
}

/**
 * Helper function to calculate average ELO from an array of numbers
 */
function calculateAverageElo(elos: number[]): number | null {
  if (elos.length === 0) return null;

  const sum = elos.reduce((total, elo) => total + elo, 0);
  return Math.round(sum / elos.length);
}

/**
 * Set up observer to detect team position changes in match header
 */
function setupMatchScoreObserver(wrapper: HTMLElement) {
  if (matchScoreObserver) {
    disconnectSafeObserver(matchScoreObserver);
  }

  matchScoreObserver = createSafeObserver(
    (mutations) => {
      if (!isFeatureEnabled) return;

      let teamSwitchDetected = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList" || mutation.type === "attributes") {
          // Check for class changes or DOM structure changes that might indicate team switching
          teamSwitchDetected = true;
          break;
        }
      }

      if (teamSwitchDetected) {
        // Remove from processed set to force reprocessing
        processedMatchHeaders.delete(wrapper);

        // Remove existing badges for this wrapper
        const badges = wrapper.querySelectorAll(
          '[data-clutch-extension="team-average-elo-match-header"]'
        );
        badges.forEach((badge) => {
          if (badge.parentNode) {
            badge.parentNode.removeChild(badge);
            // Remove from tracking array
            const index = addedBadges.indexOf(badge as HTMLElement);
            if (index !== -1) {
              addedBadges.splice(index, 1);
            }
          }
        });

        // Reprocess the header
        setTimeout(() => {
          processMatchHeader(wrapper);
        }, 100);
      }
    },
    () => wrapper,
    { childList: true, subtree: true, attributes: true }
  );
}

/**
 * Updates the team average ELO feature settings
 */
export function updateSettings(enabled: boolean, faceitEnabled = false) {
  try {
    // Check if extension context is still valid before updating settings
    if (!isExtensionContextValid()) {
      console.warn(
        "Extension context invalid, skipping team average ELO settings update"
      );
      return;
    }

    // Always clean up existing badges to prevent duplication when settings change
    cleanupBadges();

    // Only reinitialize if at least one feature is enabled
    if (enabled) {
      initialize(enabled, faceitEnabled);
    }
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn(
        "Extension context invalidated when updating team average ELO settings"
      );
    } else {
      console.error("Error updating team average ELO settings:", error);
    }
  }
}
