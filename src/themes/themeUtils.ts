import { createHeadObserver } from "../utils/observerUtils";

// Constants for theme storage
const LOCAL_STORAGE_THEME_KEY = "clutch-theme-preference";

// Add dedicated temporary styles for each theme
const tempThemeStyles: Record<string, string> = {
  dark: "html, body { background-color: #020618 !important; color: #fff !important; transition: none !important; } .site-layout>.grid aside.sidebar { background-color: #0f172b !important; } .party-player-card { background: linear-gradient(45deg, #0f172b, #1d293d) !important; } .next-rank-progress { background: linear-gradient(90deg, #0f172b, #314158) !important; } .footer { background-color: #00030a !important; } .play-friend-list { background-color: #0f172b !important; } .navbar { border-bottom: 2px solid #0f172b !important; background-color: #020618 !important; } .site-layout>.grid aside.sidebar button.toggle { background-color: #314158 !important; } .navbar .container .content .actions .profile-menu.open .toggle, .navbar .container .content .actions .profile-menu:hover .toggle { background-color: #0f172b !important; } ::-webkit-scrollbar-track { background-color: rgba(5, 11, 38, 0.797) !important; } ::-webkit-scrollbar-thumb { background-color: #1d293d !important; }",
  pink: "html, body { background-color: #440c21 !important; color: #fff !important; transition: none !important; } .site-layout>.grid aside.sidebar { background-color: #5c1130 !important; } .party-player-card { background: linear-gradient(45deg, #5c1130, #881a4a) !important; } .next-rank-progress { background: linear-gradient(90deg, #5c1130, #b42463) !important; } .footer { background-color: #440c21 !important; } .play-friend-list { background-color: #5c1130 !important; } .navbar { border-bottom: 2px solid #5c1130 !important; background-color: #440c21 !important; } .site-layout>.grid aside.sidebar button.toggle { background-color: #b42463 !important; } .navbar .container .content .actions .profile-menu.open .toggle, .navbar .container .content .actions .profile-menu:hover .toggle { background-color: #5c1130 !important; } ::-webkit-scrollbar-track { background-color: rgba(92, 17, 48, 0.8) !important; } ::-webkit-scrollbar-thumb { background-color: #e02e7d !important; }",
  purple:
    "html, body { background-color: #1a0033 !important; color: #fff !important; transition: none !important; } .site-layout>.grid aside.sidebar { background-color: #2b0052 !important; } .party-player-card { background: linear-gradient(45deg, #2b0052, #3a006f) !important; } .next-rank-progress { background: linear-gradient(90deg, #2b0052, #4a008c) !important; } .footer { background-color: #0d0020 !important; } .play-friend-list { background-color: #2b0052 !important; } .navbar { border-bottom: 2px solid #2b0052 !important; background-color: #1a0033 !important; } .site-layout>.grid aside.sidebar button.toggle { background-color: #4a008c !important; } .navbar .container .content .actions .profile-menu.open .toggle, .navbar .container .content .actions .profile-menu:hover .toggle { background-color: #2b0052 !important; } ::-webkit-scrollbar-track { background-color: rgba(26, 0, 51, 0.797) !important; } ::-webkit-scrollbar-thumb { background-color: #3a006f !important; }",
  green:
    "html, body { background-color: #0a2613 !important; color: #fff !important; transition: none !important; } .site-layout>.grid aside.sidebar { background-color: #0e3218 !important; } .party-player-card { background: linear-gradient(45deg, #0e3218, #174023) !important; } .next-rank-progress { background: linear-gradient(90deg, #0e3218, #245434) !important; } .footer { background-color: #051409 !important; } .play-friend-list { background-color: #0e3218 !important; } .navbar { border-bottom: 2px solid #0e3218 !important; background-color: #0a2613 !important; } .site-layout>.grid aside.sidebar button.toggle { background-color: #245434 !important; } .navbar .container .content .actions .profile-menu.open .toggle, .navbar .container .content .actions .profile-menu:hover .toggle { background-color: #0e3218 !important; } ::-webkit-scrollbar-track { background-color: rgba(10, 38, 19, 0.797) !important; } ::-webkit-scrollbar-thumb { background-color: #174023 !important; }",
  darkgray:
    "html, body { background-color: #1a1a1a !important; color: #fff !important; transition: none !important; } .site-layout>.grid aside.sidebar { background-color: #1f1f1f !important; } .party-player-card { background: linear-gradient(45deg, #1f1f1f, #2a2a2a) !important; } .next-rank-progress { background: linear-gradient(90deg, #1f1f1f, #333333) !important; } .footer { background-color: #1a1a1a !important; } .play-friend-list { background-color: #1f1f1f !important; } .navbar { border-bottom: 2px solid #1f1f1f !important; background-color: #1a1a1a !important; } .site-layout>.grid aside.sidebar button.toggle { background-color: #333333 !important; } .navbar .container .content .actions .profile-menu.open .toggle, .navbar .container .content .actions .profile-menu:hover .toggle { background-color: #1f1f1f !important; } ::-webkit-scrollbar-track { background-color: rgba(31, 31, 31, 0.8) !important; } ::-webkit-scrollbar-thumb { background-color: #444444 !important; }",
};

