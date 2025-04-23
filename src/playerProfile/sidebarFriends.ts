import { type UserSettings } from "../lib/types";
import { createSafeObserver } from "../utils/observerUtils";

let showRanks = true; // Default to true
let isProcessing = false; // Flag to prevent multiple concurrent processes
let debounceTimer: number | null = null; // For debouncing

/**
 * Determines rank tier based on elo
 */
function getRankTier(elo: number | null): string {
  if (elo === null) return "";
  if (elo >= 25000) return "renowned";
  if (elo >= 22000) return "master";
  if (elo >= 19000) return "diamond";
  if (elo >= 16000) return "platinum";
  if (elo >= 13000) return "gold";
  if (elo >= 10000) return "silver";
  if (elo >= 100) return "bronze";
  return "";
}

/**
 * Formats elo number with comma as thousands separator
 */
function formatElo(elo: number | null): string {
  if (elo === null) return "";
  return elo.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Removes rank badges from friends in the sidebar
 */
function removeRankBadges(): void {
  const tooltipWrappers = document.querySelectorAll(
    ".sidebar-content .friends .profile-link .tooltip-wrapper"
  );
  tooltipWrappers.forEach((wrapper) => {
    wrapper.remove();
  });
}

/**
 * Renders rank badges for friends in the sidebar
 */
function renderFriendRanks(
  friendIds: string[],
  ranks: Record<string, number | null>
): void {
  // Find all friend rows inside the sidebar friends div
  const friendRows = document.querySelectorAll(
    ".sidebar-content .friends .friend-row"
  );

  friendRows.forEach((row) => {
    // Get profile link and extract steam ID
    const profileLink = row.querySelector(".profile-link");
    if (!profileLink) return;

    const href = profileLink.getAttribute("href");
    if (!href) return;

    const match = href.match(/\/profile\/(\d+)/);
    if (!match || !match[1]) return;

    const steamId = match[1];
    const elo = ranks[steamId];

    // Skip if we don't have rank info or elo is null
    if (elo === undefined || elo === null) return;

    // Skip if already added a badge
    if (profileLink.querySelector(".tooltip-wrapper")) return;

    // Skip if rank tier or formatted elo is empty
    const rankTier = getRankTier(elo);
    const formattedElo = formatElo(elo);

    if (!rankTier || !formattedElo) return;

    // Create rank badge element
    const badgeHtml = `
      <div class="tooltip-wrapper" tabindex="0">
        <div class="rank-badge ${rankTier}" style="--size:20px; display: flex; align-items: center;" aria-label="Rank: ${
      rankTier.charAt(0).toUpperCase() + rankTier.slice(1)
    }, Elo: ${formattedElo}">
          <img alt="Renown rank ${rankTier}" loading="lazy" width="20" height="20" decoding="async" data-nimg="1" style="color:transparent" src="https://cdn.renown.gg/images/ranks/${rankTier}.svg">
          <span style="margin-left: 4px;">${formattedElo}</span>
        </div>
      </div>
    `;

    // Create badge element and append to profile-link as last element
    const badgeElement = document.createElement("div");
    badgeElement.innerHTML = badgeHtml.trim();
    profileLink.appendChild(badgeElement.firstElementChild!);
  });
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

    // Extract friend IDs from the sidebar
    const friendIds = await extractFriendIds();

    // Only fetch ranks if we should show them and there are friends
    let ranks = {};
    if (showRanks && friendIds.length > 0) {
      try {
        ranks = await fetchFriendsRanks(friendIds);
      } catch (error) {
        console.error("Error fetching sidebar friend ranks:", error);
      }
    }

    // Remove existing badges first
    removeRankBadges();

    // Add them again if showRanks is true
    if (showRanks) {
      renderFriendRanks(friendIds, ranks);
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
      if (isProcessing) return; // Skip if already processing

      let shouldProcess = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // Check for sidebar friends section or changes to it
          shouldProcess = true;
          break;
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

  // Also check when the sidebar is toggled
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("toggle") || target.closest(".toggle")) {
      // Wait a bit for the sidebar to fully expand/collapse
      setTimeout(debouncedProcessSidebarFriends, 300);
    }
  });
}

/**
 * Updates the module settings
 */
export function updateSettings(settings: UserSettings): void {
  showRanks = settings.showSidebarFriendRanks;

  // If we're already on a page with the sidebar, process friends again with new settings
  const sidebarFriends = document.querySelector(".sidebar-content .friends");
  if (sidebarFriends) {
    if (!showRanks) {
      // If ranks are turned off, just remove existing badges
      removeRankBadges();
    } else {
      // Otherwise reprocess with new settings
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

  // Inject CSS for collapsed sidebar
  injectCollapseCSS();

  observeSidebarFriends();
}
