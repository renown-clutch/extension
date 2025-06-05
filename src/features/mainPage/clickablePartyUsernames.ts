import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { getCurrentPage } from "$utils/common/pageUtils";
import browserAPI from "$system/lib/browserAPI";

let mutationObserver: MutationObserver | null = null;

async function getSteamIdsByNames(
  playerNames: string[]
): Promise<Record<string, string>> {
  try {
    return new Promise((resolve, reject) => {
      browserAPI.runtime.sendMessage(
        {
          type: "getSteamIdsByNames",
          playerNames: playerNames,
        },
        (response) => {
          if (response && response.success) {
            resolve(response.data);
          } else {
            resolve({});
          }
        }
      );
    });
  } catch (error) {
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
    return {
      playerCount: 0,
      playerNames: [],
      cardCount: 0,
    };
  }

  const playerCards = partyList.querySelectorAll(".party-player-card");
  const playerNames: string[] = [];

  for (const card of playerCards) {
    const nameElement = card.querySelector(".name");

    if (nameElement) {
      const playerName = nameElement.textContent?.trim();

      if (playerName) {
        playerNames.push(playerName);
      }
    }
  }

  return {
    playerCount: playerNames.length,
    playerNames: playerNames,
    cardCount: playerCards.length,
  };
}

function makeUsernamesClickable(
  playerNameToCardMap: Record<string, Element>,
  playerNameToSteamIdMap: Record<string, string>
): void {
  Object.entries(playerNameToCardMap).forEach(([playerName, card]) => {
    const nameElement = card.querySelector(".name");
    const steamId = playerNameToSteamIdMap[playerName];

    if (nameElement && steamId && steamId !== "not_found") {
      // Check if already made clickable
      if (nameElement.hasAttribute("data-clutch-clickable")) {
        return;
      }

      const originalHTML = nameElement.innerHTML;
      const originalTextContent = nameElement.textContent;

      // Mark as processed
      nameElement.setAttribute("data-clutch-clickable", "true");

      // Create clickable link
      const profileLink = document.createElement("a");
      profileLink.href = `/profile/${steamId}`;
      profileLink.innerHTML = originalHTML;
      profileLink.style.cssText = "color: inherit; text-decoration: none;";

      // Handle mouse events
      const cleanup = () => {
        if (profileLink.parentNode === nameElement) {
          nameElement.innerHTML = originalHTML;
          nameElement.removeAttribute("data-clutch-clickable");
        }
      };

      profileLink.addEventListener("mouseenter", () => {
        profileLink.style.textDecoration = "underline";
      });

      profileLink.addEventListener("mouseleave", () => {
        profileLink.style.textDecoration = "none";
      });

      // Handle cleanup on certain events
      profileLink.addEventListener("click", cleanup);

      // Replace content with clickable link
      nameElement.innerHTML = "";
      nameElement.appendChild(profileLink);
    }
  });
}

function removeClickableUsernames() {
  const clickableElements = document.querySelectorAll(
    "[data-clutch-clickable]"
  );
  clickableElements.forEach((element) => {
    const link = element.querySelector("a");
    if (link) {
      // Restore original content
      element.innerHTML = link.innerHTML;
      element.removeAttribute("data-clutch-clickable");
    }
  });
}

async function updateClickableUsernames(): Promise<void> {
  try {
    // Clean up existing clickable usernames first
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
      playerNameToSteamIdMap[playerName] = steamId;
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

function removeClickablePartyUsernames(): void {
  removeClickableUsernames();

  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
}

async function initializeClickablePartyUsernames(
  settings: UserSettings
): Promise<void> {
  if (!settings) {
    return;
  }

  const currentPage = getCurrentPage();

  if (currentPage.type !== "play") {
    removeClickablePartyUsernames();
    return;
  }

  // Remove existing functionality first
  removeClickablePartyUsernames();

  if (!settings.enableClickablePartyUsernames) {
    return;
  }

  try {
    // Initialize clickable usernames
    await updateClickableUsernames();
    // Set up mutation observer after initial setup
    setupMutationObserver();
  } catch (error) {
    console.error("[ClickablePartyUsernames] Error in initialization:", error);
  }
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "enableClickablePartyUsernames",
  category: "mainPage",
  defaultValue: true,
  description: "Make party usernames clickable",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["play"]),
    ActivationHelpers.whenEnabled("enableClickablePartyUsernames")
  ),

  handler: initializeClickablePartyUsernames,

  apiCalls: [
    {
      requestType: "getSteamIdsByNames",
      responseType: "steam_ids_by_names_data",
    },
  ],
});