// Add temporary style element to prevent flash
const tempStyleElement = document.createElement("style");
tempStyleElement.id = "clutch-theme-temp";
tempStyleElement.textContent = tempThemeStyles.dark; // Default temp style

const styleElement = document.createElement("style");
styleElement.id = "clutch-theme";

let isThemeInjected = false;
let isTempThemeInjected = false;

const DARK_SHEET_PATH = chrome.runtime.getURL("themes/DarkSheet.css");
const PINK_SHEET_PATH = chrome.runtime.getURL("themes/PinkSheet.css");
const PURPLE_SHEET_PATH = chrome.runtime.getURL("themes/PurpleSheet.css");
const GREEN_SHEET_PATH = chrome.runtime.getURL("themes/GreenSheet.css");
const DARK_GRAY_SHEET_PATH = chrome.runtime.getURL("themes/DarkGraySheet.css");

// Preload all stylesheets when the module loads
(function preloadStylesheets() {
  const paths = [
    DARK_SHEET_PATH,
    PINK_SHEET_PATH,
    PURPLE_SHEET_PATH,
    GREEN_SHEET_PATH,
    DARK_GRAY_SHEET_PATH,
  ];

  // Create preload links for faster loading
  paths.forEach((path) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = path;
    link.as = "style";
    document.head?.appendChild(link);

    // Also start fetching the stylesheets to cache them
    fetch(path)
      .then((response) => {
        if (response.ok) {
          return response.text();
        }
        throw new Error(`Failed to preload stylesheet: ${response.statusText}`);
      })
      .then((stylesheet) => {
        stylesheetCache[path] = stylesheet;
      })
      .catch((error) => {
        console.error(`Error preloading stylesheet:`, error);
      });
  });
})();

const stylesheetCache: Record<string, string> = {};

// Save theme preference to localStorage for faster access
export function saveThemeToLocalStorage(theme: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
  } catch (error) {
    console.error("Failed to save theme to localStorage:", error);
  }
}

// Get theme from localStorage (faster than Chrome storage)
export function getThemeFromLocalStorage(): string | null {
  try {
    return localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
  } catch (error) {
    console.error("Failed to get theme from localStorage:", error);
    return null;
  }
}

// Apply temporary styling immediately to prevent flash
function applyTempStyling(theme: string = "dark"): void {
  if (!isTempThemeInjected && document.documentElement) {
    // Set appropriate temp style based on theme
    tempStyleElement.textContent =
      tempThemeStyles[theme] || tempThemeStyles.dark;
    document.documentElement.appendChild(tempStyleElement);
    isTempThemeInjected = true;
  }
}

// Remove temporary styling
function removeTempStyling(): void {
  if (isTempThemeInjected && tempStyleElement.parentNode) {
    tempStyleElement.parentNode.removeChild(tempStyleElement);
    isTempThemeInjected = false;
  }
}

// This function initializes temporary styling immediately
// We call this as early as possible in content script
export function initTempStyling(): void {
  const cachedTheme = getThemeFromLocalStorage();
  if (cachedTheme && cachedTheme !== "default") {
    applyTempStyling(cachedTheme);
  }
}

export async function initialize(theme: string): Promise<void> {
  if (
    theme !== "dark" &&
    theme !== "pink" &&
    theme !== "purple" &&
    theme !== "green" &&
    theme !== "darkgray"
  ) {
    return;
  }

  // Save theme to localStorage for future quick access
  saveThemeToLocalStorage(theme);

  // Apply temporary styling immediately with the correct theme color
  applyTempStyling(theme);

  try {
    await loadAndApplyTheme(theme);
    // Remove temporary styling after proper theme is loaded
    removeTempStyling();
  } catch (error) {
    console.error("Failed to initialize theme:", error);
    // Clean up temp styling on error
    removeTempStyling();
  }
}

async function loadStylesheet(url: string): Promise<string> {
  if (stylesheetCache[url]) {
    return stylesheetCache[url];
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load stylesheet: ${response.statusText}`);
    }

    const stylesheet = await response.text();
    stylesheetCache[url] = stylesheet;
    return stylesheet;
  } catch (error) {
    console.error(`Error fetching stylesheet:`, error);
    throw error;
  }
}

async function loadAndApplyTheme(theme: string): Promise<void> {
  let url;

  switch (theme) {
    case "dark":
      url = DARK_SHEET_PATH;
      break;
    case "pink":
      url = PINK_SHEET_PATH;
      break;
    case "purple":
      url = PURPLE_SHEET_PATH;
      break;
    case "green":
      url = GREEN_SHEET_PATH;
      break;
    case "darkgray":
      url = DARK_GRAY_SHEET_PATH;
      break;
    default:
      url = DARK_SHEET_PATH;
  }

  try {
    const stylesheet = await loadStylesheet(url);
    styleElement.textContent = stylesheet;

    if (!isThemeInjected) {
      if (document.head) {
        document.head.appendChild(styleElement);
        isThemeInjected = true;
      } else {
        // Use our new utility for head observer
        createHeadObserver(
          () => {
            if (document.head && !isThemeInjected) {
              document.head.appendChild(styleElement);
              isThemeInjected = true;
            }
          },
          { childList: true }
        );
      }
    }
  } catch (error) {
    console.error(`Failed to load theme ${theme}:`, error);
    throw error;
  }
}
