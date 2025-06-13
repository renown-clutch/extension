# Clutch | Renown.gg Extension

**Version:** 1.1.4
**Platform:** Chrome & Firefox Browser Extension  
**Target Site:** Renown.gg

A comprehensive browser extension that enhances the Renown.gg gaming experience with advanced player statistics, automation features, UI improvements, and social tools.

## 🎯 Project Overview

The Clutch extension provides real-time player insights, match statistics, automation tools, and enhanced UI components for the Renown.gg platform. Built with Svelte 5, TypeScript, and TailwindCSS, it offers both Chrome and Firefox compatibility.

## 📋 Feature Tracking & Status

Use this checklist to track testing and fixing progress after the major refactoring:

### 🎨 **Theme System**

- [x] **Dark Theme** - Custom dark theme for extension popup and injected elements ✅
- [x] **Theme Switching** - Dynamic theme switching functionality ✅
- [x] **Theme Persistence** - Theme settings saved across sessions ✅

### 🤖 **Automation Features**

- [x] **Match Auto-Accept** - Automatically accept match invitations with configurable delay (3s default) ✅ _Dynamic enable/disable working perfectly_
- [x] **Party Auto-Accept** - Automatically accept party invitations with configurable delay (3s default) ✅ _Dynamic enable/disable working perfectly_
- [x] **Auto-Accept Settings** - Delay configuration and toggle controls ✅ _Real-time delay updates without page reload_

### 🏆 **Live Match Enhancements**

- [ ] **Live Player Stats** - Real-time player statistics during matches
- [ ] **Live Faceit Ranks** - Display Faceit ranks for players in live matches
- [ ] **Live Map Statistics** - Map-specific statistics and performance data
- [ ] **Live Team Average ELO** - Calculate and display team average ELO in real-time
- [ ] **Live Player Streak Display** - Show current win/loss streaks

### 📊 **Match Page Features**

- [ ] **Faceit Ranks on Match Page** - Display Faceit ranks for all players
- [ ] **Team Average ELO Display** - Show calculated team averages
- [ ] **Map Statistics** - Detailed map performance statistics
- [ ] **Map Statistics Colors** - Color-coded performance indicators

### 👤 **Profile Enhancements**

- [ ] **CSStats Profile Button** - Quick access to CS:GO stats profiles
- [ ] **Faceit Profile Button** - Direct links to Faceit profiles
- [ ] **Ban Information Display** - Show player ban status and history
- [ ] **Highest ELO Display** - Show player's peak ELO rating
- [ ] **Current Match Links** - Links to player's ongoing matches
- [ ] **Player Matchup Stats** - Head-to-head statistics between players
- [ ] **Banned Player Detection** - Check and highlight matches with banned players

### 🏠 **Main Page Features**

- [x] **Last Played Matches** - Recent match history display ✅ _Dynamic enable/disable working perfectly_
- [x] **Average Party ELO** - Calculate and show party average ratings ✅ _Dynamic enable/disable working perfectly + Smart Updates implemented_
- [x] **Faceit ELO on Party List** - Display Faceit ratings in party listings ✅ _Dynamic enable/disable working perfectly + Smart Updates implemented_
- [x] **Clickable Party Usernames** - Convert usernames to clickable profile links ✅ _Dynamic enable/disable working perfectly_

### 👥 **Friends System**

- [ ] **Friend List Ranks** - Display ranks in friends list
- [ ] **Friend List Sorting** - Sort friends by Renown ELO
- [x] **Sidebar Friend Ranks** - Show friend ranks in sidebar ✅ _Dynamic enable/disable working perfectly_
- [ ] **Friends List UI** - Enhanced friends list interface

### 💬 **Chat System**

- [x] **Chat Window** - Enhanced chat interface ✅ _Dynamic enable/disable working perfectly_
- [x] **Chat Integration** - Seamless chat functionality ✅ _Dynamic enable/disable working perfectly_
- [x] **Chat Persistence** - Messages persist when switching between browser tabs ✅ _Fixed - messages now reload properly when returning to tab_
- [ ] **Chat Username Cache** - Efficient username caching system

