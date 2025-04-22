import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";

console.log("Faceit Ranks for match page module loaded");

// Keep track of processed elements and observer instances
let processedTables = new Set();
let currentObserver: MutationObserver | null = null;
let addedFaceitElements: HTMLElement[] = [];

// Path to Faceit icon

// Map of Faceit ELO ranges to levels
function getFaceitLevel(elo: number): number {
  if (elo <= 800) return 1;
  if (elo <= 950) return 2;
  if (elo <= 1100) return 3;
  if (elo <= 1250) return 4;
  if (elo <= 1400) return 5;
  if (elo <= 1550) return 6;
  if (elo <= 1700) return 7;
  if (elo <= 1850) return 8;
  if (elo <= 2000) return 9;
  return 10; // 2001+
}

// Get level icon path based on level
function getLevelIconPath(level: number): string {
  return chrome.runtime.getURL(`static/faceitlevels/lvl${level}.svg`);
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
    if (!faceitInfo || !faceitInfo.elo) {
      console.warn("Invalid faceit info received:", faceitInfo);
      return;
    }

    // Check if row has at least one child element
    if (!playerRow.firstElementChild) {
      console.warn("Player row has no child elements:", playerRow);
      return;
    }

    // Get Faceit level based on ELO
    const faceitLevel = getFaceitLevel(faceitInfo.elo);

    // Path to the level icon
    const levelIconPath = getLevelIconPath(faceitLevel);

    // Create Faceit icon element as an anchor tag
    const faceitIconElement = document.createElement("a");
    faceitIconElement.className = "tooltip-wrapper faceit-icon";
    faceitIconElement.setAttribute("tabindex", "0");
    faceitIconElement.style.cursor = "pointer";
    faceitIconElement.href = faceitInfo.url;
    faceitIconElement.target = "_blank";

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
    faceitLevelIcon.alt = `Faceit Level ${faceitLevel}`;
    faceitLevelIcon.style.display = "inline-block";

    // Assemble the container
    iconsContainer.appendChild(faceitLevelIcon);
    faceitIconElement.appendChild(iconsContainer);

    // Add tooltip showing Faceit ELO and level
    faceitIconElement.setAttribute(
      "title",
      `Faceit Level ${faceitLevel} (ELO: ${faceitInfo.elo})`
    );

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
      `Added Faceit icon for player with ELO: ${faceitInfo.elo} (Level ${faceitLevel})`
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
