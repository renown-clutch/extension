import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";
import { getFaceitLevel } from "../utils/faceitUtils";

// Keep track of processed elements and observer instances
let processedTables = new Set();
let processedPlayers = new Set();
let currentObserver: MutationObserver | null = null;
let addedFaceitElements: HTMLElement[] = [];
let isFeatureEnabled = false;
let pendingRequests = new Set<string>(); // Track Steam IDs with pending requests
let processingInProgress = false; // Flag to prevent concurrent processing

/**
 * Checks if the extension context is still valid
 */
function isExtensionContextValid(): boolean {
  return chrome.runtime && !!chrome.runtime.id;
}

// Path to Faceit icon

// Get level icon path based on level
function getLevelIconPath(level: number): string {
  try {
    if (!isExtensionContextValid()) {
      console.warn("Extension context invalid when getting level icon path");
      return "";
    }
    return chrome.runtime.getURL(`static/faceitlevels/lvl${level}.svg`);
  } catch (error) {
    console.warn("Error getting level icon path:", error);
    return "";
  }
}

// Get fallback icon path for players with no Faceit profile
function getFallbackIconPath(): string {
  try {
    if (!isExtensionContextValid()) {
      console.warn("Extension context invalid when getting fallback icon path");
      return "";
    }
    return chrome.runtime.getURL("static/faceitlevels/lvlx.svg");
  } catch (error) {
    console.warn("Error getting fallback icon path:", error);
    return "";
  }
}

/**
 * Cleans up any Faceit icons that have been added to the page
 */
function cleanupFaceitIcons() {
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
  try {
    // Check if extension context is still valid before initializing
    if (!isExtensionContextValid()) {
      console.warn(
        "Extension context invalid, skipping faceit ranks initialization"
      );
      return;
    }

    // Ensure we're not in an inconsistent state
    if (currentObserver) {
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
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn(
        "Extension context invalidated during faceit ranks initialization"
      );
    } else {
      console.error("Error initializing faceit ranks:", error);
    }
  }
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
    getFaceitInfoForPlayers(steamIds, playerElems);
  }
}

/**
 * Process team stats tables and add Faceit ranks
 */
function processTeamStatsTables() {
  const teamStatsTables = document.querySelectorAll(".team-stats-table");
  if (teamStatsTables.length === 0) {
    return;
  }

  let newTablesFound = false;
  let steamIds: string[] = [];
  let playerRows: Map<string, HTMLElement> = new Map();

  teamStatsTables.forEach((table) => {
    // Skip already processed tables
    if (processedTables.has(table)) return;

    newTablesFound = true;

    // Mark as processed
    processedTables.add(table);

    // Find all player links in this table
    const playerLinks = table.querySelectorAll(".row .player");

    playerLinks.forEach((playerLink) => {
      const href = playerLink.getAttribute("href");
      if (href && href.startsWith("/profile/")) {
        const steamId = href.replace("/profile/", "");
        steamIds.push(steamId);
        playerRows.set(steamId, playerLink as HTMLElement);
      } else {
      }
    });
  });

  if (newTablesFound) {
    if (steamIds.length > 0) {
      getFaceitInfo(steamIds, playerRows);
    }
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
      return;
    }

    // Mark these Steam IDs as pending
    newSteamIds.forEach((id) => pendingRequests.add(id));

    // Set processing flag to prevent concurrent requests
    processingInProgress = true;

    // Check if extension context is still valid before making API calls
    if (!chrome.runtime || !chrome.runtime.id) {
      console.warn("Extension context invalid, skipping Faceit info request");
      return;
    }

    // Send message to background script to get Faceit info
    const response = await new Promise<any>((resolve) => {
      try {
        chrome.runtime.sendMessage(
          {
            type: "get_faceit_info",
            steam_ids: newSteamIds,
          },
          (response) => {
            // Check for runtime error (like extension context invalidated)
            if (chrome.runtime.lastError) {
              console.warn(
                "Faceit data fetch failed:",
                chrome.runtime.lastError.message
              );
              resolve({});
              return;
            }
            resolve(response || {});
          }
        );
      } catch (error) {
        console.warn("Error in Faceit data fetch:", error);
        resolve({});
      }
    });

    // Check if feature was disabled during the API call
    if (!isFeatureEnabled) {
      return;
    }

    if (!response || Object.keys(response).length === 0) {
      console.warn("Empty or invalid response received for Faceit info");
      return;
    }

    // Add Faceit icons to player rows
    let iconCount = 0;
    for (const [steamId, faceitInfo] of Object.entries(response)) {
      const playerRow = playerRows.get(steamId);
      if (playerRow) {
        addFaceitIconToPlayerRow(playerRow, faceitInfo);
        iconCount++;
      }

      // Remove from pending set
      pendingRequests.delete(steamId);
    }
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn("Extension context invalidated during Faceit info request");
    } else {
      console.error("Error getting Faceit info:", error);
    }
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
      return;
    }

    // Mark these Steam IDs as pending
    newSteamIds.forEach((id) => pendingRequests.add(id));

    // Set processing flag to prevent concurrent requests
    processingInProgress = true;

    // Check if extension context is still valid before making API calls
    if (!chrome.runtime || !chrome.runtime.id) {
      console.warn(
        "Extension context invalid, skipping Faceit info request for player elements"
      );
      return;
    }

    // Send message to background script to get Faceit info
    const response = await new Promise<any>((resolve) => {
      try {
        chrome.runtime.sendMessage(
          {
            type: "get_faceit_info",
            steam_ids: newSteamIds,
          },
          (response) => {
            // Check for runtime error (like extension context invalidated)
            if (chrome.runtime.lastError) {
              console.warn(
                "Faceit data fetch for players failed:",
                chrome.runtime.lastError.message
              );
              resolve({});
              return;
            }
            resolve(response || {});
          }
        );
      } catch (error) {
        console.warn("Error in Faceit data fetch for players:", error);
        resolve({});
      }
    });

    // Check if feature was disabled during the API call
    if (!isFeatureEnabled) {
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
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn(
        "Extension context invalidated during Faceit info request for players"
      );
    } else {
      console.error("Error getting Faceit info for player elements:", error);
    }
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
    // Check if extension context is valid
    if (!isExtensionContextValid()) {
      console.warn(
        "Extension context invalid, skipping adding Faceit icon to player element"
      );
      return;
    }

    // Check if the player element already has a faceit-icon
    if (playerElem.querySelector(".faceit-icon")) {
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

    // Check if we have a valid icon path
    if (!levelIconPath) {
      console.warn(
        "Could not get a valid icon path, skipping Faceit icon addition"
      );
      return;
    }

    // Create Faceit icon element
    const faceitIconElement = document.createElement("div");
    faceitIconElement.className = "tooltip-wrapper faceit-icon";
    faceitIconElement.setAttribute("tabindex", "0");

    // Create custom tooltip div
    const tooltipElement = document.createElement("div");
    tooltipElement.className = "clutch-tooltip";
    tooltipElement.textContent = tooltipText;
    tooltipElement.style.position = "absolute";
    tooltipElement.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    tooltipElement.style.color = "white";
    tooltipElement.style.padding = "4px 8px";
    tooltipElement.style.borderRadius = "4px";
    tooltipElement.style.fontSize = "12px";
    tooltipElement.style.whiteSpace = "nowrap";
    tooltipElement.style.zIndex = "9999";
    tooltipElement.style.pointerEvents = "none";
    tooltipElement.style.opacity = "0";
    tooltipElement.style.transition = "opacity 0.1s";
    tooltipElement.style.bottom = "100%";
    tooltipElement.style.left = "50%";
    tooltipElement.style.transform = "translateX(-50%)";
    tooltipElement.style.marginBottom = "5px";

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

    // Add event listeners for tooltip
    faceitIconElement.addEventListener("mouseenter", () => {
      tooltipElement.style.opacity = "1";
    });

    faceitIconElement.addEventListener("mouseleave", () => {
      tooltipElement.style.opacity = "0";
    });

    // Add custom tooltip to faceit icon element
    faceitIconElement.style.position = "relative";
    faceitIconElement.appendChild(tooltipElement);

    // Insert after avatar wrapper
    avatarWrapper.insertAdjacentElement("afterend", faceitIconElement);

    // Track the added element
    addedFaceitElements.push(faceitIconElement);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn(
        "Extension context invalidated when adding Faceit icon to player element"
      );
    } else {
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
}

