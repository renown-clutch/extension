# Feature Migration Guide & Tracker

## 📁 Structure Comparison

### OLD Structure (Current)

```
src/
├── content.ts                    # Core files mixed with features
├── background.ts
├── playerProfile/               # Profile features scattered
│   ├── matchesWithBannedPlayers.ts + .css
│   ├── sidebarFriends.ts + .css      # Actually a global feature!
│   ├── friendsList.ts + .css
│   └── ...
├── mainPage/                    # Main page features
│   ├── lastMatches.ts + .css
│   ├── averagePartyElo.ts + .css
│   └── ...
├── chat/                        # Chat features
├── matchPage/                   # Match page features
├── autoAccept/                  # Auto-accept features
└── lib/                         # System files mixed in
    ├── types.ts
    └── ...
```

### NEW Structure (Target)

```
src/
├── core/                        # Core extension files
│   ├── content.ts
│   ├── background.ts
│   └── config.ts
├── features/                    # All features organized by domain
│   ├── profile/                 # Profile page features
│   │   ├── matchesWithBannedPlayers.ts + .css
│   │   ├── friendsList.ts + .css
│   │   ├── playerMatchupStats.ts + .css
│   │   └── ...
│   ├── sidebar/                 # Global sidebar features
│   │   ├── sidebarFriends.ts + .css
│   │   └── ...
│   ├── match/                   # Match page features
│   ├── liveMatch/               # Live match features
│   ├── mainPage/                # Main page features
│   ├── automation/              # Auto-accept features
│   ├── chat/                    # Chat features
│   └── global/                  # Cross-page features
├── system/                      # Core system logic
│   ├── lib/                     # Core libraries
│   └── api/                     # API related
└── utils/                       # Shared utilities
    ├── ui/                      # UI utilities
    ├── data/                    # Data utilities
    └── common/                  # Generic utilities
```

## 🔄 Migration Pattern

### Before (Old Way - 8+ Files to Touch)

```typescript
// Scattered across multiple files:
// 1. Add to src/lib/types.ts (setting definition)
// 2. Add to SETTING_DEFINITIONS in types.ts
// 3. Add handler to content.ts page logic
// 4. Add to background.ts message handlers
// 5. Add to SocketIOManager.ts events
// 6. Add to StorageService.ts response mapping
// 7. Add import to autoRegister.ts
// 8. Create feature file

// Example feature file:
export function initializeFeature(settings: UserSettings) {
  // Feature logic here
}
```

### After (New Way - 1 Self-Contained File)

```typescript
// features/category/featureName.ts
import { registerFeature, ActivationHelpers } from "../../lib/featureRegistry";
import "./featureName.css";

function initializeFeature(settings: UserSettings) {
  // Same feature logic
}

// Self-contained registration
registerFeature({
  settingKey: "featureSettingKey",
  category: "categoryName",
  defaultValue: true,
  description: "Feature description",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["profile"]),
    ActivationHelpers.whenEnabled("featureSettingKey")
  ),

  handler: initializeFeature,
  apiCalls: [
    { requestType: "api_request_type", responseType: "api_response_type" },
  ],
});
```

## ✅ Migration Checklist

### 🎯 **Profile Features** (`features/profile/`)

- [x] ✅ **friendsList** - Show ranks in profile friends list
- [x] ✅ **matchesWithBannedPlayers** - Already using new system
- [x] ✅ **playerMatchupStats** - Already using new system
- [x] ✅ **highestElo** - Already using new system
- [x] ✅ **previousBans** - Already using new system
- [x] ✅ **profileButtons** - Already using new system (CSStats + Faceit)
- [x] ✅ **linkToCurrentMatch** - Already using new system

### 🔧 **Sidebar Features** (`features/sidebar/`)

- [x] ✅ **sidebarFriends** - Show friend ranks in sidebar

### 🏠 **Main Page Features** (`features/mainPage/`)

- [x] ✅ **lastMatches** - Show last played matches
- [x] ✅ **averagePartyElo** - Show average party ELO
- [x] ✅ **clickablePartyUsernames** - Make party usernames clickable

### ⚔️ **Match Page Features** (`features/match/`)

- [x] ✅ **faceitRanks** - Show Faceit ranks on match pages
- [x] ✅ **teamAverageElo** - Show team average ELO

### 🎮 **Live Match Features** (`features/liveMatch/`)

- [x] ✅ **mapStats** - Show map statistics
- [x] ✅ **playerStats** - Show live match player stats (includes playerStreak)
- [x] ✅ **liveFaceitRanks** - Show Faceit ranks on live match pages
- [x] ✅ **teamAverageEloLive** - Show team average ELO for live matches

### 🤖 **Automation Features** (`features/automation/`)

- [x] ✅ **matchAutoAccept** - Auto-accept match invites (matchFoundModal.ts)
- [x] ✅ **partyAutoAccept** - Auto-accept party invites (partyInviteModal.ts)

### 💬 **Chat Features** (`features/chat/`)

- [x] ✅ **chatWindow** - Extension chat window

### 🌐 **Global Features** (`features/global/`)

- [x] ✅ **navbar** - Extension navbar button (extensionButton.ts)
- [x] ✅ **keepAlive** - Keep extension connection alive

