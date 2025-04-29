import { isProfilePage, waitForElement } from "../utils/profileUtils";
import { type UserSettings } from "../lib/types";
import { createSafeObserver } from "../utils/observerUtils";
import { createRankBadgeElement } from "../utils/rankBadgeUtils";

const FRIENDS_PAGE_REGEX = /\/profile\/(\d+)\/friends/;
let showRanks = true;
let sortFriendsByRenownElo = false;
let isProcessing = false;
let lastProcessedUrl = "";
let debounceTimer: number | null = null;

function isFriendsPage(): boolean {
  return FRIENDS_PAGE_REGEX.test(window.location.pathname);
}

function applyFriendListStyling(): void {
  // Check if the style is already added
  if (document.getElementById("clutch-friends-list-style")) return;

  const styleEl = document.createElement("style");
  styleEl.id = "clutch-friends-list-style";
  styleEl.textContent = `
    .profile-friend-list .friend-row {
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .profile-friend-list .friend-row .profile-link {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      margin-right: 10px;
    }
    .profile-friend-list .friend-row .info {
      overflow: hidden;
      flex: 1;
    }
    .profile-friend-list .friend-row .info .name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
    }
    .profile-friend-list .friend-row .tooltip-wrapper {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      margin-left: auto;
      margin-right: 10px;
    }
  `;
  document.head.appendChild(styleEl);
}

function removeRankBadges(): void {
  const tooltipWrappers = document.querySelectorAll(
    ".profile-friend-list .tooltip-wrapper"
  );
  tooltipWrappers.forEach((wrapper) => {
    wrapper.remove();
  });
}

function renderFriendRanks(
  friendIds: string[],
  ranks: Record<string, number | null>
): void {
  // Apply styling to ensure consistent layout
  applyFriendListStyling();

  // If sorting is enabled, rearrange the DOM order of .friend-row elements
  if (sortFriendsByRenownElo) {
    const friendListContainer = document.querySelector(".profile-friend-list");
    if (friendListContainer) {
      // Map steamId to friend-row element
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
      // Sort friendIds by Elo
      const sortedIds = [...friendIds].sort((a, b) => {
        const eloA = ranks[a] ?? -1;
        const eloB = ranks[b] ?? -1;
        return eloB - eloA;
      });
      // Re-append rows in sorted order
      sortedIds.forEach((id) => {
        const row = steamIdToRow.get(id);
        if (row) friendListContainer.appendChild(row);
      });
    }
  }

  // Find all friend rows inside the profile-friend-list div
  const friendRows = document.querySelectorAll(
    ".profile-friend-list .friend-row"
  );

  friendRows.forEach((row) => {
    // Get profile link and extract steam ID
    const profileLink = row.querySelector("a.profile-link");
    if (!profileLink) return;

    const href = profileLink.getAttribute("href");
    if (!href) return;

    const match = href.match(/\/profile\/(\d+)/);
    if (!match || !match[1]) return;

    const steamId = match[1];
    const elo = ranks[steamId];

    // Skip if we don't have rank info, elo is null, or already added a badge
    if (
      elo === undefined ||
      elo === null ||
      row.querySelector(".tooltip-wrapper")
    )
      return;

    // Create badge element and append it to the row (after the profile link and actions)
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
  try {
    // Wait for the friend list container to load
    const friendListContainer = await waitForElement(".profile-friend-list");

    // Find all profile links within the container
    const profileLinks = friendListContainer.querySelectorAll("a.profile-link");

    // Extract IDs from hrefs
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
  } catch (error) {
    console.error("Error extracting friend IDs:", error);
    return [];
  }
}

async function fetchFriendsRanks(
  steamIds: string[]
): Promise<Record<string, number | null>> {
  try {
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
  } catch (error) {
    console.error("Error fetching friend ranks:", error);
    return {};
  }
}

function observeFriendsPageNavigation(): void {
  document.addEventListener("clutchFriendsExtracted", (event: Event) => {
    const { friendIds, showRanks, ranks } = (event as CustomEvent).detail;

    // Remove existing badges first
    removeRankBadges();

    // Then add them only if showRanks is true
    if (showRanks && ranks) {
      renderFriendRanks(friendIds, ranks);
    }
  });

  const checkAndExtractFriends = async () => {
    const currentUrl = window.location.pathname;

    if (isProcessing || currentUrl === lastProcessedUrl) {
      return;
    }

    if (isProfilePage() && isFriendsPage()) {
      isProcessing = true;
      lastProcessedUrl = currentUrl;

      const friendIds = await extractFriendIds();

      let ranks = {};
      if (showRanks && friendIds.length > 0) {
        try {
          ranks = await fetchFriendsRanks(friendIds);
        } catch (error) {
          console.error("Error fetching friend ranks:", error);
        }
      }

      const event = new CustomEvent("clutchFriendsExtracted", {
        detail: {
          friendIds,
          showRanks,
          ranks,
        },
      });
      document.dispatchEvent(event);

      isProcessing = false;
    }
  };

  const debouncedCheckAndExtract = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(
      checkAndExtractFriends,
      300
    ) as unknown as number;
  };

  window.addEventListener("popstate", () => {
    lastProcessedUrl = "";
    debouncedCheckAndExtract();
  });

  if ("navigation" in window && window.navigation) {
    (window.navigation as any).addEventListener("navigatesuccess", () => {
      lastProcessedUrl = "";
      debouncedCheckAndExtract();
    });
  }

  createSafeObserver(
    (mutations) => {
      if (isProcessing) return;

      let shouldCheck = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              (node as Element).classList &&
              ((node as Element).classList.contains("profile-friend-list") ||
                (node as Element).querySelector(".profile-friend-list"))
            ) {
              shouldCheck = true;
              break;
            }
          }
          if (shouldCheck) break;
        }
      }

      if (shouldCheck && isFriendsPage()) {
        debouncedCheckAndExtract();
      }
    },
    () => document.body,
    { childList: true, subtree: true },
    checkAndExtractFriends
  );
}

export function updateSettings(settings: UserSettings): void {
  const previousShowRanks = showRanks;
  showRanks = settings.showFriendListRanks;
  sortFriendsByRenownElo = settings.sortFriendsByRenownElo;

  // If we're already on a friends page, extract friends again with new settings
  if (isProfilePage() && isFriendsPage()) {
    // If we turned off rank display, remove existing badges
    if (previousShowRanks && !showRanks) {
      removeRankBadges();
    }

    // Reset the lastProcessedUrl to force a refresh with new settings
    lastProcessedUrl = "";

    extractFriendIds().then(async (friendIds) => {
      // Only fetch ranks if we should show them
      let ranks = {};
      if (showRanks && friendIds.length > 0) {
        try {
          ranks = await fetchFriendsRanks(friendIds);
        } catch (error) {
          console.error("Error fetching friend ranks:", error);
        }
      }

      const event = new CustomEvent("clutchFriendsExtracted", {
        detail: {
          friendIds,
          showRanks,
          ranks,
        },
      });
      document.dispatchEvent(event);
    });
  }
}

export function initialize(settings?: UserSettings): void {
  if (!settings || !isProfilePage()) {
    return;
  }

  if (settings) {
    showRanks = settings.showFriendListRanks;
    sortFriendsByRenownElo = settings.sortFriendsByRenownElo;
  }

  observeFriendsPageNavigation();
}
