import { createHeadObserver } from "../utils/observerUtils";
import browserAPI from "../lib/browserAPI";
import type { Theme, UserSettings } from "$lib/types";

const LOCAL_STORAGE_THEME_KEY = "clutch-theme-preference";

const UNIFIED_THEMES_PATH = browserAPI.runtime.getURL(
  "styles/unified-themes.css"
);
const FEATURES_SHEET_PATH = browserAPI.runtime.getURL("styles/features.css");
const COMMON_SHEET_PATH = browserAPI.runtime.getURL("styles/common.css");

const tempThemeStyles: Record<Theme, string> = {
  default: "",
  dark: "html, body { background-color: #020618 !important; color: #fff !important; transition: none !important; }",
  pink: "html, body { background-color: #440c21 !important; color: #fff !important; transition: none !important; }",
  purple:
    "html, body { background-color: #1a0033 !important; color: #fff !important; transition: none !important; }",
  green:
    "html, body { background-color: #0a2613 !important; color: #fff !important; transition: none !important; }",
  darkgray:
    "html, body { background-color: #1a1a1a !important; color: #fff !important; transition: none !important; }",
  black:
    "html, body { background-color: #0a0a0a !important; color: #fff !important; transition: none !important; }",
  oled: "html, body { background-color: #000000 !important; color: #fff !important; transition: none !important; }",
};

const tempStyleElement = document.createElement("style");
tempStyleElement.id = "clutch-theme-temp";

const unifiedThemesElement = document.createElement("style");
unifiedThemesElement.id = "clutch-unified-themes";

const featureStyleElement = document.createElement("style");
featureStyleElement.id = "clutch-features";

const commonStyleElement = document.createElement("style");
commonStyleElement.id = "clutch-common";

let isUnifiedThemesInjected = false;
let isTempThemeInjected = false;
let isFeaturesInjected = false;
let isCommonInjected = false;
let currentThemeClass = "";

const stylesheetCache: Record<string, string> = {};

const shadowRoots: Set<ShadowRoot> = new Set();

export function registerShadowRoot(shadowRoot: ShadowRoot): void {
  shadowRoots.add(shadowRoot);

  if (isFeaturesInjected && featureStyleElement.textContent) {
    injectStyleIntoShadowRoot(
      shadowRoot,
      featureStyleElement.textContent,
      "clutch-features-shadow"
    );
  }
  if (isUnifiedThemesInjected && unifiedThemesElement.textContent) {
    injectStyleIntoShadowRoot(
      shadowRoot,
      unifiedThemesElement.textContent,
      "clutch-unified-themes-shadow"
    );
  }
  if (isCommonInjected && commonStyleElement.textContent) {
    injectStyleIntoShadowRoot(
      shadowRoot,
      commonStyleElement.textContent,
      "clutch-common-shadow"
    );
  }
}

export function unregisterShadowRoot(shadowRoot: ShadowRoot): void {
  shadowRoots.delete(shadowRoot);
}

function injectStyleIntoShadowRoot(
  shadowRoot: ShadowRoot,
  css: string,
  id: string
): void {
  const existingStyle = shadowRoot.querySelector(`#${id}`);
  if (existingStyle) {
    existingStyle.remove();
  }

  const styleElement = document.createElement("style");
  styleElement.id = id;
  styleElement.textContent = css;
  shadowRoot.appendChild(styleElement);
}

function injectStyleIntoAllShadowRoots(css: string, id: string): void {
  shadowRoots.forEach((shadowRoot) => {
    injectStyleIntoShadowRoot(shadowRoot, css, id);
  });
}

export function saveThemeToLocalStorage(theme: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
  } catch (error) {
    console.error("Failed to save theme to localStorage:", error);
  }
}

export function getThemeFromLocalStorage(): Theme | null {
  try {
    return localStorage.getItem(LOCAL_STORAGE_THEME_KEY) as Theme | null;
  } catch (error) {
    console.error("Failed to get theme from localStorage:", error);
    return null;
  }
}

