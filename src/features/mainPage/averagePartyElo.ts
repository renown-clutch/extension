import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { getCurrentPage } from "$utils/common/pageUtils";
import { waitForElement } from "$utils/profileUtils";

import {
  smartUpdateAveragePartyElo,
  smartUpdatePlayerFaceitBadges,
  smartUpdateAverageFaceitBadge,
} from "$utils/ui/smartBadgeUpdates";

import browserAPI from "$system/lib/browserAPI";

let partyObserver: MutationObserver | null = null;

async function getFaceitEloByNames(
  playerNames: string[]
): Promise<Record<string, number | null>> {
  try {
    return new Promise((resolve, reject) => {
      browserAPI.runtime.sendMessage(
        {
          type: "fetchFaceitEloByNames",
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

async function setupPartyObserver(settings: UserSettings): Promise<void> {
  let partyList: Element;

  try {
    partyList = await Promise.race([
      waitForElement("div.party-list"),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout waiting for div.party-list")),
          5000
        )
      ),
    ]);

    if (!partyList) {
      return;
    }
  } catch (error) {
    return;
  }

  if (partyObserver) {
    partyObserver.disconnect();
  }

  partyObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false;

    mutations.forEach((mutation) => {
      if (
        mutation.target instanceof Element &&
        mutation.target.hasAttribute("data-clutch-extension")
      ) {
        return;
      }

      if (
        mutation.target instanceof Element &&
        mutation.target.closest("[data-clutch-extension]")
      ) {
        return;
      }

      if (mutation.addedNodes.length > 0) {
        const hasOwnElements = Array.from(mutation.addedNodes).some((node) => {
          if (node instanceof Element) {
            return (
              node.hasAttribute("data-clutch-extension") ||
              node.querySelector("[data-clutch-extension]")
            );
          }
          return false;
        });

        if (hasOwnElements) {
          return;
        }
      }

      if (mutation.removedNodes.length > 0) {
        const hasOwnElements = Array.from(mutation.removedNodes).some(
          (node) => {
            if (node instanceof Element) {
              return (
                node.hasAttribute("data-clutch-extension") ||
                node.querySelector("[data-clutch-extension]")
              );
            }
            return false;
          }
        );

        if (hasOwnElements) {
          return;
        }
      }

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
          shouldUpdate = true;
        }
      }
    });

    if (shouldUpdate) {
      updatePartyDisplay(settings);
    }
  });

  partyObserver.observe(partyList, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  const parentContainer = partyList.parentElement;
  if (parentContainer) {
    partyObserver.observe(parentContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }
}

async function gatherPlayerData(showSinglePlayers: boolean = false): Promise<{
  playerNames: string[];
  playerNameToCardMap: Record<string, Element>;
  averageElo: number | null;
  playerCount: number;
}> {
  let partyList;
  try {
    partyList = await Promise.race([
      waitForElement("div.party-list"),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout waiting for div.party-list")),
          1000
        )
      ),
    ]);
  } catch (error) {
    console.warn("[AveragePartyElo] Party list not found:", error);
    return {
      playerNames: [],
      playerNameToCardMap: {},
      averageElo: null,
      playerCount: 0,
    };
  }

  if (!partyList) {
    return {
      playerNames: [],
      playerNameToCardMap: {},
      averageElo: null,
      playerCount: 0,
    };
  }

  const playerCards = partyList.querySelectorAll(".party-player-card");
  const playerNames: string[] = [];
  const playerNameToCardMap: Record<string, Element> = {};
  let totalElo = 0;
  let validPlayerCount = 0;

  for (const card of playerCards) {
    const nameElement = card.querySelector(".name");
    const eloElement = card.querySelector(".elo");

    if (nameElement && eloElement) {
      const playerName = nameElement.textContent?.trim();

      let eloText = "";
      for (const node of eloElement.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          eloText += node.textContent || "";
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (!element.hasAttribute("data-clutch-extension")) {
            eloText += element.textContent || "";
          }
        }
      }
      eloText = eloText.trim();

      if (playerName && eloText) {
        const eloNumber = parseInt(eloText.replace(/[^\d]/g, ""), 10);

        if (!isNaN(eloNumber)) {
          playerNames.push(playerName);
          playerNameToCardMap[playerName] = card;
          totalElo += eloNumber;
          validPlayerCount++;
        }
      }
    }
  }

  const averageElo =
    validPlayerCount > 0 ? Math.round(totalElo / validPlayerCount) : null;

  if (validPlayerCount <= 1 && !showSinglePlayers) {
    return {
      playerNames: [],
      playerNameToCardMap: {},
      averageElo: null,
      playerCount: 0,
    };
  }

  return {
    playerNames,
    playerNameToCardMap,
    averageElo,
    playerCount: validPlayerCount,
  };
}

