import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { createRankBadgeElement } from "$utils/data/rankBadgeUtils";
import { is404Page } from "$utils/common/pageUtils";
import { waitForElement } from "$utils/profileUtils";
import browserAPI from "$system/lib/browserAPI";

const FRIENDS_PAGE_REGEX = /\/profile\/(\d+)\/friends/;

function isFriendsPage(): boolean {
  return FRIENDS_PAGE_REGEX.test(window.location.pathname);
}

function removeRankBadges(): void {
  const tooltipWrappers = document.querySelectorAll(
    ".profile-friend-list .tooltip-wrapper"
  );
  tooltipWrappers.forEach((wrapper) => {
    wrapper.remove();
  });
}

function sortFriendsList(
  friendIds: string[],
  ranks: Record<string, number | null>
): void {
  const friendListContainer = document.querySelector(".profile-friend-list");
  if (friendListContainer) {
    const steamIdToRow = new Map();
    const friendRows = friendListContainer.querySelectorAll(".friend-row");
    friendRows.forEach((row) => {
      const profileLink = row.querySelector("a.profile-link");
      if (!profileLink) return;
      const href = profileLink.getAttribute("href");
      if (!href) return;
      const match = href.match(/\/profile\/(\d+)/);
      if (!match || !match[1]) return;
      steamIdToRow.set(match[1], row);
    });

    const sortedIds = [...friendIds].sort((a, b) => {
      const eloA = ranks[a] ?? -1;
      const eloB = ranks[b] ?? -1;
      return eloB - eloA;
    });

    sortedIds.forEach((id) => {
      const row = steamIdToRow.get(id);
      if (row) friendListContainer.appendChild(row);
    });
  }
}

function renderFriendRanks(
  friendIds: string[],
  ranks: Record<string, number | null>
): void {
  const friendRows = document.querySelectorAll(
    ".profile-friend-list .friend-row"
  );

  friendRows.forEach((row) => {
    const profileLink = row.querySelector("a.profile-link");
    if (!profileLink) return;

    const href = profileLink.getAttribute("href");
    if (!href) return;

    const match = href.match(/\/profile\/(\d+)/);
    if (!match || !match[1]) return;

    const steamId = match[1];
    const elo = ranks[steamId];

    if (
      elo === undefined ||
      elo === null ||
      row.querySelector(".tooltip-wrapper")
    )
      return;

    const badgeElement = createRankBadgeElement(elo, 25, true);
    badgeElement.classList.add("clutch-animate-fade-in-scale");
    const actionsDiv = row.querySelector(".actions");

    if (actionsDiv) {
      row.insertBefore(badgeElement, actionsDiv.nextSibling);
    } else {
      row.appendChild(badgeElement);
    }
  });
}

async function extractFriendIds(): Promise<string[]> {
  const friendListContainer = await waitForElement(".profile-friend-list");
  if (!friendListContainer) return [];

  const profileLinks = friendListContainer.querySelectorAll("a.profile-link");
  const friendIds: string[] = [];

  profileLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href) {
      const match = href.match(/\/profile\/(\d+)/);
      if (match && match[1]) {
        friendIds.push(match[1]);
      }
    }
  });

  return friendIds;
}

async function fetchFriendsRanks(
  steamIds: string[]
): Promise<Record<string, number | null>> {
  return new Promise((resolve, reject) => {
    browserAPI.runtime.sendMessage(
      {
        type: "fetchUsersRanks",
        steamIds: steamIds,
      },
      (response) => {
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error("Failed to fetch user ranks"));
        }
      }
    );
  });
}

async function initializeFriendsList(settings: UserSettings): Promise<void> {
  if (!isFriendsPage()) {
    return;
  }

  if (is404Page()) {
    return;
  }

  // Always clean up first
  removeRankBadges();

  if (!settings.showFriendListRanks) {
    return;
  }

  const friendIds = await extractFriendIds();

  if (friendIds.length === 0) return;

  let ranks = {};

  try {
    ranks = await fetchFriendsRanks(friendIds);
  } catch (error) {
    console.error("[Clutch] Error fetching friend ranks:", error);
    return;
  }

  renderFriendRanks(friendIds, ranks);

  // Apply sorting if enabled
  if (settings.sortFriendsByRenownElo) {
    sortFriendsList(friendIds, ranks);
  }
}

// Register the main friends list feature
registerFeature({
  settingKey: "showFriendListRanks",
  category: "profile",
  defaultValue: true,
  description: "Show ranks in profile friends list",

  // Custom activation logic: profile page + friends URL + enabled
  shouldActivate: (currentPage, settings) => {
    if (currentPage.type !== "profile") return false;
    return isFriendsPage();
  },

  handler: initializeFriendsList,
  cleanupHandler: () => {
    removeRankBadges();
  },

  // This feature depends on sorting setting changes
  dependsOn: ["sortFriendsByRenownElo"],

  apiCalls: [
    {
      requestType: "fetchUsersRanks",
      responseType: "users_ranks_data",
    },
  ],
});

// Register the sorting feature as a separate feature that depends on friends list
registerFeature({
  settingKey: "sortFriendsByRenownElo",
  category: "profile",
  defaultValue: false,
  description: "Sort friends by Renown ELO",

  // Only activate when both sorting is enabled AND friends list is enabled
  shouldActivate: (currentPage, settings) => {
    if (currentPage.type !== "profile") return false;
    if (!isFriendsPage()) return false;
    return settings.showFriendListRanks; // Only when friend ranks are shown
  },

  handler: initializeFriendsList, // Use the same handler
  cleanupHandler: () => {
    // When sorting is disabled, re-run the friends list to reset order
    removeRankBadges();
  },

  // This feature depends on the main friends list feature
  dependsOn: ["showFriendListRanks"],
});
