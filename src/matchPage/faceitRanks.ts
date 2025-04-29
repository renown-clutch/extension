import {
  createSafeObserver,
  disconnectSafeObserver,
} from "../utils/observerUtils";
import { getFaceitLevel } from "../utils/faceitUtils";

let processedTables = new Set();
let processedPlayers = new Set();
let currentObserver: MutationObserver | null = null;
let teamPositionObserver: MutationObserver | null = null;
let addedFaceitElements: HTMLElement[] = [];
let isFeatureEnabled = false;
let pendingRequests = new Set<string>(); // Track Steam IDs with pending requests
let processingInProgress = false; // Flag to prevent concurrent processing
let ignoreObserverChanges = false; // Flag to prevent observer reacting to our own changes

let faceitIconMap = new Map<string, HTMLElement>();

function isExtensionContextValid(): boolean {
  return chrome.runtime && !!chrome.runtime.id;
}

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

function cleanupFaceitIcons() {
  addedFaceitElements.forEach((element) => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  document.querySelectorAll(".faceit-icon").forEach((element) => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  addedFaceitElements = [];
  faceitIconMap.clear();
  pendingRequests.clear();
  processingInProgress = false;
}

export function initializeFaceitRanks(enabled: boolean) {
  try {
    if (!isExtensionContextValid()) {
      console.warn(
        "Extension context invalid, skipping faceit ranks initialization"
      );
      return;
    }

    if (currentObserver) {
      disconnectSafeObserver(currentObserver);
      currentObserver = null;
    }

    if (teamPositionObserver) {
      disconnectSafeObserver(teamPositionObserver);
      teamPositionObserver = null;
    }

    isFeatureEnabled = enabled;

    processedTables = new Set();
    processedPlayers = new Set();
    pendingRequests = new Set();
    processingInProgress = false;

    if (!enabled) {
      cleanupFaceitIcons();
      return;
    }

    processTeamStatsTables();

    processPlayerElements();

    currentObserver = createSafeObserver(
      (mutations) => {
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

    // Add position observer for player reordering
    setupTeamPositionObserver();
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

function setupTeamPositionObserver() {
  try {
    if (teamPositionObserver) {
      disconnectSafeObserver(teamPositionObserver);
      teamPositionObserver = null;
    }

    const playerLists = document.querySelectorAll(".player-list");
    if (playerLists.length === 0) {
      setTimeout(setupTeamPositionObserver, 200);
      return;
    }

    console.log("Found player lists:", playerLists.length);

    playerLists.forEach((container) => {
      teamPositionObserver = createSafeObserver(
        (mutations) => {
          if (!isFeatureEnabled || ignoreObserverChanges) return;

          let playerOrderChanged = false;

          for (const mutation of mutations) {
            if (
              mutation.target &&
              mutation.target instanceof HTMLElement &&
              ((mutation.target.classList &&
                mutation.target.classList.contains("faceit-icon")) ||
                (mutation.target.closest &&
                  mutation.target.closest(".faceit-icon")))
            ) {
              continue;
            }

            if (mutation.type === "childList") {
              const addedNodes = Array.from(mutation.addedNodes);
              const removedNodes = Array.from(mutation.removedNodes);

              const isPlayerChange = [...addedNodes, ...removedNodes].some(
                (node) => {
                  return (
                    node instanceof HTMLElement &&
                    (node.classList.contains("player") ||
                      node.querySelector(".player"))
                  );
                }
              );

              if (isPlayerChange) {
                console.log("Player elements changed in player list");
                playerOrderChanged = true;
                break;
              }
            } else if (
              mutation.type === "attributes" &&
              mutation.target instanceof HTMLElement &&
              mutation.target.classList.contains("player")
            ) {
              console.log("Player attributes changed");
              playerOrderChanged = true;
              break;
            }
          }

          if (playerOrderChanged) {
            console.log("Player order changed, reprocessing icons");

            ignoreObserverChanges = true;

            setTimeout(() => {
              try {
                processedPlayers = new Set();

                processTeamStatsTables();
                processPlayerElements();

                const currentPlayerIds = new Set<string>();
                document.querySelectorAll("a.player").forEach((player) => {
                  const href = player.getAttribute("href");
                  if (href && href.startsWith("/profile/")) {
                    const steamId = href.replace("/profile/", "");
                    currentPlayerIds.add(steamId);
                  }
                });

                for (const [steamId, element] of faceitIconMap.entries()) {
                  if (!currentPlayerIds.has(steamId) && element.parentNode) {
                    element.parentNode.removeChild(element);
                    faceitIconMap.delete(steamId);
                    const index = addedFaceitElements.indexOf(element);
                    if (index !== -1) {
                      addedFaceitElements.splice(index, 1);
                    }
                  }
                }
              } finally {
                setTimeout(() => {
                  ignoreObserverChanges = false;
                }, 100);
              }
            }, 50);
          }
        },
        () => container,
        {
          childList: true,
          subtree: true,
          attributes: true,
        }
      );
    });

    const teamPlayerContainers = document.querySelectorAll(
      ".team1-players, .team2-players"
    );
    teamPlayerContainers.forEach((container) => {
      createSafeObserver(
        (mutations) => {
          if (!isFeatureEnabled || ignoreObserverChanges) return;

          for (const mutation of mutations) {
            if (mutation.type === "childList") {
              const addedNodes = Array.from(mutation.addedNodes);
              const hasPlayerList = addedNodes.some(
                (node) =>
                  node instanceof HTMLElement &&
                  (node.classList.contains("player-list") ||
                    node.querySelector(".player-list"))
              );

              if (hasPlayerList) {
                console.log(
                  "Team player container changed, setting up observers again"
                );
                setTimeout(() => {
                  ignoreObserverChanges = true;
                  try {
                    setupTeamPositionObserver();
                  } finally {
                    setTimeout(() => {
                      ignoreObserverChanges = false;
                    }, 100);
                  }
                }, 100);
                break;
              }
            }
          }
        },
        () => container,
        { childList: true }
      );
    });
  } catch (error) {
    console.error("Error setting up team position observer:", error);
  }
}

function processPlayerElements() {
  const playerElements = document.querySelectorAll("a.player");
  if (playerElements.length === 0) {
    return;
  }

  console.log("Processing player elements");

  let newPlayersFound = false;
  let steamIds: string[] = [];
  let playerElems: Map<string, HTMLElement> = new Map();

  playerElements.forEach((player) => {
    const href = player.getAttribute("href");
    if (href && href.startsWith("/profile/")) {
      const steamId = href.replace("/profile/", "");

      // Skip if we've already processed this player and they have a valid icon
      const existingIcon = player.querySelector(".faceit-icon");
      if (processedPlayers.has(player) && existingIcon) {
        return;
      }

      newPlayersFound = true;

      // Only mark as processed if we're actually going to process it
      if (!processedPlayers.has(player)) {
        processedPlayers.add(player);
      }

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

    // Extract the Steam ID from the player element
    const href = playerElem.getAttribute("href");
    const steamId = href ? href.replace("/profile/", "") : null;

    // Skip if we can't determine the Steam ID
    if (!steamId) {
      return;
    }

    // Check if the player element already has a faceit-icon
    const existingIcon = playerElem.querySelector(".faceit-icon");
    if (existingIcon) {
      // If the player already has an icon, update its contents directly
      updateExistingFaceitIcon(existingIcon as HTMLElement, faceitInfo);
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
    faceitIconElement.setAttribute("data-steam-id", steamId);

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

    // Store mapping of Steam ID to faceit icon element
    faceitIconMap.set(steamId, faceitIconElement);
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
 * Update an existing Faceit icon with new data
 */
function updateExistingFaceitIcon(iconElement: HTMLElement, faceitInfo: any) {
  try {
    // Check if extension context is valid
    if (!isExtensionContextValid()) {
      return;
    }

    // Get the img element within the icon, either direct or within an <a> tag
    const imgElement = iconElement.querySelector("img");
    if (!imgElement) return;

    // Get the tooltip element
    const tooltipElement = iconElement.querySelector(".clutch-tooltip");
    if (!tooltipElement) return;

    // Update the icon path and tooltip text
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
    if (!levelIconPath) return;

    // Update the image source
    imgElement.src = levelIconPath;
    imgElement.alt = tooltipText;

    // Update the tooltip text
    tooltipElement.textContent = tooltipText;

    // If there's an anchor element, update its href
    const anchorElement = iconElement.querySelector("a");
    if (anchorElement && profileUrl) {
      anchorElement.href = profileUrl;
    }
    // If we have a profile URL but no anchor, or vice versa, we'd need to recreate the element
    // But that's more complex and may cause flickering, so we'll stick with this simple update
  } catch (error) {
    console.error("Error updating existing Faceit icon:", error);
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

    // Extract the Steam ID from the player row
    const href = playerRow.getAttribute("href");
    const steamId = href ? href.replace("/profile/", "") : null;

    // Skip if we can't determine the Steam ID
    if (!steamId) {
      return;
    }

    // Check if the player row already has a faceit-icon
    const existingIcon = playerRow.querySelector(".faceit-icon");
    if (existingIcon) {
      // If the player already has an icon, update its contents directly
      updateExistingFaceitIcon(existingIcon as HTMLElement, faceitInfo);
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
    faceitIconElement.setAttribute("data-steam-id", steamId);
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

    // Store mapping of Steam ID to faceit icon element
    faceitIconMap.set(steamId, faceitIconElement);
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
export function updateFaceitRanksSettings(enabled: boolean) {
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
      initializeFaceitRanks(enabled);
    } else {
      // If already enabled, just refresh the observers
      if (enabled) {
        setupTeamPositionObserver();
      }
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