function removeAllFaceitBadges(): void {
  const faceitBadges = document.querySelectorAll(
    "[data-clutch-extension='faceit-badge-player']"
  );
  faceitBadges.forEach((badge) => badge.remove());

  const averageFaceitBadges = document.querySelectorAll(
    "[data-clutch-extension='faceit-badge-party-average']"
  );
  averageFaceitBadges.forEach((badge) => badge.remove());
}

function removeAveragePartyEloDisplay(): void {
  const averageEloDisplays = document.querySelectorAll(
    "[data-clutch-extension='average-party-elo']"
  );
  averageEloDisplays.forEach((display) => display.remove());
}

async function updatePartyDisplay(settings: UserSettings): Promise<void> {
  try {
    const { playerNames, playerNameToCardMap, averageElo, playerCount } =
      await gatherPlayerData(settings.showFaceitEloOnPartyList);

    if (playerCount === 0) {
      removeAveragePartyEloDisplay();
      removeAllFaceitBadges();
      return;
    }

    if (
      settings.showAveragePartyElo &&
      averageElo !== null &&
      playerCount > 1
    ) {
      await smartUpdateAveragePartyElo(averageElo);
    } else {
      removeAveragePartyEloDisplay();
    }

    if (settings.showFaceitEloOnPartyList && playerNames.length > 0) {
      const faceitData = await getFaceitEloByNames(playerNames);
      smartUpdatePlayerFaceitBadges(playerNameToCardMap, faceitData);
      if (
        settings.showAveragePartyElo &&
        averageElo !== null &&
        playerCount > 1
      ) {
        const existingWrapper = document.querySelector(
          "[data-clutch-extension='average-party-elo']"
        ) as HTMLElement;
        if (existingWrapper) {
          smartUpdateAverageFaceitBadge(existingWrapper, faceitData);
        }
      }
    } else {
      removeAllFaceitBadges();
    }
  } catch (error) {
    console.error("[AveragePartyElo] Error in updatePartyDisplay:", error);
  }
}

function removeAveragePartyElo(disconnectObserver = true): void {
  removeAveragePartyEloDisplay();
  removeAllFaceitBadges();

  if (disconnectObserver && partyObserver) {
    partyObserver.disconnect();
    partyObserver = null;
  }
}

async function initializeAveragePartyElo(
  settings: UserSettings
): Promise<void> {
  if (!settings) {
    console.warn("[AveragePartyElo] No settings provided");
    return;
  }

  const currentPage = getCurrentPage();

  if (currentPage.type !== "play") {
    console.warn(
      "[AveragePartyElo] Not on play page, current page:",
      currentPage.type
    );
    return;
  }

  try {
    await setupPartyObserver(settings);

    await updatePartyDisplay(settings);
  } catch (error) {
    console.error("[AveragePartyElo] Error in initialization:", error);
  }
}

registerFeature({
  settingKey: "showAveragePartyElo",
  category: "mainPage",
  defaultValue: true,
  description: "Show average party ELO",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["play"]),
    ActivationHelpers.or(
      ActivationHelpers.whenEnabled("showAveragePartyElo"),
      ActivationHelpers.whenEnabled("showFaceitEloOnPartyList")
    )
  ),

  dependsOn: ["showFaceitEloOnPartyList"], // This feature also responds to Faceit ELO changes

  handler: initializeAveragePartyElo,
  cleanupHandler: () => removeAveragePartyElo(true),

  apiCalls: [
    {
      requestType: "fetchFaceitEloByNames",
      responseType: "faceit_elo_by_names_data",
    },
  ],
});
