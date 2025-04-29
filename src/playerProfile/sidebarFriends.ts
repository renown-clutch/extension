import { type UserSettings } from "../lib/types";
import { getRankTier, createRankBadgeElement } from "../utils/rankBadgeUtils";

function removeRankBadges(): void {
  const tooltipWrappers = document.querySelectorAll(
    ".sidebar-content .friends .profile-link .tooltip-wrapper"
  );
  tooltipWrappers.forEach((wrapper) => {
    wrapper.remove();
  });
}

function renderFriendRanks(ranks: Record<string, number | null>): void {
  const friendRows = document.querySelectorAll(
    ".sidebar-content .friends .friend-row"
  );

  friendRows.forEach((row) => {
    const profileLink = row.querySelector(".profile-link");
    if (!profileLink) return;

    if (profileLink.querySelector(".tooltip-wrapper")) return;

    const href = profileLink.getAttribute("href");
    if (!href) return;

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
  const sidebarFriends = document.querySelector(".sidebar-content .friends");
  if (!sidebarFriends) {
    return;
  }

  const friendIds = await extractFriendIds();

  if (friendIds.length > 0) {
    injectCollapseCSS();
    const ranks = await fetchFriendsRanks(friendIds);
    renderFriendRanks(ranks);
  }
}

function injectCollapseCSS(): void {
  const styleId = "clutch-sidebar-rank-style";

  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    /* Hide badges when sidebar is collapsed */
    .play-friend-list.collapsed .friend-row .profile-link .tooltip-wrapper {
      display: none;
    }
    
    /* Fix layout for friend rows */
    .sidebar-content .friends .friend-row .profile-link {
      display: flex !important;
      align-items: center !important;
      position: relative !important;
      width: 100% !important;
      overflow: hidden !important;
    }
    
    /* Ensure avatar keeps its size */
    .sidebar-content .friends .friend-row .profile-link .avatar {
      flex-shrink: 0 !important;
    }
    
    /* Make info area flexible but prevent overflow */
    .sidebar-content .friends .friend-row .profile-link .info {
      flex: 1 !important;
      min-width: 0 !important;
      overflow: hidden !important;
    }
    
    /* Prevent name from causing overflow */
    .sidebar-content .friends .friend-row .profile-link .info .name {
      text-overflow: ellipsis !important;
      overflow: hidden !important;
      white-space: nowrap !important;
    }
    
    /* Position rank badge consistently */
    .sidebar-content .friends .friend-row .profile-link .tooltip-wrapper {
      margin-left: auto !important;
      margin-right: 8px !important;
      flex-shrink: 0 !important;
    }
    
    /* Make rank badge more compact */
    .sidebar-content .friends .friend-row .profile-link .tooltip-wrapper .rank-badge {
      padding: 0 6px !important;
    }
  `;

  document.head.appendChild(style);
}

export function initializeSidebarFriends(settings?: UserSettings): void {
  if (!settings?.showSidebarFriendRanks) {
    removeRankBadges();
    return;
  }

  processSidebarFriends(settings.showSidebarFriendRanks);
}
