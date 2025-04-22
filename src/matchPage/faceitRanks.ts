import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";
import { getFaceitLevel } from "../utils/faceitUtils";

console.log("Faceit Ranks for match page module loaded");

// Keep track of processed elements and observer instances
let processedTables = new Set();
let currentObserver: MutationObserver | null = null;
let addedFaceitElements: HTMLElement[] = [];

// Path to Faceit icon

// Get level icon path based on level
function getLevelIconPath(level: number): string {
  return chrome.runtime.getURL(`static/faceitlevels/lvl${level}.svg`);
}

// Get fallback icon path for players with no Faceit profile
function getFallbackIconPath(): string {
  return chrome.runtime.getURL("static/faceitlevels/lvlx.svg");
}

/**
 * Cleans up any Faceit icons that have been added to the page
 */
function cleanupFaceitIcons() {
  console.log(
    `Removing ${addedFaceitElements.length} Faceit icons from the page`
  );

  // Remove all added elements
  addedFaceitElements.forEach((element) => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  // Also look for any elements with the faceit-icon class that might have been missed
  document.querySelectorAll(".faceit-icon").forEach((element) => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  // Reset the array
  addedFaceitElements = [];
}

/**
 * Initializes the faceit ranks for match page feature
 */
export function initialize(enabled: boolean) {
  // Clean up any existing observer
  disconnectSafeObserver(currentObserver);
  currentObserver = null;

  // Reset processed tables
  processedTables = new Set();

  // If feature is disabled, remove any existing Faceit icons
  if (!enabled) {
    cleanupFaceitIcons();
    return;
  }

  console.log("Faceit Ranks for match page feature enabled");

  // Process any tables that already exist on the page
  processTeamStatsTables();

  // Create the observer with our utility function
  currentObserver = createSafeObserver(
    (mutations) => {
      let shouldProcess = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          const tables = document.querySelectorAll(".team-stats-table");
          if (tables.length > 0) {
            shouldProcess = true;
            break;
          }
        }
      }

      if (shouldProcess) {
        processTeamStatsTables();
      }
    },
    () => document.body,
    { childList: true, subtree: true }
  );
}

/**
 * Process team stats tables and add Faceit ranks
 */
function processTeamStatsTables() {
  const teamStatsTables = document.querySelectorAll(".team-stats-table");
  if (teamStatsTables.length === 0) {
    console.log("No team stats tables found on the page");
    return;
  }

  let newTablesFound = false;
  let steamIds: string[] = [];
  let playerRows: Map<string, HTMLElement> = new Map();

  teamStatsTables.forEach((table) => {
    // Skip already processed tables
    if (processedTables.has(table)) return;

    console.log("Processing new team stats table:", table);
    newTablesFound = true;

    // Mark as processed
    processedTables.add(table);

    // Find all player links in this table
    const playerLinks = table.querySelectorAll(".row .player");
    console.log(`Found ${playerLinks.length} player links in table`);

    playerLinks.forEach((playerLink) => {
      const href = playerLink.getAttribute("href");
      if (href && href.startsWith("/profile/")) {
        const steamId = href.replace("/profile/", "");
        steamIds.push(steamId);
        playerRows.set(steamId, playerLink as HTMLElement);
      } else {
        console.warn("Found player link with invalid href:", href, playerLink);
      }
    });
  });

  if (newTablesFound) {
    console.log(`Processed ${processedTables.size} team stats tables`);

    if (steamIds.length > 0) {
      console.log(`Found ${steamIds.length} player steam IDs`);
      getFaceitInfo(steamIds, playerRows);
    } else {
      console.warn("No valid Steam IDs found in tables");
    }
  } else {
    console.log("No new team stats tables found to process");
  }
}

/**
 * Get Faceit information for the provided Steam IDs
 */
