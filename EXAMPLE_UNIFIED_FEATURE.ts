// ========================================
// Example 1: Profile Friends List Feature
// ========================================
// features/profile/friendsList/index.ts
import {
  registerFeature,
  ActivationHelpers,
} from "../../../system/lib/featureRegistry";
import { getCurrentPage } from "../../../utils/page/pageUtils";
import "./styles.css";

// Feature logic for profile friends list
async function initializeFriendsList(settings: UserSettings): Promise<void> {
  if (!settings.showFriendListRanks) {
    return; // Feature is disabled
  }

  // Profile page friends list implementation
  console.log("Profile friends list feature activated!");

  const profileFriendsList = document.querySelector(".profile-friends-list");
  if (profileFriendsList) {
    // Add ranks to profile friends list
  }
}

// Self-contained profile feature registration
registerFeature({
  settingKey: "showFriendListRanks",
  category: "profile", // Profile page specific
  defaultValue: true,
  description: "Show ranks in profile friends list",

  // Only activate on profile pages when enabled
  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["profile"]),
    ActivationHelpers.whenEnabled("showFriendListRanks")
  ),

  handler: initializeFriendsList,
  apiCalls: [
    { requestType: "get_friend_ranks", responseType: "friend_ranks_data" },
  ],
});

// ========================================
// Example 2: Sidebar Friends Feature
// ========================================
// features/sidebar/sidebarFriends/index.ts
import {
  registerFeature,
  ActivationHelpers,
} from "../../../system/lib/featureRegistry";
import "./styles.css";

// Feature logic for sidebar friends
async function initializeSidebarFriends(settings: UserSettings): Promise<void> {
  if (!settings.showSidebarFriendRanks) {
    return; // Feature is disabled
  }

  // Sidebar friends implementation - works across all pages
  console.log("Sidebar friends feature activated!");

  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    // Add ranks to sidebar friends
  }
}

// Self-contained sidebar feature registration
registerFeature({
  settingKey: "showSidebarFriendRanks",
  category: "sidebar", // Sidebar category - active across pages
  defaultValue: true,
  description: "Show friend ranks in sidebar",

  // Active on all pages when enabled (sidebar is global)
  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.always, // Always available across pages
    ActivationHelpers.whenEnabled("showSidebarFriendRanks")
  ),

  handler: initializeSidebarFriends,
  apiCalls: [
    { requestType: "get_friend_ranks", responseType: "friend_ranks_data" },
  ],
});

// ========================================
// Key Differences:
// ========================================

// PROFILE FEATURES:
// - Only active on profile pages
// - Use ActivationHelpers.onPageTypes(["profile"])
// - Category: "profile"

// SIDEBAR FEATURES:
// - Active across all pages (global UI element)
// - Use ActivationHelpers.always
// - Category: "sidebar"

// COMPARISON: Old way required touching 8+ files
// NEW: Only this one file needed per feature!
