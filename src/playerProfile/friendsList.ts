import { isProfilePage, waitForElement } from "../utils/profileUtils";
import { defaultUserSettings, type UserSettings } from "../lib/types";

const FRIENDS_PAGE_REGEX = /\/profile\/(\d+)\/friends/;
let showRanks = true; // Default to true
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
 * Determines rank tier based on elo
 */
function getRankTier(elo: number | null): string {
  if (elo === null) return "";
  if (elo >= 25000) return "renowned";
  if (elo >= 21500) return "master";
  if (elo >= 19000) return "diamond";
  if (elo >= 16000) return "platinum";
  if (elo >= 13000) return "gold";
  if (elo >= 11500) return "silver";
  if (elo >= 9000) return "bronze";
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
      profileLink.querySelector(".tooltip-wrapper")
    )
      return;

    // Find info div to insert after
    const infoDiv = profileLink.querySelector(".info");
    if (!infoDiv) return;

    // Create rank badge element
    const rankTier = getRankTier(elo);
    const formattedElo = formatElo(elo);

    // Skip if rank tier or formatted elo is empty
    if (!rankTier || !formattedElo) return;

    const badgeHtml = `
      <div class="tooltip-wrapper" tabindex="0">
        <div class="rank-badge ${rankTier}" style="--size:30px" aria-label="Rank: ${
      rankTier.charAt(0).toUpperCase() + rankTier.slice(1)
    }, Elo: ${formattedElo}">
          <img alt="Renown rank ${rankTier}" loading="lazy" width="30" height="30" decoding="async" data-nimg="1" style="color:transparent" src="https://cdn.renown.gg/images/ranks/${rankTier}.svg">
          <span>${formattedElo}</span>
        </div>
      </div>
    `;

    // Create badge element and insert after info div
    const badgeElement = document.createElement("div");
    badgeElement.innerHTML = badgeHtml.trim();
    profileLink.insertBefore(
      badgeElement.firstElementChild!,
      infoDiv.nextSibling
    );
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
    console.log(`Found ${friendIds.length} friends on the page`);
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

      console.log("Detected friends page, extracting friend IDs");
      const friendIds = await extractFriendIds();

      // Only fetch ranks if we should show them
      let ranks = {};
      if (showRanks && friendIds.length > 0) {
        try {
          ranks = await fetchFriendsRanks(friendIds);
          console.log("Retrieved ranks for friends:", ranks);
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

  // Set up MutationObserver to watch for DOM changes that might indicate navigation
  const observer = new MutationObserver((mutations) => {
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
  });

  // Start observing once the body is available
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Initial check in case we're already on a friends page
  checkAndExtractFriends();
}

/**
 * Updates the module settings
 */
export function updateSettings(settings: UserSettings): void {
  const previousShowRanks = showRanks;
  showRanks = settings.showFriendListRanks;
  console.log("Friends list settings updated, showRanks:", showRanks);

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
  console.log("Initializing friends list module");

  // Update settings if provided
  if (settings) {
    showRanks = settings.showFriendListRanks;
  }

  observeFriendsPageNavigation();
}
