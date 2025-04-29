import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";
import { createRankBadgeElement } from "../utils/rankBadgeUtils";
import { createFaceitBadgeElement, getFaceitLevel } from "../utils/faceitUtils";
import { waitForElement } from "../utils/profileUtils";

// Keep track of observer and state
let currentObserver: MutationObserver | null = null;
let isFeatureEnabled = false;
let isFaceitFeatureEnabled = false;
let processedTeams = new Set<HTMLElement>();
let addedBadges: HTMLElement[] = [];
let faceitRetryTimerId: number | null = null;

/**
 * Checks if the extension context is still valid
 */
function isExtensionContextValid(): boolean {
  return chrome.runtime && !!chrome.runtime.id;
}

/**
 * Initialize the team average ELO feature for live matches
 */
export async function initialize(enabled: boolean, faceitEnabled = false) {
  try {
    // Check if extension context is still valid before initializing
    if (!isExtensionContextValid()) {
      console.warn(
        "Extension context invalid, skipping live match team average ELO initialization"
      );
      return;
    }

    cleanupBadges();

    if (currentObserver) {
      disconnectSafeObserver(currentObserver);
      currentObserver = null;
    }

    // Update feature state
    isFeatureEnabled = enabled;
    isFaceitFeatureEnabled = faceitEnabled;
    processedTeams = new Set();

    // If feature is disabled, we already cleaned up badges
    if (!enabled) {
      return;
    }

    // Wait for container element first
    try {
      await waitForElement(".container");

      // Check for team containers specific to live matches
      const team1Players = document.querySelector(".team1-players");
      const team2Players = document.querySelector(".team2-players");

      if (!team1Players || !team2Players) {
        return;
      }
    } catch (error) {
      return;
    }

    // Create observer to watch for changes in live match interface
    currentObserver = createSafeObserver(
      (mutations) => {
        // Skip processing if feature has been disabled
        if (!isFeatureEnabled) return;

        let shouldProcessTeams = false;
        let shouldUpdatePositions = false;

        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            // Check for team players containers
            const team1Players = document.querySelector(".team1-players");
            const team2Players = document.querySelector(".team2-players");

            if (team1Players && team2Players) {
              // Check if both teams are already processed
              const team1Processed = processedTeams.has(
                team1Players as HTMLElement
              );
              const team2Processed = processedTeams.has(
                team2Players as HTMLElement
              );

              if (!team1Processed || !team2Processed) {
                shouldProcessTeams = true;
                break;
              }
            }

            // Check for changes in team header positions
            const matchScore = document.querySelector(".match-score");
            if (matchScore) {
              const team1 = matchScore.querySelector(".team1");
              const team2 = matchScore.querySelector(".team2");

              if (team1 && team2) {
                // Check if team1 is now after team2 (position switch)
                const team1Rect = team1.getBoundingClientRect();
                const team2Rect = team2.getBoundingClientRect();

                if (team1Rect.top > team2Rect.top) {
                  shouldUpdatePositions = true;
                }
              }
            }
          }
        }

        if (shouldProcessTeams) {
          const team1Players = document.querySelector(".team1-players");
          const team2Players = document.querySelector(".team2-players");

          if (team1Players && team2Players) {
            // Mark as processed before processing to prevent reprocessing during DOM updates
            processedTeams.add(team1Players as HTMLElement);
            processedTeams.add(team2Players as HTMLElement);

            processTeamContainers(
              team1Players as HTMLElement,
              team2Players as HTMLElement
            );
          }
        }

        if (shouldUpdatePositions) {
          const matchScore = document.querySelector(".match-score");
          if (matchScore) {
            const team1 = matchScore.querySelector(".team1");
            const team2 = matchScore.querySelector(".team2");

            if (team1 && team2) {
              // Get current ELO values from existing badges
              const team1Badge = team1.querySelector(
                '[data-clutch-extension="team-average-elo"]'
              );
              const team2Badge = team2.querySelector(
                '[data-clutch-extension="team-average-elo"]'
              );

              if (team1Badge && team2Badge) {
                // Remove existing badges
                team1Badge.remove();
                team2Badge.remove();

                // Get team containers to recalculate ELO
                const team1Players = document.querySelector(".team1-players");
                const team2Players = document.querySelector(".team2-players");

                if (team1Players && team2Players) {
                  // Reprocess with updated positions
                  processTeamContainers(
                    team1Players as HTMLElement,
                    team2Players as HTMLElement
                  );
                }
              }
            }
          }
        }
      },
      () => document.body,
      { childList: true, subtree: true }
    );

    // Process any existing team containers
    const team1Players = document.querySelector(".team1-players");
    const team2Players = document.querySelector(".team2-players");

    if (team1Players && team2Players) {
      // Mark as processed before processing to prevent reprocessing during DOM updates
      processedTeams.add(team1Players as HTMLElement);
      processedTeams.add(team2Players as HTMLElement);

      // Use setTimeout to ensure Faceit elements have time to load
      setTimeout(() => {
        // Only process if the feature is still enabled
        if (isFeatureEnabled) {
          processTeamContainers(
            team1Players as HTMLElement,
            team2Players as HTMLElement
          );
        }
      }, 500);
    }
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn(
        "Extension context invalidated during live match team average ELO initialization"
      );
    } else {
      console.error("Error initializing live match team average ELO:", error);
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
 * Process team containers and add ELO information
 */
function processTeamContainers(
  team1Container: HTMLElement,
  team2Container: HTMLElement
) {
  const team1Elo = calculateTeamAverageElo(team1Container);
  const team2Elo = calculateTeamAverageElo(team2Container);

  // Also check for Faceit ELO if enabled
  const team1FaceitElo = isFaceitFeatureEnabled
    ? calculateTeamAverageFaceitElo(team1Container)
    : null;
  const team2FaceitElo = isFaceitFeatureEnabled
    ? calculateTeamAverageFaceitElo(team2Container)
    : null;

  // Find proper team containers in match score section
  const matchScore = document.querySelector(".match-score");
  if (!matchScore) {
    return;
  }

  const team1 = matchScore.querySelector(".team1");
  const team2 = matchScore.querySelector(".team2");

  if (!team1 || !team2) {
    return;
  }

  // Update team headers with correct placement
  updateTeamHeader(team1 as HTMLElement, team1Elo, team1FaceitElo, "first");
  updateTeamHeader(team2 as HTMLElement, team2Elo, team2FaceitElo, "last");

  // If Faceit is enabled but no Faceit ELO was found, start a retry mechanism
  if (isFaceitFeatureEnabled && (!team1FaceitElo || !team2FaceitElo)) {
    startFaceitRetryTimer(team1Container, team2Container);
  }
}

/**
 * Start a timer to retry loading Faceit ELO data
 */
function startFaceitRetryTimer(
  team1Container: HTMLElement,
  team2Container: HTMLElement
) {
  // Clear any existing timer
  if (faceitRetryTimerId !== null) {
    window.clearTimeout(faceitRetryTimerId);
    faceitRetryTimerId = null;
  }

  // Set up our retry attempts - check every second for up to 5 seconds
  let attempts = 0;
  const maxAttempts = 5;
  const intervalMs = 1000;

  function retryFaceitElo() {
    attempts++;

    // Check if we found at least one faceit icon in either team
    const team1FaceitIcons = team1Container.querySelectorAll(".faceit-icon");
    const team2FaceitIcons = team2Container.querySelectorAll(".faceit-icon");
    const totalFaceitIcons = team1FaceitIcons.length + team2FaceitIcons.length;

    if (totalFaceitIcons > 0 || attempts >= maxAttempts) {
      // Reprocess the team containers now that Faceit icons might be available
      if (isFeatureEnabled && isFaceitFeatureEnabled) {
        // Reprocess the team containers
        processTeamContainers(team1Container, team2Container);
      }

      // Clear the timer as we're done retrying
      faceitRetryTimerId = null;
    } else {
      // Try again after the interval
      faceitRetryTimerId = window.setTimeout(retryFaceitElo, intervalMs);
    }
  }

  // Start the retry process
  faceitRetryTimerId = window.setTimeout(retryFaceitElo, intervalMs);
}

/**
 * Calculate the average Renown ELO for a team
 */
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

/**
 * Calculate the average Faceit ELO for a team
 */
function calculateTeamAverageFaceitElo(container: HTMLElement): number | null {
  try {
    // Find all faceit icons in the player elements
    const faceitIcons = container.querySelectorAll(".faceit-icon");

    let eloValues: number[] = [];

    faceitIcons.forEach((icon, index) => {
      if (icon instanceof HTMLElement) {
        let foundElo = false;

        // First, try to get ELO from the title attribute directly on the faceit-icon element
        const titleAttribute = icon.getAttribute("title");
        if (titleAttribute) {
          const match = titleAttribute.match(/ELO: (\d+)/);
          if (match && match[1]) {
            const eloValue = parseInt(match[1], 10);
            if (!isNaN(eloValue)) {
              eloValues.push(eloValue);
              foundElo = true;
            }
          }
        }

        // If not found in title, try to get from tooltip text
        if (!foundElo) {
          const tooltipElement = icon.querySelector(".clutch-tooltip");
          if (tooltipElement && tooltipElement.textContent) {
            const match = tooltipElement.textContent.match(/ELO: (\d+)/);
            if (match && match[1]) {
              const eloValue = parseInt(match[1], 10);
              if (!isNaN(eloValue)) {
                eloValues.push(eloValue);
                foundElo = true;
              }
            }
          }
        }

        // If still not found, try from img alt attribute
        if (!foundElo) {
          const imgElement = icon.querySelector("img");
          if (imgElement) {
            const altText = imgElement.getAttribute("alt");
            if (altText) {
              const match = altText.match(/ELO: (\d+)/);
              if (match && match[1]) {
                const eloValue = parseInt(match[1], 10);
                if (!isNaN(eloValue)) {
                  eloValues.push(eloValue);
                  foundElo = true;
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
      const average = Math.round(sum / eloValues.length);
      return average;
    }

    return null;
  } catch (error) {
    console.error("[Clutch] Error calculating team average Faceit ELO:", error);
    return null;
  }
}

/**
 * Update a team header with ELO information
 */
function updateTeamHeader(
  header: HTMLElement,
  renownElo: number | null,
  faceitElo: number | null = null,
  placement: "first" | "last" = "last"
) {
  try {
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
      "display: flex; align-items: center; margin: 4px 8px; gap: 8px;";
    badgesContainer.setAttribute("data-clutch-extension", "team-average-elo");

    // Add Renown rank badge if available
    if (renownElo !== null) {
      const rankBadgeElement = createRankBadgeElement(renownElo, 30);
      badgesContainer.appendChild(rankBadgeElement);
    }

    // Add Faceit badge if available
    if (faceitElo !== null) {
      const faceitBadgeElement = createFaceitBadgeElement(faceitElo, 30);
      badgesContainer.appendChild(faceitBadgeElement);
    }

    // Insert at the specified position
    if (placement === "first") {
      // Insert as the first child
      if (header.firstChild) {
        header.insertBefore(badgesContainer, header.firstChild);
      } else {
        header.appendChild(badgesContainer);
      }
    } else {
      // Insert as the last child
      header.appendChild(badgesContainer);
    }

    // Track added badge for cleanup
    addedBadges.push(badgesContainer);
  } catch (error) {
    console.error("[Clutch] Error updating team header:", error);
  }
}

/**
 * Updates the team average ELO feature settings
 */
export function updateSettings(enabled: boolean, faceitEnabled = false) {
  try {
    // Check if extension context is still valid before updating settings
    if (!isExtensionContextValid()) {
      console.warn(
        "Extension context invalid, skipping live match team average ELO settings update"
      );
      return;
    }

    // Cancel any active retry timer
    if (faceitRetryTimerId !== null) {
      window.clearTimeout(faceitRetryTimerId);
      faceitRetryTimerId = null;
    }

    // Always clean up existing badges to prevent duplication when settings change
    cleanupBadges();

    // Ensure we're not in an inconsistent state
    if (currentObserver) {
      disconnectSafeObserver(currentObserver);
      currentObserver = null;
    }

    // Update feature state
    isFeatureEnabled = enabled;
    isFaceitFeatureEnabled = faceitEnabled;

    // Clear processed teams only if re-enabling
    if (enabled) {
      processedTeams.clear();
      // Reinitialize if feature is enabled
      initialize(enabled, faceitEnabled);
    }
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn(
        "Extension context invalidated when updating live match team average ELO settings"
      );
    } else {
      console.error(
        "Error updating live match team average ELO settings:",
        error
      );
    }
  }
}
