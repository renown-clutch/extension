import { createHeadObserver } from "../utils/observerUtils";
import browserAPI from "../lib/browserAPI";

const LOCAL_STORAGE_THEME_KEY = "clutch-theme-preference";
const TEMP_STYLE_CACHE_KEY = "clutch-temp-styles-cache";

const DARK_SHEET_PATH = browserAPI.runtime.getURL("themes/DarkSheet.css");
const PINK_SHEET_PATH = browserAPI.runtime.getURL("themes/PinkSheet.css");
const PURPLE_SHEET_PATH = browserAPI.runtime.getURL("themes/PurpleSheet.css");
const GREEN_SHEET_PATH = browserAPI.runtime.getURL("themes/GreenSheet.css");
const DARK_GRAY_SHEET_PATH = browserAPI.runtime.getURL(
  "themes/DarkGraySheet.css"
);
const BLACK_SHEET_PATH = browserAPI.runtime.getURL("themes/BlackSheet.css");
const DEFAULT_SHEET_PATH = browserAPI.runtime.getURL("themes/DefaultSheet.css");
const SPEAR_SHEET_PATH = browserAPI.runtime.getURL("themes/SpearSheet.css");

const tempThemeStyles: Record<string, string> = {
  default:
    "html, body { background-color: #1a1a1a !important; color: #fff !important; transition: none !important; }",
  dark: "html, body { background-color: #020618 !important; color: #fff !important; transition: none !important; }",
  pink: "html, body { background-color: #440c21 !important; color: #fff !important; transition: none !important; }",
  purple:
    "html, body { background-color: #1a0033 !important; color: #fff !important; transition: none !important; }",
  green:
    "html, body { background-color: #0a2613 !important; color: #fff !important; transition: none !important; }",
  darkgray:
    "html, body { background-color: #1a1a1a !important; color: #fff !important; transition: none !important; }",
  black:
    "html, body { background-color: #1a1a1a !important; color: #fff !important; transition: none !important; }",
  spear:
    "html, body { background-color: #1a1a1a !important; color: #fff !important; transition: none !important; }",
};

const themePathMap: Record<string, string> = {
  default: DEFAULT_SHEET_PATH,
  dark: DARK_SHEET_PATH,
  pink: PINK_SHEET_PATH,
  purple: PURPLE_SHEET_PATH,
  green: GREEN_SHEET_PATH,
  darkgray: DARK_GRAY_SHEET_PATH,
  black: BLACK_SHEET_PATH,
  spear: SPEAR_SHEET_PATH,
};

const tempStyleElement = document.createElement("style");
tempStyleElement.id = "clutch-theme-temp";
tempStyleElement.textContent = tempThemeStyles.dark;

const styleElement = document.createElement("style");
styleElement.id = "clutch-theme";

let isThemeInjected = false;
let isTempThemeInjected = false;

const stylesheetCache: Record<string, string> = {};

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

(function preloadStylesheets() {
  const paths = Object.values(themePathMap);

  paths.forEach((path) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = path;
    link.as = "style";
    document.head?.appendChild(link);

    fetch(path)
      .then((response) => {
        if (response.ok) {
          return response.text();
        }
        throw new Error(`Failed to preload stylesheet: ${response.statusText}`);
      })
      .then((stylesheet) => {
        stylesheetCache[path] = stylesheet;

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

export function saveThemeToLocalStorage(theme: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
  } catch (error) {
    console.error("Failed to save theme to localStorage:", error);
  }
}

export function getThemeFromLocalStorage(): string | null {
  try {
    return localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
  } catch (error) {
    console.error("Failed to get theme from localStorage:", error);
    return null;
  }
}

function applyTempStyling(theme: string = "dark"): void {
  if (!isTempThemeInjected && document.documentElement) {
    const themePath = themePathMap[theme] || themePathMap.dark;
    if (stylesheetCache[themePath]) {
      let cssText = stylesheetCache[themePath];

      const rootMatch = cssText.match(/:root\s*{[^}]+}/);
      const bodyMatch = cssText.match(/body,html\s*{[^}]+}/);

      let essentialStyles = "";
      if (rootMatch) essentialStyles += rootMatch[0];
      if (bodyMatch) essentialStyles += bodyMatch[0];

      if (essentialStyles) {
        tempStyleElement.textContent = essentialStyles;
      } else {
        tempStyleElement.textContent =
          tempThemeStyles[theme] || tempThemeStyles.dark;
      }
    } else {
      tempStyleElement.textContent =
        tempThemeStyles[theme] || tempThemeStyles.dark;
    }

    document.documentElement.appendChild(tempStyleElement);
    isTempThemeInjected = true;
  }
}

function removeTempStyling(): void {
  if (isTempThemeInjected && tempStyleElement.parentNode) {
    tempStyleElement.parentNode.removeChild(tempStyleElement);
    isTempThemeInjected = false;
  }
}

export function initTempStyling(): void {
  const cachedTheme = getThemeFromLocalStorage();
  if (cachedTheme) {
    applyTempStyling(cachedTheme);
  }
}

export function applyThemeToPopup(theme: string): void {
  const popupRoot = document.querySelector(".popup-root");
  if (popupRoot) {
    const themePath = themePathMap[theme] || themePathMap.dark;
    if (stylesheetCache[themePath]) {
      const cssText = stylesheetCache[themePath];
      const rootMatch = cssText.match(/:root\s*{[^}]+}/);
      if (rootMatch) {
        // Remove any existing theme styles
        const existingStyles = popupRoot.querySelectorAll("style[data-theme]");
        existingStyles.forEach((style) => style.remove());

        // Add new theme styles
        const styleElement = document.createElement("style");
        styleElement.setAttribute("data-theme", theme);
        styleElement.textContent = rootMatch[0];
        popupRoot.appendChild(styleElement);
      }
    }
  }
}

export async function initializeTheme(theme: string): Promise<void> {
  saveThemeToLocalStorage(theme);

  applyTempStyling(theme);

  try {
    await loadAndApplyTheme(theme);
    removeTempStyling();
  } catch (error) {
    console.error("Failed to initialize theme:", error);
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

export function removeAllThemeStyles(): void {
  if (isTempThemeInjected && tempStyleElement.parentNode) {
    tempStyleElement.parentNode.removeChild(tempStyleElement);
    isTempThemeInjected = false;
  }

  if (isThemeInjected && styleElement.parentNode) {
    styleElement.parentNode.removeChild(styleElement);
    isThemeInjected = false;
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_THEME_KEY);
  } catch (error) {
    console.error("Failed to remove theme from localStorage:", error);
  }
}
