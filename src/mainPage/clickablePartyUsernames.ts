import browserAPI from "../lib/browserAPI";
import { waitForElement } from "../utils/profileUtils";
import { waitForHydrationComplete } from "../utils/hydrationUtils";
import type { UserSettings } from "../lib/types";
import { getCurrentPage } from "../utils/pageUtils";

let mutationObserver: MutationObserver | null = null;
let cleanupFunctions: Array<() => void> = [];

async function getSteamIdsByNames(
  playerNames: string[]
): Promise<Record<string, string>> {
  try {
    const response = await browserAPI.runtime.sendMessage({
      type: "getSteamIdsByNames",
      playerNames,
    });

    if (!response?.success || !response?.data) {
      console.warn("Failed to get steam IDs:", response);
      return {};
    }

    return response.data as Record<string, string>;
  } catch (error) {
    console.error("Error getting steam IDs:", error);
    return {};
  }
}

function gatherPlayerNamesForClickable(): {
  playerCount: number;
  playerNames: string[];
  cardCount: number;
} {
  const partyList = document.querySelector("div.party-list");
  if (!partyList) {
    return { playerCount: 0, playerNames: [], cardCount: 0 };
  }

  const playerCards = partyList.querySelectorAll(".party-player-card");

  if (playerCards.length === 0) {
    return { playerCount: 0, playerNames: [], cardCount: 0 };
  }

  // Count all cards including empty ones for debugging

  const playerNames: string[] = [];
  const playerNameToCardMap: Record<string, Element> = {};

  playerCards.forEach((card, index) => {
    const nameElement = card.querySelector(".name");

    if (nameElement) {
      const playerName = nameElement.textContent?.trim();

      if (playerName) {
        playerNames.push(playerName);
        playerNameToCardMap[playerName] = card;
      }
    } else {
      // Try alternative selectors for name
      const altNameElement = card.querySelector(
        ".party-player-name, .player-name, [class*='name']"
      );

      if (altNameElement) {
        const playerName = altNameElement.textContent?.trim();

        if (playerName) {
          playerNames.push(playerName);
          playerNameToCardMap[playerName] = card;
        }
      } else {
        // Final attempt: scan all elements for player names
        const allElements = card.querySelectorAll("*");
        allElements.forEach((el, elIndex) => {
          const text = el.textContent?.trim();
          if (
            text &&
            text.length > 2 &&
            text.length < 30 &&
            !text.includes("ELO") &&
            !text.includes("Level") &&
            /^[a-zA-Z0-9_-]+$/.test(text)
          ) {
            // Additional validation to ensure this looks like a username
          }
        });
      }
    }
  });

  return {
    playerCount: playerNames.length,
    playerNames,
    cardCount: playerCards.length,
  };
}

function makeUsernamesClickable(
  playerNameToCardMap: Record<string, Element>,
  playerNameToSteamIdMap: Record<string, string>
): void {
  Object.entries(playerNameToCardMap).forEach(
    ([playerName, card], entryIndex) => {
      const nameElement = card.querySelector(".name");

      if (nameElement && nameElement instanceof HTMLElement) {
        // Set data attribute
        nameElement.setAttribute("data-clutch-clickable", "true");

        // Store original cursor for potential cleanup
        const originalCursor = nameElement.style.cursor || "";

        // Apply clickable styling
        nameElement.style.cursor = "pointer";

        // Create cleanup function
        const cleanup = () => {
          nameElement.removeAttribute("data-clutch-clickable");
          nameElement.style.cursor = originalCursor;
          nameElement.onclick = null;
        };

        // Add click handler
        nameElement.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();

          const steamId = playerNameToSteamIdMap[playerName];

          if (steamId) {
            const profileUrl = `https://renown.gg/profile/${steamId}`;
            window.open(profileUrl, "_blank");
          } else {
            // Fallback: search by username
            const searchUrl = `https://renown.gg/search?q=${encodeURIComponent(
              playerName
            )}`;
            window.open(searchUrl, "_blank");
          }
        };

        // Store cleanup function for later removal
        cleanupFunctions.push(cleanup);
      } else {
        // Alternative: look for any element with matching text
        const allElements = card.querySelectorAll("*");
        allElements.forEach((el, elIndex) => {
          if (
            el instanceof HTMLElement &&
            el.textContent?.trim() === playerName &&
            !el.hasAttribute("data-clutch-clickable")
          ) {
            // Found a potential name element
          }
        });

        if (nameElement && nameElement.hasAttribute("data-clutch-clickable")) {
          // Element was already made clickable, skip
        }
      }
    }
  );
}

function removeClickableUsernames() {
  const clickableElements = document.querySelectorAll(
    "[data-clutch-clickable='true']"
  );

  clickableElements.forEach((element, index) => {
    if (cleanupFunctions[index]) {
      cleanupFunctions[index]();
    } else {
      console.warn("No cleanup function found for element", index);
    }
  });

  cleanupFunctions = [];
}

