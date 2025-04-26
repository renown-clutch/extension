import { createHeadObserver } from "../utils/observerUtils";
import browserAPI from "../lib/browserAPI";

// Constants for theme storage
const LOCAL_STORAGE_THEME_KEY = "clutch-theme-preference";
const TEMP_STYLE_CACHE_KEY = "clutch-temp-styles-cache";

// Paths for the theme files
const DARK_SHEET_PATH = browserAPI.runtime.getURL("themes/DarkSheet.css");
const PINK_SHEET_PATH = browserAPI.runtime.getURL("themes/PinkSheet.css");
const PURPLE_SHEET_PATH = browserAPI.runtime.getURL("themes/PurpleSheet.css");
const GREEN_SHEET_PATH = browserAPI.runtime.getURL("themes/GreenSheet.css");
const DARK_GRAY_SHEET_PATH = browserAPI.runtime.getURL(
  "themes/DarkGraySheet.css"
);

// Fallback temp styles in case we can't load the CSS immediately
const tempThemeStyles: Record<string, string> = {
  dark: "html, body { background-color: #020618 !important; color: #fff !important; transition: none !important; }",
  pink: "html, body { background-color: #440c21 !important; color: #fff !important; transition: none !important; }",
  purple:
    "html, body { background-color: #1a0033 !important; color: #fff !important; transition: none !important; }",
  green:
    "html, body { background-color: #0a2613 !important; color: #fff !important; transition: none !important; }",
  darkgray:
    "html, body { background-color: #1a1a1a !important; color: #fff !important; transition: none !important; }",
};

// Map themes to their file paths
const themePathMap: Record<string, string> = {
  dark: DARK_SHEET_PATH,
  pink: PINK_SHEET_PATH,
  purple: PURPLE_SHEET_PATH,
  green: GREEN_SHEET_PATH,
  darkgray: DARK_GRAY_SHEET_PATH,
};

// Add temporary style element to prevent flash
const tempStyleElement = document.createElement("style");
tempStyleElement.id = "clutch-theme-temp";
tempStyleElement.textContent = tempThemeStyles.dark; // Default temp style

const styleElement = document.createElement("style");
styleElement.id = "clutch-theme";

let isThemeInjected = false;
let isTempThemeInjected = false;
let currentTheme: string | null = null;

// Cache for stylesheets
const stylesheetCache: Record<string, string> = {};

// Try to load cached temp styles from localStorage
try {
  const cachedStyles = localStorage.getItem(TEMP_STYLE_CACHE_KEY);
  if (cachedStyles) {
    const parsedStyles = JSON.parse(cachedStyles);
    Object.keys(parsedStyles).forEach((theme) => {
      stylesheetCache[themePathMap[theme]] = parsedStyles[theme];
    });
  }
} catch (e) {
  console.error("Failed to load cached temp styles:", e);
}

// Preload all stylesheets when the module loads
(function preloadStylesheets() {
  const paths = Object.values(themePathMap);

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

        // Update temp styles cache in localStorage
        try {
          const tempStylesCache: Record<string, string> = {};
          Object.entries(themePathMap).forEach(([theme, path]) => {
            if (stylesheetCache[path]) {
              tempStylesCache[theme] = stylesheetCache[path];
            }
          });
          localStorage.setItem(
            TEMP_STYLE_CACHE_KEY,
            JSON.stringify(tempStylesCache)
          );
        } catch (e) {
          console.error("Failed to cache temp styles:", e);
        }
      })
      .catch((error) => {
        console.error(`Error preloading stylesheet:`, error);
      });
  });
})();

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
    // Try to use cached full stylesheet first if available
    const themePath = themePathMap[theme] || themePathMap.dark;
    if (stylesheetCache[themePath]) {
      // Extract only essential styles for quick application
      let cssText = stylesheetCache[themePath];

      // Extract just the root variables and body styles
      const rootMatch = cssText.match(/:root\s*{[^}]+}/);
      const bodyMatch = cssText.match(/body,html\s*{[^}]+}/);

      let essentialStyles = "";
      if (rootMatch) essentialStyles += rootMatch[0];
      if (bodyMatch) essentialStyles += bodyMatch[0];

      if (essentialStyles) {
        tempStyleElement.textContent = essentialStyles;
      } else {
        // Fall back to simplified temp styles if extraction fails
        tempStyleElement.textContent =
          tempThemeStyles[theme] || tempThemeStyles.dark;
      }
    } else {
      // Fall back to simplified temp styles
      tempStyleElement.textContent =
        tempThemeStyles[theme] || tempThemeStyles.dark;
    }

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
  const url = themePathMap[theme] || themePathMap.dark;

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