async function getFaceitInfo(
  steamIds: string[],
  playerRows: Map<string, HTMLElement>
) {
  try {
    console.log("Requesting Faceit info for steam IDs:", steamIds);

    // Send message to background script to get Faceit info
    const response = await chrome.runtime.sendMessage({
      type: "get_faceit_info",
      steam_ids: steamIds,
    });

    console.log("Received Faceit info:", response);

    if (!response || Object.keys(response).length === 0) {
      console.warn("Empty or invalid response received for Faceit info");
      return;
    }

    // Log player rows we have for debugging
    console.log("Player rows found:", Array.from(playerRows.keys()));

    // Add Faceit icons to player rows
    let iconCount = 0;
    for (const [steamId, faceitInfo] of Object.entries(response)) {
      const playerRow = playerRows.get(steamId);
      if (playerRow) {
        addFaceitIconToPlayerRow(playerRow, faceitInfo);
        iconCount++;
      } else {
        console.warn(`Could not find player row for Steam ID: ${steamId}`);
      }
    }

    console.log(
      `Added ${iconCount} of ${
        Object.keys(response).length
      } possible Faceit icons`
    );
  } catch (error) {
    console.error("Error getting Faceit info:", error);
  }
}

/**
 * Add Faceit icon to a player row
 */
function addFaceitIconToPlayerRow(playerRow: HTMLElement, faceitInfo: any) {
  try {
    // Check if row has at least one child element
    if (!playerRow.firstElementChild) {
      console.warn("Player row has no child elements:", playerRow);
      return;
    }

    // Path to the level icon and tooltip text
    let levelIconPath: string;
    let tooltipText: string;
    let profileUrl: string | undefined;

    // If no valid faceit info is available, use the fallback icon
    if (!faceitInfo || !faceitInfo.elo) {
      levelIconPath = getFallbackIconPath();
      tooltipText = "No Faceit profile found";
    } else {
      // Get Faceit level based on ELO
      const faceitLevel = getFaceitLevel(faceitInfo.elo);
      levelIconPath = getLevelIconPath(faceitLevel);
      tooltipText = `Faceit Level ${faceitLevel} (ELO: ${faceitInfo.elo})`;
      profileUrl = faceitInfo.url;
    }

    // Create Faceit icon element as an anchor tag or div based on whether we have a profile
    const faceitIconElement = document.createElement(profileUrl ? "a" : "div");
    faceitIconElement.className = "tooltip-wrapper faceit-icon";
    faceitIconElement.setAttribute("tabindex", "0");

    // Only set href and other link attributes if we have a profile URL
    if (profileUrl) {
      faceitIconElement.style.cursor = "pointer";
      faceitIconElement.setAttribute("href", profileUrl);
      faceitIconElement.setAttribute("target", "_blank");
    }

    // Create a container for the icon
    const iconsContainer = document.createElement("div");
    iconsContainer.style.display = "flex";
    iconsContainer.style.alignItems = "center";
    iconsContainer.style.gap = "2px";

    // Faceit level
    const faceitLevelIcon = document.createElement("img");
    faceitLevelIcon.src = levelIconPath;
    faceitLevelIcon.width = 34;
    faceitLevelIcon.height = 34;
    faceitLevelIcon.alt = tooltipText;
    faceitLevelIcon.style.display = "inline-block";

    // Assemble the container
    iconsContainer.appendChild(faceitLevelIcon);
    faceitIconElement.appendChild(iconsContainer);

    // Add tooltip
    faceitIconElement.setAttribute("title", tooltipText);

    // Always insert as the second element in the player row
    if (playerRow.firstElementChild.nextElementSibling) {
      playerRow.insertBefore(
        faceitIconElement,
        playerRow.firstElementChild.nextElementSibling
      );
    } else {
      playerRow.appendChild(faceitIconElement);
    }

    // Track the added element so we can remove it later if needed
    addedFaceitElements.push(faceitIconElement);
    console.log(
      `Added Faceit icon for player: ${
        !faceitInfo || !faceitInfo.elo
          ? "No profile found"
          : `ELO: ${faceitInfo.elo}`
      }`
    );
  } catch (error) {
    console.error(
      "Error adding Faceit icon to player row:",
      error,
      "Player row:",
      playerRow,
      "Faceit info:",
      faceitInfo
    );
  }
}

/**
 * Updates the faceit ranks feature settings
 */
export function updateSettings(enabled: boolean) {
  console.log("Updating faceit ranks for match page settings:", enabled);
  initialize(enabled);
}