async function updateClickableUsernames(): Promise<void> {
  try {
    // Wait for hydration to complete before proceeding
    await waitForHydrationComplete();

    // Remove existing clickable usernames
    removeClickableUsernames();

    // Gather player names
    const { playerCount, playerNames, cardCount } =
      gatherPlayerNamesForClickable();

    if (playerNames.length === 0) {
      return;
    }

    // Get Steam IDs for the players
    const steamIdsData = await getSteamIdsByNames(playerNames);

    // Validate Steam IDs and create mapping
    const playerNameToSteamIdMap: Record<string, string> = {};
    playerNames.forEach((playerName) => {
      const steamId = steamIdsData[playerName];
      if (steamId && typeof steamId === "string" && steamId.length > 10) {
        playerNameToSteamIdMap[playerName] = steamId;
      } else if (steamId) {
        // Invalid Steam ID format
      } else {
        // No Steam ID found
      }
    });

    // Re-gather player data for making clickable (to get fresh DOM references)
    const freshData = gatherPlayerNamesForClickable();
    const playerNameToCardMap: Record<string, Element> = {};

    const partyList = document.querySelector("div.party-list");
    if (partyList) {
      const playerCards = partyList.querySelectorAll(".party-player-card");
      playerCards.forEach((card) => {
        const nameElement = card.querySelector(".name");
        if (nameElement) {
          const playerName = nameElement.textContent?.trim();
          if (playerName && freshData.playerNames.includes(playerName)) {
            playerNameToCardMap[playerName] = card;
          }
        }
      });
    }

    // Make usernames clickable with validated data
    makeUsernamesClickable(playerNameToCardMap, playerNameToSteamIdMap);
  } catch (error) {
    console.error("Error in updateClickableUsernames:", error);
  }
}

function setupMutationObserver(): void {
  // Disconnect existing observer
  if (mutationObserver) {
    mutationObserver.disconnect();
  }

  mutationObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false;

    mutations.forEach((mutation, index) => {
      // Skip mutations on our own elements
      if (
        mutation.target instanceof Element &&
        mutation.target.hasAttribute("data-clutch-extension")
      ) {
        return;
      }

      if (
        mutation.target instanceof Element &&
        mutation.target.hasAttribute("data-clutch-clickable")
      ) {
        return;
      }

      if (
        mutation.target instanceof Element &&
        mutation.target.closest("[data-clutch-clickable]")
      ) {
        return;
      }

      // Check if any added nodes are our elements
      if (mutation.addedNodes.length > 0) {
        const hasOwnElements = Array.from(mutation.addedNodes).some((node) => {
          if (node instanceof Element) {
            return (
              node.hasAttribute("data-clutch-extension") ||
              node.hasAttribute("data-clutch-clickable") ||
              node.querySelector("[data-clutch-extension]") ||
              node.querySelector("[data-clutch-clickable]")
            );
          }
          return false;
        });

        if (hasOwnElements) {
          return;
        }
      }

      // Check if any removed nodes are our elements
      if (mutation.removedNodes.length > 0) {
        const hasOwnElements = Array.from(mutation.removedNodes).some(
          (node) => {
            if (node instanceof Element) {
              return (
                node.hasAttribute("data-clutch-extension") ||
                node.hasAttribute("data-clutch-clickable") ||
                node.querySelector("[data-clutch-extension]") ||
                node.querySelector("[data-clutch-clickable]")
              );
            }
            return false;
          }
        );

        if (hasOwnElements) {
          return;
        }
      }

      // Ignore tooltip-related changes
      if (mutation.target instanceof Element) {
        const targetClasses = mutation.target.className;
        if (
          typeof targetClasses === "string" &&
          (targetClasses.includes("tooltip") ||
            targetClasses.includes("popover") ||
            targetClasses.includes("dropdown"))
        ) {
          return;
        }
      }

      // Check for relevant changes
      if (mutation.type === "childList") {
        const hasRelevantChanges = Array.from(mutation.addedNodes).some(
          (node) => {
            if (node instanceof Element) {
              return (
                node.matches(".party-player-card") ||
                node.querySelector(".party-player-card") ||
                node.matches(".party-list") ||
                node.querySelector(".party-list")
              );
            }
            return false;
          }
        );

        if (hasRelevantChanges) {
          // Likely a hydration or data change
          shouldUpdate = true;
        }
      }
    });

    if (shouldUpdate) {
      // Debounce the update
      setTimeout(() => {
        updateClickableUsernames();
      }, 100);
    }
  });

  // Observe the party container for changes
  const partyContainer = document.querySelector(".party-list");
  if (partyContainer) {
    mutationObserver.observe(partyContainer, {
      childList: true,
      subtree: true,
      attributes: false,
    });
  }
}

export function removeClickablePartyUsernames(): void {
  removeClickableUsernames();

  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
}

export function initializeClickablePartyUsernames(
  settings: UserSettings
): void {
  if (!settings) {
    return;
  }

  // Remove existing functionality first
  removeClickablePartyUsernames();

  if (!settings.enableClickablePartyUsernames) {
    return;
  }

  // Initialize clickable usernames
  updateClickableUsernames().then(() => {
    // Set up mutation observer after initial setup
    setupMutationObserver();
  });
}
