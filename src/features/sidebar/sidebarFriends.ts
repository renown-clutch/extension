import { registerFeature, ActivationHelpers } from "$system/lib/featureRegistry";
import { waitForElement } from "$utils/profileUtils";
import { type UserSettings } from "$system/lib/types";
import {
  getRankTier,
  createRankBadgeElement,
} from "$utils/data/rankBadgeUtils";
import browserAPI from "$system/lib/browserAPI";
import "./sidebarFriends.css";

let friendsObserver: MutationObserver | null = null;

function removeRankBadges(): void {
  const tooltipWrappers = document.querySelectorAll(
    ".sidebar-content .friends .profile-link .tooltip-wrapper"
  );
  tooltipWrappers.forEach((wrapper) => {
    wrapper.remove();
  });

  // Remove injected CSS when cleaning up
  const styleElement = document.getElementById("clutch-sidebar-friends-styles");
  if (styleElement) {
    styleElement.remove();
  }
}

function renderFriendRanks(ranks: Record<string, number | null>): void {
  const playFriendList = document.querySelector(
    ".play-friend-list"
  ) as HTMLElement;
  if (playFriendList) {
    playFriendList.classList.add("clutch-sidebar-friends-container");
  }
  const friendRows = playFriendList.querySelectorAll(".friend-row");

  friendRows.forEach((row) => {
    const profileLink = row.querySelector(".profile-link") as HTMLElement;
    if (!profileLink) return;

    if (profileLink.querySelector(".tooltip-wrapper")) return;

    const href = profileLink.getAttribute("href");
    if (!href) return;
    profileLink.classList.add("clutch-sidebar-friend-profile-link");

    const match = href.match(/\/profile\/(\d+)/);
    if (!match || !match[1]) return;

    const steamId = match[1];
    const elo = ranks[steamId];

    if (elo === undefined || elo === null) return;

    const rankTier = getRankTier(elo);
    if (!rankTier) return;

    const badgeElement = createRankBadgeElement(elo, 20, true);
    profileLink.appendChild(badgeElement);
  });
}

async function extractFriendIds(): Promise<string[]> {
  const friendsContainer = document.querySelector(".sidebar-content .friends");
  if (!friendsContainer) return [];

  const profileLinks = friendsContainer.querySelectorAll(".profile-link");

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

async function processSidebarFriends(showRanks: boolean): Promise<void> {
  const sidebarFriends = await waitForElement(".sidebar-content .friends");
  if (!sidebarFriends) {
    return;
  }

  const friendIds = await extractFriendIds();

  if (friendIds.length > 0) {
    const ranks = await fetchFriendsRanks(friendIds);
    renderFriendRanks(ranks);
  }
}

function setupFriendsObserver(settings: UserSettings): void {
  if (friendsObserver) {
    friendsObserver.disconnect();
    friendsObserver = null;
  }

  if (!settings.showSidebarFriendRanks) return;

  const friendsContainer = document.querySelector(".sidebar-content .friends");
  if (!friendsContainer) return;

  friendsObserver = new MutationObserver((mutations) => {
    const playFriendList = document.querySelector(".play-friend-list");
    if (!playFriendList) return;

    processSidebarFriends(settings.showSidebarFriendRanks);
  });

  friendsObserver.observe(friendsContainer, {
    childList: true,
    subtree: true,
  });
}

function initializeSidebarFriends(settings: UserSettings): void {
  if (!settings.showSidebarFriendRanks) {
    if (friendsObserver) {
      friendsObserver.disconnect();
      friendsObserver = null;
    }
    removeRankBadges();
    return;
  }

  processSidebarFriends(settings.showSidebarFriendRanks);
  setupFriendsObserver(settings);
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "showSidebarFriendRanks",
  category: "sidebar",
  defaultValue: true,
  description: "Show friend ranks in sidebar",

  // Active on all pages when enabled (sidebar is global)
  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.always, // Always available across pages
    ActivationHelpers.whenEnabled("showSidebarFriendRanks")
  ),

  handler: initializeSidebarFriends,

  apiCalls: [
    {
      requestType: "fetchUsersRanks",
      responseType: "users_ranks_data",
    },
  ],
});
