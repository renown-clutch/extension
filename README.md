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

- [ ] **Match Auto-Accept** - Automatically accept match invitations with configurable delay (3s default)
- [ ] **Party Auto-Accept** - Automatically accept party invitations with configurable delay (3s default)
- [ ] **Auto-Accept Settings** - Delay configuration and toggle controls

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
- [x] **Average Party ELO** - Calculate and show party average ratings ✅ _Dynamic enable/disable working perfectly_
- [x] **Faceit ELO on Party List** - Display Faceit ratings in party listings ✅ _Dynamic enable/disable working perfectly_
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

### 🔊 **Audio Features**

- [ ] **Match Found Sound** - Audio notifications for match found
- [ ] **Sound Volume Control** - Adjustable notification volume (70% default)
- [ ] **Sound Selection** - Multiple notification sound options

### 🌐 **Global Features**

- [x] **Extension Navbar Button** - Quick access button in site navigation ✅ _Dynamic enable/disable working perfectly_
- [ ] **Keep Alive Functionality** - Maintain extension active state
- [ ] **Settings Persistence** - Save and sync all user preferences
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
- **Tested**: 12
- **Working**: 12 (Theme System + All Main Page Features + Chat System + Sidebar Features)
- **Needs Minor Fixes**: 0
- **Not Started**: 30

### 🎉 **Recently Fixed (Dynamic Enable/Disable)**

- ✅ **Chat Window** - Perfect cleanup and activation
- ✅ **Chat Persistence** - Messages now reload properly when switching back to tab
- ✅ **Last Played Matches** - Perfect cleanup and activation
- ✅ **Average Party ELO** - Perfect cleanup and activation, fixed conditional display logic
- ✅ **Faceit ELO on Party List** - Perfect cleanup and activation
- ✅ **Clickable Party Usernames** - Perfect cleanup and activation
- ✅ **Sidebar Friend Ranks** - Perfect cleanup and activation
- ✅ **Extension Navbar Button** - Perfect cleanup and activation

### 💡 **Identified Improvements**

#### **Average Party ELO Optimizations**

- **Race Condition Fix**: Quick enable/disable toggles can cause elements to inject due to backend response delays. Consider request cancellation or state tracking.
- **Smart Updates**: Instead of complete re-rendering, implement intelligent updates that:
  - Edit existing badge contents and classes
  - Add only newly enabled badges
  - Remove only newly disabled badges
  - Preserve DOM structure when possible for better performance
- **Chat**: Update backendend client code to read users steam ids from messages directly instead of ask api and have cache (add steam id field to redis messages)
