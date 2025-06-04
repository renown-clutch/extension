// ========================================
// Example 1: Profile-specific feature
// ========================================
// features/profile/playerStats/index.ts
registerFeature({
  settingKey: "showPlayerStats",
  category: "profile",
  defaultValue: true,
  description: "Show detailed player statistics",

  // Only activate on profile pages when enabled
  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["profile"]),
    ActivationHelpers.whenEnabled("showPlayerStats")
  ),

  handler: initializePlayerStats,
  apiCalls: [{ requestType: "get_player_stats", responseType: "player_stats" }],
});

// ========================================
// Example 2: Sidebar feature (cross-page)
// ========================================
// features/sidebar/sidebarFriends/index.ts
registerFeature({
  settingKey: "showSidebarFriendRanks",
  category: "sidebar",
  defaultValue: true,
  description: "Show friend ranks in sidebar",

  // Always active when enabled (sidebar appears on all pages)
  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.always,
    ActivationHelpers.whenEnabled("showSidebarFriendRanks")
  ),

  handler: initializeSidebarFriends,
  apiCalls: [
    { requestType: "get_friend_ranks", responseType: "friend_ranks_data" },
  ],
});

// ========================================
// Example 3: Multi-page feature
// ========================================
// features/match/faceitRanks/index.ts
registerFeature({
  settingKey: "showFaceitRanks",
  category: "match",
  defaultValue: true,
  description: "Show Faceit ranks on match and live match pages",

  // Activate on both match pages and live match pages
  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["matchPage", "playMatch"]),
    ActivationHelpers.whenEnabled("showFaceitRanks")
  ),

  handler: initializeFaceitRanks,
  apiCalls: [{ requestType: "get_faceit_ranks", responseType: "faceit_data" }],
});

// ========================================
// Example 4: Global feature (always active)
// ========================================
// features/global/keepAlive/index.ts
registerFeature({
  settingKey: "keepAlive",
  category: "general",
  defaultValue: true,
  description: "Keep extension connection alive",

  // Always active when enabled
  shouldActivate: ActivationHelpers.whenEnabled("keepAlive"),

  handler: initializeKeepAlive,
  // No API calls needed for this feature
});

// ========================================
// Example 5: Complex conditional feature
// ========================================
// features/automation/autoAccept/index.ts
registerFeature({
  settingKey: "autoAccept",
  category: "autoAccept",
  defaultValue: { match: false, party: false },
  description: "Auto accept matches and party invites",

  // Custom activation logic
  shouldActivate: (currentPage, settings) => {
    // Only activate if at least one auto-accept option is enabled
    const autoAcceptSettings = settings.autoAccept;
    return autoAcceptSettings.match || autoAcceptSettings.party;
  },

  handler: initializeAutoAccept,
});

// ========================================
// Example 6: Feature with multiple conditions
// ========================================
// features/mainPage/partyElo/index.ts
registerFeature({
  settingKey: "showAveragePartyElo",
  category: "mainPage",
  defaultValue: true,
  description: "Show average party ELO on main page",

  // Multiple conditions: right page + enabled + not in debug mode
  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["play"]),
    ActivationHelpers.whenEnabled("showAveragePartyElo"),
    (currentPage, settings) => !settings.debugMode // Custom condition
  ),

  handler: initializePartyElo,
  apiCalls: [{ requestType: "get_party_elo", responseType: "party_elo_data" }],
});

// ========================================
// Example 7: Feature that activates on URL patterns
// ========================================
// features/profile/matchHistory/index.ts
registerFeature({
  settingKey: "enhancedMatchHistory",
  category: "profile",
  defaultValue: true,
  description: "Enhanced match history view",

  // Custom activation: only on profile match pages
  shouldActivate: (currentPage, settings) => {
    if (!settings.enhancedMatchHistory) return false;

    // Check if we're on a profile page with matches URL
    if (currentPage.type === "profile") {
      const url = window.location.href;
      return url.includes("/matches") || url.includes("/match/");
    }
    return false;
  },

  handler: initializeMatchHistory,
  apiCalls: [
    { requestType: "get_match_details", responseType: "match_details" },
    { requestType: "get_player_performance", responseType: "performance_data" },
  ],
});

// ========================================
// Feature Categories & Activation Patterns:
// ========================================

// PROFILE FEATURES:
// - category: "profile"
// - shouldActivate: ActivationHelpers.onPageTypes(["profile"])
// - Examples: playerStats, matchHistory, friendsList

// SIDEBAR FEATURES:
// - category: "sidebar"
// - shouldActivate: ActivationHelpers.always (cross-page)
// - Examples: sidebarFriends, sidebarStats

// MATCH FEATURES:
// - category: "match"
// - shouldActivate: ActivationHelpers.onPageTypes(["matchPage", "playMatch"])
// - Examples: faceitRanks, teamAverageElo

// GLOBAL FEATURES:
// - category: "general" or "global"
// - shouldActivate: ActivationHelpers.always or custom logic
// - Examples: keepAlive, navbar, autoAccept

// ========================================
// Benefits of this system:
// ========================================

// 1. SELF-CONTAINED: Each feature is completely independent
// 2. DECLARATIVE: Clear conditions for when features activate
// 3. FLEXIBLE: Support any activation logic you can imagine
// 4. SCALABLE: Adding features doesn't require touching other files
// 5. MAINTAINABLE: Easy to find and modify specific features
// 6. TESTABLE: Each feature can be tested independently
// 7. AUTOMATIC: No manual registration in multiple files

// ========================================
// Migration path:
// ========================================

// OLD WAY (touching 8+ files):
// 1. Add to types.ts
// 2. Add to SETTING_DEFINITIONS
// 3. Add to content.ts page logic
// 4. Add to background.ts handlers
// 5. Add to SocketIOManager events
// 6. Add to StorageService response mapping
// 7. Add to autoRegister imports
// 8. Create feature file

// NEW WAY (1 file):
// 1. Create feature directory with index.ts and styles.css
// 2. Import in autoRegister.ts (or auto-discover later)
// 3. Done!
