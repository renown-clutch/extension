import { type UserSettings } from "../lib/types";
import { createRankBadgeElement } from "../utils/rankBadgeUtils";
import { is404Page } from "../utils/pageUtils";
import { waitForElement } from "../utils/profileUtils";
import browserAPI from "../lib/browserAPI";

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

  // Remove injected CSS when cleaning up
  const styleElement = document.getElementById("clutch-friends-list-styles");
  if (styleElement) {
    styleElement.remove();
  }
}

function renderFriendRanks(
  friendIds: string[],
  ranks: Record<string, number | null>,
  sortByElo: boolean
): void {
  if (sortByElo) {
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
    chrome.runtime.sendMessage(
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

export async function initializeFriendsList(
  settings: UserSettings
): Promise<void> {
  if (!isFriendsPage()) {
    return;
  }

  if (!settings.showFriendListRanks) {
    removeRankBadges();
    return;
  }

  if (is404Page()) {
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

  renderFriendRanks(friendIds, ranks, settings.sortFriendsByRenownElo);
}