/**
 * Add Faceit icon to a player row
 */
function addFaceitIconToPlayerRow(playerRow: HTMLElement, faceitInfo: any) {
  try {
    // Check if extension context is valid
    if (!isExtensionContextValid()) {
      console.warn(
        "Extension context invalid, skipping adding Faceit icon to player row"
      );
      return;
    }

    // Check if the player row already has a faceit-icon
    if (playerRow.querySelector(".faceit-icon")) {
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

    // Check if we have a valid icon path
    if (!levelIconPath) {
      console.warn(
        "Could not get a valid icon path, skipping Faceit icon addition"
      );
      return;
    }

    // Create Faceit icon element as an anchor tag or div based on whether we have a profile
    const faceitIconElement = document.createElement(profileUrl ? "a" : "div");
    faceitIconElement.className = "tooltip-wrapper faceit-icon";
    faceitIconElement.setAttribute("tabindex", "0");
    faceitIconElement.style.position = "relative";

    // Create custom tooltip div
    const tooltipElement = document.createElement("div");
    tooltipElement.className = "clutch-tooltip";
    tooltipElement.textContent = tooltipText;
    tooltipElement.style.position = "absolute";
    tooltipElement.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    tooltipElement.style.color = "white";
    tooltipElement.style.padding = "4px 8px";
    tooltipElement.style.borderRadius = "4px";
    tooltipElement.style.fontSize = "12px";
    tooltipElement.style.whiteSpace = "nowrap";
    tooltipElement.style.zIndex = "9999";
    tooltipElement.style.pointerEvents = "none";
    tooltipElement.style.opacity = "0";
    tooltipElement.style.transition = "opacity 0.1s";
    tooltipElement.style.bottom = "100%";
    tooltipElement.style.left = "50%";
    tooltipElement.style.transform = "translateX(-50%)";
    tooltipElement.style.marginBottom = "5px";

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
    faceitIconElement.appendChild(tooltipElement);

    // Add event listeners for tooltip
    faceitIconElement.addEventListener("mouseenter", () => {
      tooltipElement.style.opacity = "1";
    });

    faceitIconElement.addEventListener("mouseleave", () => {
      tooltipElement.style.opacity = "0";
    });

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
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn(
        "Extension context invalidated when adding Faceit icon to player row"
      );
    } else {
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
}

/**
 * Updates the faceit ranks feature settings
 */
export function updateSettings(enabled: boolean) {
  try {
    // Check if extension context is still valid before updating settings
    if (!isExtensionContextValid()) {
      console.warn(
        "Extension context invalid, skipping faceit ranks settings update"
      );
      return;
    }

    // Only reinitialize if the state is actually changing
    if (isFeatureEnabled !== enabled) {
      initialize(enabled);
    } else {
    }
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn(
        "Extension context invalidated when updating faceit ranks settings"
      );
    } else {
      console.error("Error updating faceit ranks settings:", error);
    }
  }
}