function applyTempStyling(theme: Theme = "dark"): void {
  if (!isTempThemeInjected && document.documentElement) {
    if (theme === "default") {
      return;
    }

    tempStyleElement.textContent =
      tempThemeStyles[theme] || tempThemeStyles.dark;
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

function removeCommonStyles(): void {
  if (isCommonInjected && commonStyleElement.parentNode) {
    commonStyleElement.parentNode.removeChild(commonStyleElement);
    isCommonInjected = false;
  }
}

function ensureCommonStylesLoaded(): void {
  if (!isCommonInjected) {
    loadAndApplyCommon();
  }
}

function applyThemeClass(theme: Theme): void {
  if (currentThemeClass) {
    document.documentElement.classList.remove(currentThemeClass);
  }

  if (theme === "default") {
    removeCommonStyles();
    return;
  } else {
    ensureCommonStylesLoaded();
  }

  const themeClass = `theme-${theme}`;
  document.documentElement.classList.add(themeClass);
  currentThemeClass = themeClass;
}

export function initTempStyling(): void {
  const cachedTheme = getThemeFromLocalStorage();
  if (cachedTheme && cachedTheme !== "default") {
    applyTempStyling(cachedTheme);
  }
}

export function applyThemeToPopup(theme: string): void {
  switchPopupTheme(theme as Theme);
}

export async function initializeTheme(
  userSettings: UserSettings
): Promise<void> {
  const theme = userSettings.selectedTheme as Theme;
  saveThemeToLocalStorage(theme);

  if (theme !== "default") {
    applyTempStyling(theme);
  }

  try {
    await Promise.all([loadAndApplyUnifiedThemes(), loadAndApplyFeatures()]);

    applyThemeClass(theme);

    removeTempStyling();
  } catch (error) {
    console.error("Failed to initialize theme:", error);
    removeTempStyling();
  }
}

export async function switchTheme(theme: Theme): Promise<void> {
  saveThemeToLocalStorage(theme);

  if (!isUnifiedThemesInjected) {
    await loadAndApplyUnifiedThemes();
  }

  applyThemeClass(theme);
}

export function switchThemeSync(theme: Theme): void {
  saveThemeToLocalStorage(theme);

  if (isUnifiedThemesInjected) {
    applyThemeClass(theme);
  } else {
    if (theme !== "default") {
      applyTempStyling(theme);
    }
    loadAndApplyUnifiedThemes().then(() => {
      applyThemeClass(theme);
      removeTempStyling();
    });
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

async function loadAndApplyUnifiedThemes(): Promise<void> {
  try {
    const stylesheet = await loadStylesheet(UNIFIED_THEMES_PATH);
    unifiedThemesElement.textContent = stylesheet;

    if (!isUnifiedThemesInjected) {
      if (document.head) {
        document.head.appendChild(unifiedThemesElement);
        isUnifiedThemesInjected = true;
        injectStyleIntoAllShadowRoots(
          stylesheet,
          "clutch-unified-themes-shadow"
        );
      } else {
        createHeadObserver(
          () => {
            if (document.head && !isUnifiedThemesInjected) {
              document.head.appendChild(unifiedThemesElement);
              isUnifiedThemesInjected = true;
              injectStyleIntoAllShadowRoots(
                stylesheet,
                "clutch-unified-themes-shadow"
              );
            }
          },
          { childList: true }
        );
      }
    }
  } catch (error) {
    console.error("Failed to load unified themes:", error);
    throw error;
  }
}

async function loadAndApplyFeatures(): Promise<void> {
  try {
    const stylesheet = await loadStylesheet(FEATURES_SHEET_PATH);
    featureStyleElement.textContent = stylesheet;

    if (!isFeaturesInjected) {
      if (document.head) {
        document.head.appendChild(featureStyleElement);
        isFeaturesInjected = true;
        injectStyleIntoAllShadowRoots(stylesheet, "clutch-features-shadow");
      } else {
        createHeadObserver(
          () => {
            if (document.head && !isFeaturesInjected) {
              document.head.appendChild(featureStyleElement);
              isFeaturesInjected = true;

              injectStyleIntoAllShadowRoots(
                stylesheet,
                "clutch-features-shadow"
              );
            }
          },
          { childList: true }
        );
      }
    }
  } catch (error) {
    console.error("Failed to load feature styles:", error);
    throw error;
  }
}

async function loadAndApplyCommon(): Promise<void> {
  try {
    const stylesheet = await loadStylesheet(COMMON_SHEET_PATH);
    commonStyleElement.textContent = stylesheet;

    if (!isCommonInjected) {
      if (document.head) {
        document.head.appendChild(commonStyleElement);
        isCommonInjected = true;
        injectStyleIntoAllShadowRoots(stylesheet, "clutch-common-shadow");
      } else {
        createHeadObserver(
          () => {
            if (document.head && !isCommonInjected) {
              document.head.appendChild(commonStyleElement);
              isCommonInjected = true;
              injectStyleIntoAllShadowRoots(stylesheet, "clutch-common-shadow");
            }
          },
          { childList: true }
        );
      }
    }
  } catch (error) {
    console.error("Failed to load common styles:", error);
    throw error;
  }
}

export function removeAllThemeStyles(): void {
  if (isTempThemeInjected && tempStyleElement.parentNode) {
    tempStyleElement.parentNode.removeChild(tempStyleElement);
    isTempThemeInjected = false;
  }

  if (isUnifiedThemesInjected && unifiedThemesElement.parentNode) {
    unifiedThemesElement.parentNode.removeChild(unifiedThemesElement);
    isUnifiedThemesInjected = false;
  }

  if (isFeaturesInjected && featureStyleElement.parentNode) {
    featureStyleElement.parentNode.removeChild(featureStyleElement);
    isFeaturesInjected = false;
  }

  removeCommonStyles();

  if (currentThemeClass) {
    document.documentElement.classList.remove(currentThemeClass);
    currentThemeClass = "";
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_THEME_KEY);
  } catch (error) {
    console.error("Failed to remove theme from localStorage:", error);
  }
}

export async function initializePopupTheme(theme: Theme): Promise<void> {
  await loadAndApplyUnifiedThemes();

  if (currentThemeClass) {
    document.documentElement.classList.remove(currentThemeClass);
  }
  let themeClass = "theme-dark";
  if (theme !== "default") {
    themeClass = `theme-${theme}`;
  } else {
    themeClass = "theme-dark";
  }
  document.documentElement.classList.add(themeClass);
  currentThemeClass = themeClass;
}

export function switchPopupTheme(theme: Theme): void {
  if (currentThemeClass) {
    document.documentElement.classList.remove(currentThemeClass);
  }

  let themeClass = "";
  if (theme !== "default") {
    themeClass = `theme-${theme}`;
  } else {
    themeClass = "theme-dark";
  }
  document.documentElement.classList.add(themeClass);
  currentThemeClass = themeClass;

  if (!isUnifiedThemesInjected) {
    loadAndApplyUnifiedThemes().catch((error) => {
      console.error("Failed to load unified themes for popup:", error);
    });
  }
}
