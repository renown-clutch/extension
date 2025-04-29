import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";
import { createRankBadgeElement } from "../utils/rankBadgeUtils";
import { createFaceitBadgeElement } from "../utils/faceitUtils";
import { waitForElement } from "../utils/profileUtils";

let currentObserver: MutationObserver | null = null;
let matchScoreObserver: MutationObserver | null = null;
let isFeatureEnabled = false;
let isFaceitFeatureEnabled = false;
let processedTeams = new Set<HTMLElement>();
let processedMatchHeaders = new Set<HTMLElement>();
let addedBadges: HTMLElement[] = [];

function isExtensionContextValid(): boolean {
  return chrome.runtime && !!chrome.runtime.id;
}

export async function initializeTeamAverageElo(
  enabled: boolean,
  faceitEnabled = false
) {
  try {
    // Check if extension context is still valid before initializing
    if (!isExtensionContextValid()) {
      console.warn(
        "Extension context invalid, skipping team average ELO initialization"
      );
      return;
    }

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

    // Wait for container element first
    try {
      await waitForElement(".container");

      // Check if we have exactly 2 team-stats-table elements
      const teamTables = document.querySelectorAll(".team-stats-table");
      if (teamTables.length !== 2) {
        return;
      }
    } catch (error) {
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
            if (tables.length === 2) {
              // Check if tables are already processed
              const allProcessed = Array.from(tables).every((table) =>
                processedTeams.has(table as HTMLElement)
              );

              if (!allProcessed) {
                shouldProcessTables = true;
              }
            }

            // Check for match score wrapper
            const matchScoreWrappers = document.querySelectorAll(
              ".match-score-wrapper"
            );
            if (matchScoreWrappers.length > 0) {
              // Check if all wrappers are already processed
              const allProcessed = Array.from(matchScoreWrappers).every(
                (wrapper) => processedMatchHeaders.has(wrapper as HTMLElement)
              );

              if (!allProcessed) {
                shouldProcessMatchHeader = true;
              }
            }

            if (shouldProcessTables && shouldProcessMatchHeader) break;
          }
        }

        if (shouldProcessTables) {
          // Find all team tables and process each one
          const teamTables = document.querySelectorAll(".team-stats-table");
          teamTables.forEach((table) => {
            if (!processedTeams.has(table as HTMLElement)) {
              processTeamTable(table as HTMLElement);
              // Mark as processed right after processing
              processedTeams.add(table as HTMLElement);
            }
          });
        }
      },
      () => document.body,
      { childList: true, subtree: true }
    );

    const teamTables = document.querySelectorAll(".team-stats-table");

    teamTables.forEach((table) => {
      if (!processedTeams.has(table as HTMLElement)) {
        processTeamTable(table as HTMLElement);
        // Mark as processed right after processing
        processedTeams.add(table as HTMLElement);
      }
    });

    // Process any existing match headers
    const matchScoreWrappers = document.querySelectorAll(
      ".match-score-wrapper"
    );

    matchScoreWrappers.forEach((wrapper) => {
      processMatchHeader(wrapper as HTMLElement);
    });

    // If nothing was found immediately, try again with a delay
    if (teamTables.length === 0 || matchScoreWrappers.length === 0) {
      setTimeout(() => {
        const delayedTeamTables =
          document.querySelectorAll(".team-stats-table");
        const delayedMatchScoreWrappers = document.querySelectorAll(
          ".match-score-wrapper"
        );

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

    // Check if this table was processed by another call while we were waiting
    if (
      heading.querySelector(
        '[data-clutch-extension="team-average-elo-element"]'
      )
    ) {
      return;
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
      "display: flex; align-items: center; gap: 1rem; border-left: solid var(--slate-600); padding-left: 1rem; ";
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

function calculateTeamAverageElo(container: HTMLElement): number | null {
  try {
    // Find all rank badges in the player elements
    const rankBadges = container.querySelectorAll(".rank-badge");
    let eloValues: number[] = [];

    // First try to find rank badges directly
    if (rankBadges.length > 0) {
      rankBadges.forEach((badge) => {
        // Try to get from aria-label first
        const ariaLabel = badge.getAttribute("aria-label");
        if (ariaLabel) {
          const match = ariaLabel.match(/Elo: ([0-9,]+)/);
          if (match && match[1]) {
            const eloValue = parseInt(match[1].replace(/,/g, ""), 10);
            if (!isNaN(eloValue)) {
              eloValues.push(eloValue);
            }
          }
        }

        // If not found in aria-label, try to get from span content
        if (eloValues.length === 0) {
          const eloSpan = badge.querySelector("span");
          if (eloSpan && eloSpan.textContent) {
            const eloValue = parseInt(
              eloSpan.textContent.replace(/,/g, ""),
              10
            );
            if (!isNaN(eloValue)) {
              eloValues.push(eloValue);
            }
          }
        }
      });
    }

    // If no rank badges found, try looking for .elo divs
    if (eloValues.length === 0) {
      const eloDivs = container.querySelectorAll(".elo");

      eloDivs.forEach((eloDiv) => {
        // Check for rank badge within elo div
        const rankBadge = eloDiv.querySelector(".rank-badge");
        if (rankBadge) {
          // Try to get from aria-label first
          const ariaLabel = rankBadge.getAttribute("aria-label");
          if (ariaLabel) {
            const match = ariaLabel.match(/Elo: ([0-9,]+)/);
            if (match && match[1]) {
              const eloValue = parseInt(match[1].replace(/,/g, ""), 10);
              if (!isNaN(eloValue)) {
                eloValues.push(eloValue);
              }
            }
          }

          // If not found in aria-label, try to get from span content
          if (eloValues.length === 0) {
            const eloSpan = rankBadge.querySelector("span");
            if (eloSpan && eloSpan.textContent) {
              const eloValue = parseInt(
                eloSpan.textContent.replace(/,/g, ""),
                10
              );
              if (!isNaN(eloValue)) {
                eloValues.push(eloValue);
              }
            }
          }
        }
      });
    }

    // Calculate average
    if (eloValues.length > 0) {
      const sum = eloValues.reduce((total, elo) => total + elo, 0);
      return Math.round(sum / eloValues.length);
    }

    return null;
  } catch (error) {
    console.error("[Clutch] Error calculating team average ELO:", error);
    return null;
  }
}

function calculateTeamAverageFaceitElo(container: HTMLElement): number | null {
  try {
    // Find all faceit icons in the player elements
    const faceitIcons = container.querySelectorAll(".faceit-icon");
    let eloValues: number[] = [];

    faceitIcons.forEach((icon) => {
      if (icon instanceof HTMLElement) {
        // Try to get from tooltip text
        const tooltipElement = icon.querySelector(".clutch-tooltip");
        if (tooltipElement && tooltipElement.textContent) {
          const match = tooltipElement.textContent.match(/ELO: (\d+)/);
          if (match && match[1]) {
            const eloValue = parseInt(match[1], 10);
            if (!isNaN(eloValue)) {
              eloValues.push(eloValue);
            }
          }
        }

        // If not found in tooltip, try from img alt attribute
        if (eloValues.length === 0) {
          const imgElement = icon.querySelector("img");
          if (imgElement) {
            const altText = imgElement.getAttribute("alt");
            if (altText) {
              const match = altText.match(/ELO: (\d+)/);
              if (match && match[1]) {
                const eloValue = parseInt(match[1], 10);
                if (!isNaN(eloValue)) {
                  eloValues.push(eloValue);
                }
              }
            }
          }
        }
      }
    });

    // Calculate average
    if (eloValues.length > 0) {
      const sum = eloValues.reduce((total, elo) => total + elo, 0);
      return Math.round(sum / eloValues.length);
    }

    return null;
  } catch (error) {
    console.error("[Clutch] Error calculating team average Faceit ELO:", error);
    return null;
  }
}

function processMatchHeader(wrapper?: HTMLElement) {
  try {
    // Find the match header panel
    const matchHeader = document.querySelector(".match-header");
    if (!matchHeader) {
      return;
    }

    // Save wrapper to processed set if provided
    if (wrapper) {
      processedMatchHeaders.add(wrapper);
    }

    // Find team stat tables
    const teamStatTables = document.querySelectorAll(".team-stats");
    if (teamStatTables.length !== 2) {
      // Try to find teams using the classes mentioned by the user
      const team1Players = document.querySelector(".team1-players");
      const team2Players = document.querySelector(".team2-players");

      if (team1Players && team2Players) {
        processTeamContainers(
          team1Players as HTMLElement,
          team2Players as HTMLElement
        );
        return;
      }

      // Fallback to looking for player elements
      const playerElements = document.querySelectorAll(".player");
      if (playerElements.length === 0) {
        return;
      }

      // Try to identify team containers
      const teamContainer1 = findTeamContainer(playerElements, 0);
      const teamContainer2 = findTeamContainer(playerElements, 1);

      if (teamContainer1 && teamContainer2) {
        processTeamContainers(teamContainer1, teamContainer2);
        return;
      } else {
        return;
      }
    }

    // Process each team stat table
    const team1StatsTable = teamStatTables[0] as HTMLElement;
    const team2StatsTable = teamStatTables[1] as HTMLElement;

    processTeamStatTables(team1StatsTable, team2StatsTable);
  } catch (error) {
    console.error("[Clutch] Error processing match header:", error);
  }
}

function findTeamContainer(
  playerElements: NodeListOf<Element>,
  teamIndex: number
): HTMLElement | null {
  // Group players by team
  const teams: Element[][] = [[], []];
  let currentTeam = 0;

  playerElements.forEach((player) => {
    // Check if this is the first player of the second team
    if (teams[0].length > 0 && currentTeam === 0) {
      const previousPlayer = teams[0][teams[0].length - 1];
      const previousRect = previousPlayer.getBoundingClientRect();
      const currentRect = player.getBoundingClientRect();

      // If there's a significant gap or layout change, this is likely team 2
      if (
        Math.abs(currentRect.top - previousRect.top) > 100 ||
        Math.abs(currentRect.left - previousRect.left) > 100
      ) {
        currentTeam = 1;
      }
    }

    teams[currentTeam].push(player);

    // If we have 5 players in the current team, switch to the next team
    if (teams[currentTeam].length >= 5) {
      currentTeam = 1;
    }
  });

  // Find a common parent element for the team's players
  if (teams[teamIndex].length > 0) {
    // Get the first player element
    const firstPlayer = teams[teamIndex][0];
    // Find parent that contains all players from this team
    let parent = firstPlayer.parentElement;
    while (parent) {
      let containsAllPlayers = true;
      for (const player of teams[teamIndex]) {
        if (!parent.contains(player)) {
          containsAllPlayers = false;
          break;
        }
      }

      if (containsAllPlayers) {
        return parent as HTMLElement;
      }

      parent = parent.parentElement;
    }
  }

  return null;
}

function processTeamContainers(
  team1Container: HTMLElement,
  team2Container: HTMLElement
) {
  const team1Elo = calculateTeamAverageElo(team1Container);
  const team2Elo = calculateTeamAverageElo(team2Container);

  // Find match details sections
  let team1Header = team1Container.closest(".team-info") || team1Container;
  let team2Header = team2Container.closest(".team-info") || team2Container;

  updateTeamHeader(team1Header as HTMLElement, team1Elo);
  updateTeamHeader(team2Header as HTMLElement, team2Elo);
}

function processTeamStatTables(
  team1StatsTable: HTMLElement,
  team2StatsTable: HTMLElement
) {
  const team1Elo = calculateTeamAverageElo(team1StatsTable);
  const team2Elo = calculateTeamAverageElo(team2StatsTable);

  // Also check for Faceit ELO
  const team1FaceitElo = calculateTeamAverageFaceitElo(team1StatsTable);
  const team2FaceitElo = calculateTeamAverageFaceitElo(team2StatsTable);

  // Get team headers
  const teamHeaders = document.querySelectorAll(".team-info");
  if (teamHeaders.length !== 2) {
    return;
  }

  const team1Header = teamHeaders[0] as HTMLElement;
  const team2Header = teamHeaders[1] as HTMLElement;

  updateTeamHeader(team1Header, team1Elo, team1FaceitElo);
  updateTeamHeader(team2Header, team2Elo, team2FaceitElo);
}

export function updateTeamAverageEloSettings(
  enabled: boolean,
  faceitEnabled = false
) {
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
      initializeTeamAverageElo(enabled, faceitEnabled);
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

function updateTeamHeader(
  header: HTMLElement,
  renownElo: number | null,
  faceitElo: number | null = null
) {
  try {
    // Check if we have ELO values to display
    if (!renownElo && !faceitElo) {
      return;
    }

    // Check for existing badges and remove them
    const existingBadge = header.querySelector(
      '[data-clutch-extension="team-average-elo"]'
    );
    if (existingBadge && existingBadge.parentNode) {
      existingBadge.parentNode.removeChild(existingBadge);
    }

    // Create container for badges
    const badgesContainer = document.createElement("div");
    badgesContainer.style.cssText =
      "display: flex; align-items: center; margin-left: 8px; gap: 8px;";
    badgesContainer.setAttribute("data-clutch-extension", "team-average-elo");

    // Add Renown rank badge if available
    if (renownElo !== null) {
      const rankBadgeElement = createRankBadgeElement(renownElo, 24);
      badgesContainer.appendChild(rankBadgeElement);
    }

    // Add Faceit badge if available
    if (faceitElo !== null) {
      const faceitBadgeElement = createFaceitBadgeElement(faceitElo, 24);
      badgesContainer.appendChild(faceitBadgeElement);
    }

    // Find insertion point - try to find team name or score element
    const teamName = header.querySelector(".team-name");
    if (teamName) {
      // Insert after team name
      if (teamName.nextSibling) {
        header.insertBefore(badgesContainer, teamName.nextSibling);
      } else {
        header.appendChild(badgesContainer);
      }
    } else {
      // Fallback: append to header
      header.appendChild(badgesContainer);
    }
  } catch (error) {
    console.error("[Clutch] Error updating team header:", error);
  }
}
