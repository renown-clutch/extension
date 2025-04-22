import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";
import { getFaceitLevel } from "../utils/faceitUtils";

console.log("Faceit Ranks for match page module loaded");

// Keep track of processed elements and observer instances
let processedTables = new Set();
let processedPlayers = new Set();
let currentObserver: MutationObserver | null = null;
let addedFaceitElements: HTMLElement[] = [];
let isFeatureEnabled = false;
let pendingRequests = new Set<string>(); // Track Steam IDs with pending requests
let processingInProgress = false; // Flag to prevent concurrent processing

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

  // Reset tracking arrays and flags
  addedFaceitElements = [];
  pendingRequests.clear();
  processingInProgress = false;
}

/**
 * Initializes the faceit ranks for match page feature
 */
export function initialize(enabled: boolean) {
  console.log("Initializing faceit ranks with enabled:", enabled);

  // Ensure we're not in an inconsistent state
  if (currentObserver) {
    console.log("Disconnecting previous observer before reinitializing");
    disconnectSafeObserver(currentObserver);
    currentObserver = null;
  }

  // Update feature state
  isFeatureEnabled = enabled;

  // Reset processed tables and players
  processedTables = new Set();
  processedPlayers = new Set();
  pendingRequests = new Set();
  processingInProgress = false;

  // If feature is disabled, remove any existing Faceit icons
  if (!enabled) {
    cleanupFaceitIcons();
    return;
  }

  console.log("Faceit Ranks for match page feature enabled");

  // Process any tables that already exist on the page
  processTeamStatsTables();

  // Process any standalone player elements
  processPlayerElements();

  // Create the observer with our utility function
  currentObserver = createSafeObserver(
    (mutations) => {
      // Skip processing if feature has been disabled
      if (!isFeatureEnabled || processingInProgress) return;

      let shouldProcessTables = false;
      let shouldProcessPlayers = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          const tables = document.querySelectorAll(".team-stats-table");
          if (tables.length > 0) {
            shouldProcessTables = true;
          }

          const players = document.querySelectorAll("a.player");
          if (players.length > 0) {
            shouldProcessPlayers = true;
          }

          if (shouldProcessTables && shouldProcessPlayers) break;
        }
      }

      if (shouldProcessTables) {
        processTeamStatsTables();
      }

      if (shouldProcessPlayers) {
        processPlayerElements();
      }
    },
    () => document.body,
    { childList: true, subtree: true }
  );
}

/**
 * Process player elements that appear on match pages
 */
function processPlayerElements() {
  const playerElements = document.querySelectorAll("a.player");
  if (playerElements.length === 0) {
    return;
  }

  let newPlayersFound = false;
  let steamIds: string[] = [];
  let playerElems: Map<string, HTMLElement> = new Map();

  playerElements.forEach((player) => {
    // Skip already processed players
    if (processedPlayers.has(player)) return;

    newPlayersFound = true;

    // Mark as processed
    processedPlayers.add(player);

    const href = player.getAttribute("href");
    if (href && href.startsWith("/profile/")) {
      const steamId = href.replace("/profile/", "");
      steamIds.push(steamId);
      playerElems.set(steamId, player as HTMLElement);
    }
  });

  if (newPlayersFound && steamIds.length > 0) {
    console.log(`Found ${steamIds.length} new player elements`);
    getFaceitInfoForPlayers(steamIds, playerElems);
  }
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
    // Filter out Steam IDs that are already being processed
    const newSteamIds = steamIds.filter((id) => !pendingRequests.has(id));

    if (newSteamIds.length === 0) {
      console.log(
        "All Steam IDs are already being processed, skipping request"
      );
      return;
    }

    console.log(
      `Requesting Faceit info for ${newSteamIds.length} steam IDs:`,
      newSteamIds
    );

    // Mark these Steam IDs as pending
    newSteamIds.forEach((id) => pendingRequests.add(id));

    // Set processing flag to prevent concurrent requests
    processingInProgress = true;

    // Send message to background script to get Faceit info
    const response = await chrome.runtime.sendMessage({
      type: "get_faceit_info",
      steam_ids: newSteamIds,
    });

    console.log("Received Faceit info:", response);

    // Check if feature was disabled during the API call
    if (!isFeatureEnabled) {
      console.log(
        "Feature was disabled during API call, skipping icon addition"
      );
      return;
    }

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

      // Remove from pending set
      pendingRequests.delete(steamId);
    }

    console.log(
      `Added ${iconCount} of ${
        Object.keys(response).length
      } possible Faceit icons`
    );
  } catch (error) {
    console.error("Error getting Faceit info:", error);
  } finally {
    // Reset processing flag
    processingInProgress = false;
  }
}

/**
 * Get Faceit information for standalone player elements
 */
