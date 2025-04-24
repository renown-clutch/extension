import { isProfilePage, waitForElement } from "../utils/profileUtils";
import { type UserSettings } from "../lib/types";
import { createSafeObserver } from "../utils/observerUtils";
import {
  getRankTier,
  formatElo,
  createRankBadgeElement,
} from "../utils/rankBadgeUtils";

const FRIENDS_PAGE_REGEX = /\/profile\/(\d+)\/friends/;
let showRanks = true; // Default to true
let sortFriendsByRenownElo = false; // Default to false
let isProcessing = false; // Flag to prevent multiple concurrent processes
let lastProcessedUrl = ""; // Track the last processed URL
let debounceTimer: number | null = null; // For debouncing

/**
 * Checks if the current page is a profile friends page
 */
function isFriendsPage(): boolean {
  return FRIENDS_PAGE_REGEX.test(window.location.pathname);
}

/**
 * Applies CSS styling to ensure friend names are truncated and badges are positioned consistently
 */
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

/**
 * Removes rank badges from friends in the list
 */
function removeRankBadges(): void {
  const tooltipWrappers = document.querySelectorAll(
    ".profile-friend-list .tooltip-wrapper"
  );
  tooltipWrappers.forEach((wrapper) => {
    wrapper.remove();
  });
}

/**
 * Renders rank badges for friends in the list
 */
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

    // Skip if rank tier is empty
    const rankTier = getRankTier(elo);
    if (!rankTier) return;

    // Create badge element and append it to the row (after the profile link and actions)
    const badgeElement = createRankBadgeElement(rankTier, elo, 25, true);
    const actionsDiv = row.querySelector(".actions");

    if (actionsDiv) {
      row.insertBefore(badgeElement, actionsDiv.nextSibling);
    } else {
      row.appendChild(badgeElement);
    }
  });
}

/**
 * Extracts all friend IDs from the friends list on the profile page
 */
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

/**
 * Fetches ranks for a list of steam IDs
 */
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

/**
 * Creates an observer to detect when we navigate to a friends page
 */
function observeFriendsPageNavigation(): void {
  // Listen for the clutchFriendsExtracted event to render ranks
  document.addEventListener("clutchFriendsExtracted", (event: Event) => {
    const { friendIds, showRanks, ranks } = (event as CustomEvent).detail;

    // Remove existing badges first
    removeRankBadges();

    // Then add them only if showRanks is true
    if (showRanks && ranks) {
      renderFriendRanks(friendIds, ranks);
    }
  });

  // Function to check URL and extract friends if we're on a friends page
  const checkAndExtractFriends = async () => {
    // Get current URL to avoid processing the same page multiple times
    const currentUrl = window.location.pathname;

    // If we're already processing or have processed this URL, skip
    if (isProcessing || currentUrl === lastProcessedUrl) {
      return;
    }

    if (isProfilePage() && isFriendsPage()) {
      isProcessing = true;
      lastProcessedUrl = currentUrl;

      const friendIds = await extractFriendIds();

      // Only fetch ranks if we should show them
      let ranks = {};
      if (showRanks && friendIds.length > 0) {
        try {
          ranks = await fetchFriendsRanks(friendIds);
        } catch (error) {
          console.error("Error fetching friend ranks:", error);
        }
      }

      // Dispatch custom event with the friend IDs and settings
      const event = new CustomEvent("clutchFriendsExtracted", {
        detail: {
          friendIds,
          showRanks,
          ranks,
        },
      });
      document.dispatchEvent(event);

      // Reset processing flag
      isProcessing = false;
    }
  };

  // Debounced version of the check function
  const debouncedCheckAndExtract = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(
      checkAndExtractFriends,
      300
    ) as unknown as number;
  };

  // Set up listeners for URL changes
  window.addEventListener("popstate", () => {
    // Reset lastProcessedUrl on navigation
    lastProcessedUrl = "";
    debouncedCheckAndExtract();
  });

  // Check on navigation changes
  if ("navigation" in window && window.navigation) {
    (window.navigation as any).addEventListener("navigatesuccess", () => {
      // Reset lastProcessedUrl on navigation
      lastProcessedUrl = "";
      debouncedCheckAndExtract();
    });
  }

  // Set up MutationObserver using the utility function
  createSafeObserver(
    (mutations) => {
      if (isProcessing) return; // Skip if we're already processing

      let shouldCheck = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // Check if any significant elements were added that might indicate page loaded
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
    // Initial check after successful setup
    checkAndExtractFriends
  );
}

/**
 * Updates the module settings
 */
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

/**
 * Initializes the friends list feature
 */
export function initialize(settings?: UserSettings): void {
  // Update settings if provided
  if (settings) {
    showRanks = settings.showFriendListRanks;
    sortFriendsByRenownElo = settings.sortFriendsByRenownElo;
  }

  observeFriendsPageNavigation();
}
