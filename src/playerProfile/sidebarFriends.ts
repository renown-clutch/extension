import { type UserSettings } from "../lib/types";
import { createSafeObserver } from "../utils/observerUtils";
import {
  getRankTier,
  formatElo,
  createRankBadgeElement,
} from "../utils/rankBadgeUtils";

let showRanks = true; // Default to true
let isProcessing = false; // Flag to prevent multiple concurrent processes
let debounceTimer: number | null = null; // For debouncing
let isPerformingBadgeOperation = false; // Flag to prevent observer reactions to our own operations
let hasBadgesBeenAdded = false; // Track if badges have already been added

/**
 * Removes rank badges from friends in the sidebar
 */
function removeRankBadges(): void {
  isPerformingBadgeOperation = true;
  const tooltipWrappers = document.querySelectorAll(
    ".sidebar-content .friends .profile-link .tooltip-wrapper"
  );
  tooltipWrappers.forEach((wrapper) => {
    wrapper.remove();
  });
  hasBadgesBeenAdded = false;
  isPerformingBadgeOperation = false;
}

/**
 * Renders rank badges for friends in the sidebar
 */
function renderFriendRanks(
  friendIds: string[],
  ranks: Record<string, number | null>
): void {
  isPerformingBadgeOperation = true;
  // Find all friend rows inside the sidebar friends div
  const friendRows = document.querySelectorAll(
    ".sidebar-content .friends .friend-row"
  );

  let badgesAdded = false;

  friendRows.forEach((row) => {
    // Get profile link and extract steam ID
    const profileLink = row.querySelector(".profile-link");
    if (!profileLink) return;

    // Skip if already added a badge to this profile link
    if (profileLink.querySelector(".tooltip-wrapper")) return;

    const href = profileLink.getAttribute("href");
    if (!href) return;

    const match = href.match(/\/profile\/(\d+)/);
    if (!match || !match[1]) return;

    const steamId = match[1];
    const elo = ranks[steamId];

    // Skip if we don't have rank info or elo is null
    if (elo === undefined || elo === null) return;

    // Skip if rank tier is empty
    const rankTier = getRankTier(elo);
    if (!rankTier) return;

    // Create badge element and append to profile-link as last element
    const badgeElement = createRankBadgeElement(rankTier, elo, 20, true);
    profileLink.appendChild(badgeElement);
    badgesAdded = true;
  });

  if (badgesAdded) {
    hasBadgesBeenAdded = true;
  }
  isPerformingBadgeOperation = false;
}

/**
 * Extracts all friend IDs from the sidebar friends list
 */
async function extractFriendIds(): Promise<string[]> {
  try {
    const friendsContainer = document.querySelector(
      ".sidebar-content .friends"
    );
    if (!friendsContainer) return [];

    // Find all profile links within the container
    const profileLinks = friendsContainer.querySelectorAll(".profile-link");

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
    console.error("Error extracting sidebar friend IDs:", error);
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
 * Processes the sidebar friends list to add rank badges
 */
async function processSidebarFriends(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Check if the sidebar friends section exists
    const sidebarFriends = document.querySelector(".sidebar-content .friends");
    if (!sidebarFriends) {
      isProcessing = false;
      return;
    }

    // If badges are not supposed to be shown, remove them if needed
    if (!showRanks) {
      if (
        document.querySelector(
          ".sidebar-content .friends .profile-link .tooltip-wrapper"
        )
      ) {
        removeRankBadges();
      }
      isProcessing = false;
      return;
    }

    // If badges should be shown but are already added, skip processing
    if (
      hasBadgesBeenAdded &&
      document.querySelector(
        ".sidebar-content .friends .profile-link .tooltip-wrapper"
      )
    ) {
      isProcessing = false;
      return;
    }

    // Extract friend IDs from the sidebar
    const friendIds = await extractFriendIds();

    // Only fetch ranks if there are friends and we haven't added badges yet
    if (friendIds.length > 0) {
      try {
        const ranks = await fetchFriendsRanks(friendIds);
        renderFriendRanks(friendIds, ranks);
      } catch (error) {
        console.error("Error fetching sidebar friend ranks:", error);
      }
    }
  } catch (error) {
    console.error("Error processing sidebar friends:", error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Creates an observer to watch for changes to the sidebar friends list
 */
function observeSidebarFriends(): void {
  // Debounced version of the processing function
  const debouncedProcessSidebarFriends = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(processSidebarFriends, 300) as unknown as number;
  };

  // Set up MutationObserver using the utility function
  createSafeObserver(
    (mutations) => {
      if (isProcessing || isPerformingBadgeOperation) return; // Skip if already processing or performing badge operations

      let shouldProcess = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // Only process if new friend rows were added (not just sidebar being opened/closed)
          const addedFriendContent = Array.from(mutation.addedNodes).some(
            (node) => {
              if (node instanceof Element) {
                return (
                  node.classList?.contains("friend-row") ||
                  (node.querySelector &&
                    node.querySelector(
                      ".friend-row:not(:has(.tooltip-wrapper))"
                    ))
                );
              }
              return false;
            }
          );

          if (addedFriendContent) {
            shouldProcess = true;
            break;
          }
        }
      }

      if (shouldProcess) {
        debouncedProcessSidebarFriends();
      }
    },
    () => document.querySelector(".sidebar-content") || document.body,
    { childList: true, subtree: true },
    // Initial check after successful setup
    processSidebarFriends
  );

  // Don't process when sidebar is toggled, as it just affects visibility
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("toggle") || target.closest(".toggle")) {
      // Don't reprocess badges when just toggling sidebar visibility
      // If we haven't added badges yet (e.g., first time sidebar is opened), allow processing
      if (!hasBadgesBeenAdded && showRanks) {
        setTimeout(debouncedProcessSidebarFriends, 300);
      }
    }
  });
}

/**
 * Updates the module settings
 */
export function updateSettings(settings: UserSettings): void {
  const previousShowRanks = showRanks;
  showRanks = settings.showSidebarFriendRanks;

  // If the setting changed, take appropriate action
  if (previousShowRanks !== showRanks) {
    // If ranks are turned off, remove existing badges
    if (!showRanks) {
      removeRankBadges();
    } else {
      // If ranks are turned on, process friends to add badges
      hasBadgesBeenAdded = false; // Reset flag so badges will be added
      processSidebarFriends();
    }
  }
}

/**
 * Injects CSS to hide rank badges when sidebar is collapsed
 */
function injectCollapseCSS(): void {
  const styleId = "clutch-sidebar-rank-style";

  // Check if the style is already injected
  if (document.getElementById(styleId)) return;

  // Create style element
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

  // Append to head
  document.head.appendChild(style);
}

/**
 * Initializes the sidebar friends feature
 */
export function initialize(settings?: UserSettings): void {
  // Update settings if provided
  if (settings) {
    showRanks = settings.showSidebarFriendRanks;
  }

  hasBadgesBeenAdded = false;

  // Inject CSS for collapsed sidebar
  injectCollapseCSS();

  observeSidebarFriends();
}