async function getFaceitInfoForPlayers(
  steamIds: string[],
  playerElems: Map<string, HTMLElement>
) {
  try {
    // Filter out Steam IDs that are already being processed
    const newSteamIds = steamIds.filter((id) => !pendingRequests.has(id));

    if (newSteamIds.length === 0) {
      console.log(
        "All Steam IDs are already being processed, skipping request"
      );
      return;
    }

    console.log(
      `Requesting Faceit info for ${newSteamIds.length} player elements:`,
      newSteamIds
    );

    // Mark these Steam IDs as pending
    newSteamIds.forEach((id) => pendingRequests.add(id));

    // Set processing flag to prevent concurrent requests
    processingInProgress = true;

    // Send message to background script to get Faceit info
    const response = await chrome.runtime.sendMessage({
      type: "get_faceit_info",
      steam_ids: newSteamIds,
    });

    console.log("Received Faceit info for player elements:", response);

    // Check if feature was disabled during the API call
    if (!isFeatureEnabled) {
      console.log(
        "Feature was disabled during API call, skipping icon addition"
      );
      return;
    }

    if (!response || Object.keys(response).length === 0) {
      console.warn("Empty or invalid response received for Faceit info");
      return;
    }

    // Add Faceit icons to player elements
    let iconCount = 0;
    for (const [steamId, faceitInfo] of Object.entries(response)) {
      const playerElem = playerElems.get(steamId);
      if (playerElem) {
        addFaceitIconToPlayerElement(playerElem, faceitInfo);
        iconCount++;
      }

      // Remove from pending set
      pendingRequests.delete(steamId);
    }

    console.log(
      `Added ${iconCount} of ${
        Object.keys(response).length
      } possible Faceit icons to player elements`
    );
  } catch (error) {
    console.error("Error getting Faceit info for player elements:", error);
  } finally {
    // Reset processing flag
    processingInProgress = false;
  }
}

/**
 * Add Faceit icon to a standalone player element
 */
function addFaceitIconToPlayerElement(
  playerElem: HTMLElement,
  faceitInfo: any
) {
  try {
    // Check if the player element already has a faceit-icon
    if (playerElem.querySelector(".faceit-icon")) {
      console.log("Player element already has a Faceit icon, skipping");
      return;
    }

    // Find the avatar wrapper to insert after
    const avatarWrapper = playerElem.querySelector(".avatar-wrapper");
    if (!avatarWrapper) {
      console.warn("Avatar wrapper not found in player element:", playerElem);
      return;
    }

    // Get dimensions from avatar image
    const avatarImg = avatarWrapper.querySelector("img");
    if (!avatarImg) {
      console.warn("Avatar image not found in avatar wrapper:", avatarWrapper);
      return;
    }

    const imgWidth = avatarImg.width || 26;
    const imgHeight = avatarImg.height || 26;

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

    // Create Faceit icon element
    const faceitIconElement = document.createElement("div");
    faceitIconElement.className = "tooltip-wrapper faceit-icon";
    faceitIconElement.setAttribute("tabindex", "0");

    if (profileUrl) {
      const linkElement = document.createElement("a");
      linkElement.href = profileUrl;
      linkElement.target = "_blank";
      linkElement.style.display = "inline-block";

      const faceitLevelIcon = document.createElement("img");
      faceitLevelIcon.src = levelIconPath;
      faceitLevelIcon.width = imgWidth;
      faceitLevelIcon.height = imgHeight;
      faceitLevelIcon.alt = tooltipText;
      faceitLevelIcon.style.display = "inline-block";

      linkElement.appendChild(faceitLevelIcon);
      faceitIconElement.appendChild(linkElement);
    } else {
      const faceitLevelIcon = document.createElement("img");
      faceitLevelIcon.src = levelIconPath;
      faceitLevelIcon.width = imgWidth;
      faceitLevelIcon.height = imgHeight;
      faceitLevelIcon.alt = tooltipText;
      faceitLevelIcon.style.display = "inline-block";

      faceitIconElement.appendChild(faceitLevelIcon);
    }

    // Add tooltip
    faceitIconElement.setAttribute("title", tooltipText);

    // Insert after avatar wrapper
    avatarWrapper.insertAdjacentElement("afterend", faceitIconElement);

    // Track the added element
    addedFaceitElements.push(faceitIconElement);

    console.log(
      `Added Faceit icon sized ${imgWidth}x${imgHeight} for player: ${
        !faceitInfo || !faceitInfo.elo
          ? "No profile found"
          : `ELO: ${faceitInfo.elo}`
      }`
    );
  } catch (error) {
    console.error(
      "Error adding Faceit icon to player element:",
      error,
      "Player element:",
      playerElem,
      "Faceit info:",
      faceitInfo
    );
  }
}

/**
 * Add Faceit icon to a player row
 */
function addFaceitIconToPlayerRow(playerRow: HTMLElement, faceitInfo: any) {
  try {
    // Check if the player row already has a faceit-icon
    if (playerRow.querySelector(".faceit-icon")) {
      console.log("Player row already has a Faceit icon, skipping");
      return;
    }

    // Check if row has at least one child element
    if (!playerRow.firstElementChild) {
      console.warn("Player row has no child elements:", playerRow);
      return;
    }

    // Find the avatar wrapper and get image dimensions
    const avatarWrapper = playerRow.querySelector(".avatar-wrapper");
    let imgWidth = 34;
    let imgHeight = 34;

    if (avatarWrapper) {
      const avatarImg = avatarWrapper.querySelector("img");
      if (avatarImg) {
        imgWidth = avatarImg.width || imgWidth;
        imgHeight = avatarImg.height || imgHeight;
      }
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
    faceitLevelIcon.width = imgWidth;
    faceitLevelIcon.height = imgHeight;
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
      `Added Faceit icon sized ${imgWidth}x${imgHeight} for player: ${
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

  // Only reinitialize if the state is actually changing
  if (isFeatureEnabled !== enabled) {
    initialize(enabled);
  } else {
    console.log("Feature state unchanged, skipping reinitialization");
  }
}
