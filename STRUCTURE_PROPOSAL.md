# Proposed Clean Folder Structure

## Current Issues

- Features scattered at root level (mainPage/, chat/, matchPage/, etc.)
- Core system files mixed with features
- Utilities scattered across multiple directories
- No clear separation of concerns

## New Structure

```
src/
├── core/                          # Core extension files
│   ├── content.ts
│   ├── background.ts
│   ├── config.ts
│   └── manifest.json
│
├── features/                      # All features organized by functionality
│   ├── profile/                   # Profile page features
│   │   ├── matchesWithBannedPlayers.ts
│   │   ├── matchesWithBannedPlayers.css
│   │   ├── playerMatchupStats.ts
│   │   ├── playerMatchupStats.css
│   │   ├── highestElo.ts
│   │   ├── highestElo.css
│   │   ├── friendsList.ts          # Profile friends list
│   │   ├── friendsList.css
│   │   ├── previousBans.ts
│   │   ├── previousBans.css
│   │   └── ...
│   │
│   ├── sidebar/                   # Sidebar features (active across pages)
│   │   ├── sidebarFriends.ts      # Friends in sidebar
│   │   ├── sidebarFriends.css
│   │   └── ...
│   │
│   ├── match/                     # Match page features
│   │   ├── faceitRanks.ts
│   │   ├── faceitRanks.css
│   │   ├── teamAverageElo.ts
│   │   ├── teamAverageElo.css
│   │   └── ...
│   │
│   ├── liveMatch/                 # Live match features
│   │   ├── mapStats.ts
│   │   ├── mapStats.css
│   │   ├── playerStats.ts
│   │   ├── playerStats.css
│   │   └── ...
│   │
│   ├── mainPage/                  # Main page features
│   │   ├── lastMatches.ts
│   │   ├── lastMatches.css
│   │   ├── averagePartyElo.ts
│   │   ├── averagePartyElo.css
│   │   └── ...
│   │
│   ├── automation/                # Auto-accept and similar
│   │   ├── matchAutoAccept.ts
│   │   ├── matchAutoAccept.css
│   │   ├── partyAutoAccept.ts
│   │   ├── partyAutoAccept.css
│   │   └── ...
│   │
│   ├── chat/                      # Chat features
│   │   ├── chatWindow.ts
│   │   ├── chatWindow.css
│   │   └── ...
│   │
│   └── global/                    # Features that work across pages
│       ├── navbar.ts
│       ├── navbar.css
│       ├── keepAlive.ts
│       └── ...
│
├── system/                        # Core system logic
│   ├── lib/                       # Core libraries
│   │   ├── featureRegistry.ts
│   │   ├── autoRegister.ts
│   │   ├── types.ts
│   │   ├── browserAPI.ts
│   │   └── ...
│   │
│   ├── api/                       # API related
│   │   ├── socketio/
│   │   ├── storage/
│   │   └── ...
│   │
│   └── popup/                     # Extension popup
│       └── ...
│
├── utils/                         # Shared utilities
│   ├── page/                      # Page detection & navigation
│   │   ├── pageUtils.ts
│   │   └── ...
│   │
│   ├── ui/                        # UI utilities
│   │   ├── profileUtils.ts
│   │   ├── rankBadgeUtils.ts
│   │   ├── hydrationUtils.ts
│   │   └── ...
│   │
│   ├── data/                      # Data utilities
│   │   ├── steamId/
│   │   ├── faceit/
│   │   └── ...
│   │
│   └── common/                    # Generic utilities
│       ├── observerUtils.ts
│       ├── staticUtils.ts
│       └── uiStateUtils.ts
│
└── themes/                        # Theme system
    ├── manager/
    ├── injection/
    └── styles/
```

## Benefits

1. **Clear Separation**: Features, system code, utilities, and themes are clearly separated
2. **Feature Organization**: All features are under `features/` organized by their domain
3. **IDE-Friendly**: Each feature has descriptive filenames - no confusing `index.ts` files
4. **Easy Navigation**: Developers can quickly find related code by name
5. **Scalable**: Easy to add new features without cluttering the structure
6. **Self-Contained**: Each feature's logic and styles are clearly paired

## Migration Plan

1. Create new directory structure
2. Update feature registry to work with new paths
3. Move files to new locations
4. Update all imports
5. Test everything works

## Feature Registration Examples

With this structure, each feature would be completely self-contained:

```typescript
// features/profile/friendsList.ts
import {
  registerFeature,
  ActivationHelpers,
} from "../../system/lib/featureRegistry";
import "./friendsList.css";

registerFeature({
  settingKey: "showFriendListRanks",
  category: "profile",
  defaultValue: true,
  description: "Show ranks in profile friends list",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.onPageTypes(["profile"]),
    ActivationHelpers.whenEnabled("showFriendListRanks")
  ),

  handler: initializeFriendsList,
  apiCalls: [
    { requestType: "get_friend_ranks", responseType: "friend_ranks_data" },
  ],
});
```

```typescript
// features/sidebar/sidebarFriends.ts
import {
  registerFeature,
  ActivationHelpers,
} from "../../system/lib/featureRegistry";
import "./sidebarFriends.css";

registerFeature({
  settingKey: "showSidebarFriendRanks",
  category: "sidebar",
  defaultValue: true,
  description: "Show friend ranks in sidebar",

  shouldActivate: ActivationHelpers.and(
    ActivationHelpers.always, // Active on all pages
    ActivationHelpers.whenEnabled("showSidebarFriendRanks")
  ),

  handler: initializeSidebarFriends,
  apiCalls: [
    { requestType: "get_friend_ranks", responseType: "friend_ranks_data" },
  ],
});
```

## Key Advantages of This Naming

✅ **IDE-Friendly**: `friendsList.ts` vs `sidebarFriends.ts` - immediately clear what each file does
✅ **Tab Management**: No more 20 tabs all named "index.ts"
✅ **File Search**: Easy to find `Cmd+P -> "friendsList"`
✅ **Pair Recognition**: `friendsList.ts` + `friendsList.css` obviously go together
✅ **Consistent**: Follows existing patterns in your `playerProfile/` directory