**Known Issues:**

- ✅ **Chat Persistence** - ~~Chat messages disappear when switching away from the Renown tab and returning~~ **FIXED** ✅
- ❌ **Chat Loading** - Sometimes chat does not show any messages when the page is first loaded

### 🔊 **Audio Features**

- [x] **Match Found Sound** - Audio notifications for match found ✅ _Dynamic enable/disable working perfectly_
- [x] **Sound Volume Control** - Adjustable notification volume (70% default) ✅ _Dynamic enable/disable working perfectly_
- [x] **Sound Selection** - Multiple notification sound options ✅ _Dynamic enable/disable working perfectly_

### 🌐 **Global Features**

- [x] **Extension Navbar Button** - Quick access button in site navigation ✅ _Dynamic enable/disable working perfectly_
- [x] **Keep Alive Functionality** - Maintain extension active state ✅ _Dynamic enable/disable working perfectly_
- [x] **Settings Persistence** - Save and sync all user preferences
- [ ] **Cross-Browser Compatibility** - Chrome and Firefox support

## 📁 Project Structure

```
src/
├── core/                    # Core extension functionality
│   ├── background.ts        # Service worker
│   ├── content.ts          # Content script
│   └── config.ts           # Configuration
├── features/               # Feature implementations
│   ├── automation/         # Auto-accept features
│   ├── chat/              # Chat enhancements
│   ├── global/            # Global site features
│   ├── liveMatch/         # Live match features
│   ├── mainPage/          # Main page enhancements
│   ├── match/             # Match page features
│   ├── profile/           # Profile enhancements
│   └── sidebar/           # Sidebar features
├── popup/                 # Extension popup UI
│   ├── tabs/             # Settings tab components
│   └── Popup.svelte      # Main popup component
├── system/               # System utilities
│   ├── api/             # API integrations
│   ├── components/      # Reusable components
│   └── lib/            # Core libraries
├── themes/              # Theme system
└── utils/              # Utility functions
```

## 🚀 Development Commands

| Command                        | Description                 |
| ------------------------------ | --------------------------- |
| `npm run dev`                  | Start development server    |
| `npm run build`                | Build for Chrome            |
| `npm run build:firefox`        | Build for Firefox           |
| `npm run watch`                | Build Chrome in watch mode  |
| `npm run watch:firefox`        | Build Firefox in watch mode |
| `npm run export <ver>`         | Package Chrome extension    |
| `npm run export:firefox <ver>` | Package Firefox extension   |
| `npm run export:all <ver>`     | Package both versions       |

## 🔧 Build Requirements

- **Node.js**: v18.0.0+
- **npm**: v9.0.0+
- **Platform**: Developed on macOS 15.4.1 (M2 Apple chip)

## 📝 Testing Progress

**Legend:**

- ✅ **Working** - Feature fully functional with dynamic enable/disable
- ⚠️ **Partial** - Feature partially working/needs minor fixes
- ❌ **Broken** - Feature not working/needs major fixes
- 🔄 **Testing** - Currently being tested
- ⏸️ **Skipped** - Not tested yet

## 🛠️ **System Improvements**

### **Granular Feature Update System**

The extension now uses a **zero-config cleanup system** that:

- ✨ **Only updates changed features** (no more page jumping!)
- 🧹 **Automatic cleanup handlers** for proper disable functionality
- ⚡ **Smart dependency tracking** for related features
- 🎯 **Convention-based development** for fast feature addition

### **Technical Architecture**

- **Feature Registry**: Centralized feature management with cleanup handlers
- **Dependency Tracking**: Features can declare `dependsOn` for cross-feature updates
- **Granular Updates**: Only affected features are updated when settings change
- **Zero Configuration**: Add new features with minimal boilerplate

### Progress Summary

- **Total Features**: 42
- **Tested**: 19
- **Working**: 19 (Theme System + All Main Page Features + Chat System + Sidebar Features + Keep Alive + Audio Features + Auto-Accept Features)
- **Needs Minor Fixes**: 0
- **Not Started**: 23

### **Main Page Features Status**: ✅ **COMPLETE**

All main page features are fully functional with:

- ✅ Dynamic enable/disable without page reload
- ✅ Smart Updates system (no flickering)
- ✅ Dynamic player detection (new players joining lobby)
- ✅ Clean mutation detection logic
- ✅ Refactored and maintainable codebase

### 🎉 **Recently Fixed (Dynamic Enable/Disable)**

- ✅ **Match Auto-Accept** - Added proper cleanup handlers and dependency tracking for delay settings
- ✅ **Party Auto-Accept** - Added proper cleanup handlers and dependency tracking for delay settings
- ✅ **Auto-Accept Settings** - Removed force page reload, now updates in real-time
- ✅ **Chat Window** - Perfect cleanup and activation
- ✅ **Chat Persistence** - Messages now reload properly when switching back to tab
- ✅ **Last Played Matches** - Perfect cleanup and activation
- ✅ **Average Party ELO** - Perfect cleanup and activation, fixed conditional display logic, **Smart Updates implemented**
- ✅ **Faceit ELO on Party List** - Perfect cleanup and activation, **Smart Updates implemented**
- ✅ **Clickable Party Usernames** - Perfect cleanup and activation
- ✅ **Sidebar Friend Ranks** - Perfect cleanup and activation
- ✅ **Extension Navbar Button** - Perfect cleanup and activation

### 🎯 **Recently Implemented (Performance & UX)**

- ✅ **Smart Badge Updates** - Eliminated flickering by intelligently updating existing elements instead of recreating them
- ✅ **Dynamic Player Detection** - Fixed bug where new players joining lobby weren't getting badges updated
- ✅ **Simplified Mutation Detection** - Replaced complex hydration logic with simple, reliable change detection
- ✅ **Code Refactoring** - Reduced `averagePartyElo.ts` from 733 to 352 lines (52% reduction) by extracting reusable utilities
- ✅ **Smooth Fade-In Animations** - Added polished entrance animations to all visible extension elements for better UX

### 🎨 **Animation System**

#### **Smooth Fade-In Animations**

All visible extension elements now feature polished entrance animations for enhanced user experience:

- ✅ **Average Party ELO Display** - Slides in from left with fade (0.3s)
- ✅ **Individual Player Faceit Badges** - Slide up from below with scale + fade (0.25s, 0.1s delay)
- ✅ **Average Faceit Badge** - Scale + fade animation (0.2s, 0.15s delay)
- ✅ **Last 3 Matches** - Slides down from above with fade (0.4s)
- ✅ **Sidebar Friend Ranks** - Scale up with fade (0.3s, 0.1s delay)
- ✅ **Navbar CLUTCH Button** - Slides in from left with fade (0.3s, 0.2s delay)

**Design Principle**: All visible extension elements should receive smooth fade-in animations instead of sudden appearance for better UX polish.

#### **Animation TODO List**

**🎯 High Priority (Active Features):**

- [ ] **Chat Messages** - Add fade-in for individual message elements
- [ ] **Chat** - Update backend client code to read users steam ids from messages directly instead of ask api and have cache (add steam id field to redis messages)

**📋 Medium Priority (When Features Are Implemented):**

- [ ] **Live Match Features** - Player stats, Faceit ranks, map statistics, team ELO displays
- [ ] **Match Page Features** - Faceit ranks, team averages, map statistics with colors
- [ ] **Profile Features** - CSStats/Faceit buttons, ban info, highest ELO, current matches
- [ ] **Friends Features** - Friend list ranks, sorting UI, enhanced friends list interface

**💡 Implementation Notes:**

- Use consistent timing: 0.2s max duration
- Match animation style to context: slides for containers, scales for badges, fades for text
- Test animations don't interfere with existing site functionality

### 💡 **Identified Improvements**

#### **Average Party ELO Optimizations**

- **Race Condition Fix**: Quick enable/disable toggles can cause elements to inject due to backend response delays. Consider request cancellation or state tracking.
- ✅ **Smart Updates**: IMPLEMENTED - Now intelligently updates existing badge contents and classes, adds only newly enabled badges, removes only newly disabled badges, and preserves DOM structure for better performance and no flickering.