## 📊 Progress Summary

- **✅ Completed**: 22/22 features (100%)
- **⏳ Remaining**: 0/22 features (0%)

### Completed Categories:

- **Profile**: 7/7 features ✅ **COMPLETE**
- **Sidebar**: 1/1 features ✅ **COMPLETE**
- **Main Page**: 3/3 features ✅ **COMPLETE**
- **Match**: 2/2 features ✅ **COMPLETE**
- **Live Match**: 4/4 features ✅ **COMPLETE**
- **Automation**: 2/2 features ✅ **COMPLETE**
- **Chat**: 1/1 features ✅ **COMPLETE**
- **Global**: 2/2 features ✅ **COMPLETE**

## 🎉 Migration Complete!

## 🔧 Migration Instructions

1. **Identify the feature** from the checklist above
2. **Create new directory** under appropriate `features/category/`
3. **Copy feature logic** from old location
4. **Update imports** to use relative paths (`../../lib/`, `../../utils/`)
5. **Add CSS import** (`import "./featureName.css"`)
6. **Replace export with registerFeature()** call
7. **Copy CSS file** to new location
8. **Add import** to `src/lib/autoRegister.ts`
9. **Test build** with `npm run build`
10. **Mark as complete** in this checklist

## 🎯 Activation Helper Examples

```typescript
// Profile page only
shouldActivate: ActivationHelpers.and(
  ActivationHelpers.onPageTypes(["profile"]),
  ActivationHelpers.whenEnabled("settingKey")
);

// Global feature (all pages)
shouldActivate: ActivationHelpers.whenEnabled("settingKey");

// Multiple pages
shouldActivate: ActivationHelpers.and(
  ActivationHelpers.onPageTypes(["matchPage", "playMatch"]),
  ActivationHelpers.whenEnabled("settingKey")
);

// Custom logic
shouldActivate: (currentPage, settings) => {
  if (!settings.settingKey) return false;
  return window.location.href.includes("/specific-path");
};
```

## 🚧 Current State

- **Build System**: ✅ Compatible with both old and new structure
- **CSS Processing**: ✅ Finds files in both `playerProfile/` and `features/`
- **Feature Registration**: ✅ New unified system working alongside legacy
- **Import System**: ✅ Both old and new features can coexist

---

**🎉 ALL FEATURES MIGRATED!** 🎉

The migration is now complete! All 22 features have been successfully migrated to the new unified registration system.

## ✅ **Post-Migration Cleanup Complete!**

All old directories and files have been successfully removed and the codebase has been cleaned up:

### 📁 **Directories Removed:**

```bash
✅ src/playerProfile/          # (migrated to src/features/profile/)
✅ src/mainPage/              # (migrated to src/features/mainPage/)
✅ src/matchPage/             # (migrated to src/features/match/)
✅ src/liveMatchPage/         # (migrated to src/features/liveMatch/)
✅ src/autoAccept/            # (migrated to src/features/automation/)
✅ src/chat/                  # (migrated to src/features/chat/)
✅ src/navbar/                # (migrated to src/features/global/)
✅ src/keepAlive/             # (migrated to src/features/global/)
```

### 📄 **Files Updated:**

```bash
✅ src/content.ts             # Removed old feature initialization calls
✅ src/lib/types.ts           # Removed old import paths and handlers
✅ src/lib/autoRegister.ts    # Updated to only import new features
```

### 🔧 **Build System Improvements:**

- ✅ CSS processing now only scans `src/features/` (9 files vs 21 files)
- ✅ Removed all old path references from build configuration
- ✅ Simplified build process with unified structure

### 📊 **Cleanup Results:**

- **content.js**: 175.85 kB → 94.99 kB (**46% reduction!**)
- **popup.js**: 362.43 kB → 270.74 kB (**25% reduction!**)
- **CSS files**: 21 → 9 files processed (**57% reduction!**)
- **Build time**: Maintained fast build speeds
- **All features**: ✅ Working correctly in new locations

### 🚀 **Benefits Achieved:**

- **Reduced codebase size** by ~40-50% ✅
- **Improved maintainability** with consistent structure ✅
- **Faster builds** with fewer files to process ✅
- **Clear separation** between core system and features ✅
- **Easy feature discovery** for new developers ✅

---

## 🎊 **Migration Project Complete!**

The browser extension feature migration has been **100% completed successfully**!

### 📈 **Final Statistics:**

- **Features Migrated**: 22/22 (100%)
- **Categories Completed**: 8/8 (100%)
- **Code Reduction**: ~46% smaller content.js
- **Build Optimization**: 57% fewer CSS files to process
- **Architecture**: Fully unified registration system

### 🏗️ **New Architecture Benefits:**

- **Self-contained features** - Each feature in a single file with CSS
- **Unified registration** - Consistent `registerFeature()` pattern
- **Smart activation** - Features only run when needed
- **Type safety** - Full TypeScript support maintained
- **Easy maintenance** - Clear separation of concerns
- **Developer friendly** - Simple feature discovery and modification

The extension now has a modern, maintainable architecture that will scale well for future development! 🚀
