# Clutch Extension - Project Summary

## 🏗️ **Technology Stack**

### **Frontend Framework**

- **Svelte 5** - Main UI framework with latest features
- **TypeScript** - Type-safe JavaScript development
- **TailwindCSS 4.x** - Utility-first CSS framework
- **PostCSS** - CSS processing pipeline

### **Browser Extension Architecture**

- **Manifest V3** - Modern extension format
- **Service Worker** - Background processing (`background.ts`)
- **Content Scripts** - Site injection (`content.ts`)
- **Popup Interface** - Extension settings UI

### **Build System**

- **Vite 6.x** - Fast build tool and dev server
- **TypeScript Compiler** - Type checking and compilation
- **Custom Build Scripts** - Unified Chrome/Firefox building
- **Svelte Compiler** - Component compilation

### **Key Dependencies**

- `@lucide/svelte` - Icon library
- `bits-ui` - UI component library
- `socket.io-client` - Real-time communication
- `@thisux/sveltednd` - Drag and drop functionality
- `archiver` - Zip file creation for packaging

## 🏛️ **Project Architecture**

### **Extension Components**

```
Browser Extension Structure:
├── Background Service Worker (background.ts)
├── Content Script (content.ts)
├── Popup Interface (Popup.svelte)
└── Web Accessible Resources (assets/)
```

### **Core Architecture Pattern**

- **Feature Registry System** - Centralized feature management
- **Settings-Driven Features** - All features controlled by user settings
- **Unified Build System** - Single codebase for Chrome/Firefox
- **Component-Based UI** - Reusable Svelte components

## 📁 **Directory Structure**

```
clutch-extension/
├── src/
│   ├── core/                    # Extension core functionality
│   │   ├── background.ts        # Service worker (API calls, notifications)
│   │   ├── content.ts          # Content script (DOM manipulation)
│   │   └── config.ts           # Configuration constants
│   │
│   ├── features/               # Feature implementations (modular)
│   │   ├── automation/         # Auto-accept (match/party)
│   │   ├── chat/              # Chat window enhancements
│   │   ├── global/            # Site-wide features (navbar, keep-alive)
│   │   ├── liveMatch/         # Live match stats & ranks
│   │   ├── mainPage/          # Home page enhancements
│   │   ├── match/             # Match page features
│   │   ├── profile/           # Profile page enhancements
│   │   └── sidebar/           # Sidebar features
│   │
│   ├── popup/                 # Extension popup UI
│   │   ├── tabs/             # Settings tabs (Theme, Match, etc.)
│   │   ├── Popup.svelte      # Main popup component
│   │   ├── popup.html        # Popup HTML template
│   │   ├── popup.ts          # Popup entry point
│   │   └── popup.css         # Popup styles
│   │
│   ├── system/               # System utilities & components
│   │   ├── api/             # API integrations (Clutch API)
│   │   ├── components/      # Reusable UI components
│   │   └── lib/            # Core libraries (types, registry, utils)
│   │
│   ├── themes/              # Theme system
│   │   └── themeUtils.ts    # Theme switching logic
│   │
│   └── utils/              # Utility functions
│       ├── common/         # Common utilities
│       ├── data/          # Data processing utilities
│       ├── profile/       # Profile-related utilities
│       └── ui/           # UI manipulation utilities
│
├── public/                   # Static assets
│   ├── manifest.json        # Extension manifest
│   └── assets/             # Icons, sounds, images
│
├── dist/                    # Chrome build output
├── dist-firefox/           # Firefox build output
├── export/                 # Packaged extensions
└── [config files]         # Vite, TypeScript, Tailwind configs
```

## 🔧 **Key System Components**

### **1. Feature Registry System**

- **Location**: `src/system/lib/featureRegistry.ts`
- **Purpose**: Centralized feature management and activation
- **Pattern**: Each feature registers itself with settings and handlers

### **2. User Settings System**

- **Types**: `src/system/lib/types.ts` - Complete UserSettings interface
- **Storage**: Browser extension local storage
- **Sync**: Real-time sync between popup and content script

### **3. Content Script Architecture**

- **Entry Point**: `src/core/content.ts`
- **Injection**: Runs on `*://*.renown.gg/*` pages
- **Features**: Applies active features based on current page and settings

### **4. Background Service Worker**

- **File**: `src/core/background.ts`
- **Functions**: API calls, notifications, cross-tab communication
- **Permissions**: `storage`, `activeTab`, API access

## 🎯 **Feature Implementation Pattern**

### **Standard Feature Structure**

```typescript
// Each feature typically includes:
1. Feature registration with settings key
2. Activation condition (page-specific)
3. DOM manipulation logic
4. API integration (if needed)
5. Cleanup/teardown logic
```

### **Feature Categories**

- **Live Features** - Real-time match data injection
- **Static Features** - One-time DOM enhancements
- **Automation Features** - Event-driven automation
- **UI Features** - Interface improvements

## 🌐 **External Integrations**

### **Primary APIs**

- **Clutch API** (`apiv2.goclutch.pro`) - Main data source
- **Renown.gg** - Target platform integration
- **Faceit API** - Player ranking data
- **CSStats** - CS:GO statistics

### **Browser APIs Used**

- **Storage API** - Settings persistence
- **Tabs API** - Cross-tab communication
- **Runtime API** - Message passing
- **Notifications API** - User notifications

## 🛠️ **Build & Development**

### **Development Workflow**

1. **Watch Mode**: `npm run watch` (Chrome) or `npm run watch:firefox`
2. **Hot Reload**: Vite dev server with HMR
3. **Type Checking**: Continuous TypeScript validation
4. **Extension Loading**: Load `dist/` or `dist-firefox/` in browser

### **Build Process**

1. **TypeScript Compilation** - Source code compilation
2. **Svelte Compilation** - Component processing
3. **Asset Processing** - Icons, sounds, styles
4. **Manifest Generation** - Browser-specific manifests
5. **Output Generation** - Separate Chrome/Firefox builds

### **Packaging System**

- **Versioning**: Automated version updates across files
- **Archiving**: Zip file creation with naming convention
- **Multi-browser**: Simultaneous Chrome/Firefox packaging

## 📋 **Settings Management**

### **Settings Categories**

- **Theme** - UI appearance
- **Auto-accept** - Automation settings
- **Chat** - Chat enhancements
- **Match** - Match page features
- **Sounds** - Audio notifications
- **Profiles** - Profile enhancements
- **Settings** - Global preferences
- **Friends** - Social features
- **MainPage** - Home page features

### **Settings Flow**

```
Popup UI → Local Storage → Content Script → Feature Activation
```

## 🎨 **UI/UX Architecture**

### **Design System**

- **Components**: `src/system/components/`
- **Styling**: TailwindCSS utility classes
- **Themes**: Dark theme with CSS custom properties
- **Icons**: Lucide icon library

### **Popup Interface**

- **Layout**: Sidebar + Content area
- **Navigation**: Tab-based settings organization
- **State Management**: Svelte 5 reactive state
- **Persistence**: Auto-save settings changes

## 🔍 **Key Development Patterns**

1. **Modular Features** - Each feature is self-contained
2. **Settings-Driven** - All functionality controlled by user preferences
3. **Type Safety** - Comprehensive TypeScript coverage
4. **Cross-Browser** - Single codebase, multiple outputs
5. **Real-time Sync** - Settings changes applied immediately
6. **Error Handling** - Graceful degradation for broken features

This summary provides the essential context needed to understand and work with the Clutch extension codebase efficiently.
