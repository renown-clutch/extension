import { createHeadObserver } from "$utils/ui/observerUtils";
import browserAPI from "$system/lib/browserAPI";
import type { Theme, UserSettings } from "$system/lib/types";

const LOCAL_STORAGE_THEME_KEY = "clutch-theme-preference";
const LOCAL_STORAGE_CSS_CACHE_KEY = "clutch-css-cache";
const CSS_CACHE_VERSION = "1.0.0";

const STYLESHEET_PATHS = {
  unified: browserAPI.runtime.getURL("styles/unified-themes.css"),
  features: browserAPI.runtime.getURL("styles/features.css"),
  common: browserAPI.runtime.getURL("styles/common.css"),
} as const;

const TEMP_THEME_STYLES: Record<Theme, string> = {
  default: "",
  dark: `
    html, body {background-color: #020618 !important;}`,
  pink: `
    html, body {background-color: #440c21 !important;}`,
  purple: `
    html, body {background-color: #1a0033 !important;}`,
  green: `
    html, body {background-color: #0a2613 !important;}`,
  darkgray: `
    html, body {background-color: #1a1a1a !important;}`,
  black: `
    html, body {background-color: #0a0a0a !important;}`,
  oled: `
    html, body {background-color: #000000 !important;}`,
};

type StyleType = "temp" | "unified" | "features" | "common";

interface StyleManager {
  element: HTMLStyleElement;
  isInjected: boolean;
  shadowId: string;
}

class ThemeManager {
  private styleManagers: Record<StyleType, StyleManager>;
  private stylesheetCache: Record<string, string> = {};
  private shadowRoots: Set<ShadowRoot> = new Set();
  private currentThemeClass = "";

  constructor() {
    this.loadCSSCache();
    this.styleManagers = {
      temp: {
        element: this.createElement("clutch-theme-temp"),
        isInjected: false,
        shadowId: "clutch-temp-shadow",
      },
      unified: {
        element: this.createElement("clutch-unified-themes"),
        isInjected: false,
        shadowId: "clutch-unified-themes-shadow",
      },
      features: {
        element: this.createElement("clutch-features"),
        isInjected: false,
        shadowId: "clutch-features-shadow",
      },
      common: {
        element: this.createElement("clutch-common"),
        isInjected: false,
        shadowId: "clutch-common-shadow",
      },
    };
  }

  private createElement(id: string): HTMLStyleElement {
    const element = document.createElement("style");
    element.id = id;
    return element;
  }

  private loadCSSCache(): void {
    try {
      const cachedData = localStorage.getItem(LOCAL_STORAGE_CSS_CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (parsed.version === CSS_CACHE_VERSION && parsed.cache) {
          this.stylesheetCache = parsed.cache;
        }
      }
    } catch (error) {
      console.error("Failed to load CSS cache:", error);
    }
  }

  private saveCSSCache(): void {
    try {
      const cacheData = {
        version: CSS_CACHE_VERSION,
        cache: this.stylesheetCache,
        timestamp: Date.now(),
      };
      localStorage.setItem(
        LOCAL_STORAGE_CSS_CACHE_KEY,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error("Failed to save CSS cache:", error);
    }
  }

  private async loadStylesheet(
    styleType: StyleType,
    url: string
  ): Promise<string> {
    // Check cache first
    const cacheKey = styleType;
    if (this.stylesheetCache[cacheKey]) {
      return this.stylesheetCache[cacheKey];
    }

    // Load from network
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load stylesheet: ${response.statusText}`);
    }

    const stylesheet = await response.text();

    // Cache it
    this.stylesheetCache[cacheKey] = stylesheet;
    this.saveCSSCache();

    return stylesheet;
  }

  private injectStyleIntoShadowRoot(
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

  private injectStyleIntoAllShadowRoots(css: string, id: string): void {
    this.shadowRoots.forEach((shadowRoot) => {
      this.injectStyleIntoShadowRoot(shadowRoot, css, id);
    });
  }

  private injectStyleElement(styleType: StyleType, css: string): void {
    const manager = this.styleManagers[styleType];
    manager.element.textContent = css;

    if (!manager.isInjected) {
      if (document.head) {
        document.head.appendChild(manager.element);
        manager.isInjected = true;
        this.injectStyleIntoAllShadowRoots(css, manager.shadowId);
      } else {
        createHeadObserver(
          () => {
            if (document.head && !manager.isInjected) {
              document.head.appendChild(manager.element);
              manager.isInjected = true;
              this.injectStyleIntoAllShadowRoots(css, manager.shadowId);
            }
          },
          { childList: true }
        );
      }
    }
  }

  private removeStyleElement(styleType: StyleType): void {
    const manager = this.styleManagers[styleType];
    if (manager.isInjected && manager.element.parentNode) {
      manager.element.parentNode.removeChild(manager.element);
      manager.isInjected = false;
    }
  }

  private async loadAndApplyStylesheet(
    styleType: StyleType,
    url: string
  ): Promise<void> {
    try {
      const stylesheet = await this.loadStylesheet(styleType, url);
      this.injectStyleElement(styleType, stylesheet);
    } catch (error) {
      console.error(`Failed to load ${styleType} styles:`, error);
      throw error;
    }
  }

  private applyThemeClass(theme: Theme): void {
    if (this.currentThemeClass) {
      document.documentElement.classList.remove(this.currentThemeClass);
    }

    if (theme === "default") {
      this.removeStyleElement("common");
      return;
    }

    if (!this.styleManagers.common.isInjected) {
      this.loadAndApplyStylesheet("common", STYLESHEET_PATHS.common);
    }

    const themeClass = `theme-${theme}`;
    document.documentElement.classList.add(themeClass);
    this.currentThemeClass = themeClass;
  }

  private applyTempStyling(theme: Theme = "dark"): void {
    if (!this.styleManagers.temp.isInjected && theme !== "default") {
      const css = TEMP_THEME_STYLES[theme] || TEMP_THEME_STYLES.dark;
      this.injectStyleElement("temp", css);
    }
  }

  private removeTempStyling(): void {
    this.removeStyleElement("temp");
  }

  registerShadowRoot(shadowRoot: ShadowRoot): void {
    this.shadowRoots.add(shadowRoot);

    Object.entries(this.styleManagers).forEach(([, manager]) => {
      if (manager.isInjected && manager.element.textContent) {
        this.injectStyleIntoShadowRoot(
          shadowRoot,
          manager.element.textContent,
          manager.shadowId
        );
      }
    });
  }

  unregisterShadowRoot(shadowRoot: ShadowRoot): void {
    this.shadowRoots.delete(shadowRoot);
  }

  saveThemeToLocalStorage(theme: string): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
    } catch (error) {
      console.error("Failed to save theme to localStorage:", error);
    }
  }

  getThemeFromLocalStorage(): Theme | null {
    try {
      return localStorage.getItem(LOCAL_STORAGE_THEME_KEY) as Theme | null;
    } catch (error) {
      console.error("Failed to get theme from localStorage:", error);
      return null;
    }
  }

  async initializeTheme(userSettings: UserSettings): Promise<void> {
    const theme = userSettings.selectedTheme as Theme;
    this.saveThemeToLocalStorage(theme);

    // Apply temp styling immediately
    if (theme !== "default") {
      this.applyTempStyling(theme);
    }

    try {
      // Load main stylesheets
      await Promise.all([
        this.loadAndApplyStylesheet("unified", STYLESHEET_PATHS.unified),
        this.loadAndApplyStylesheet("features", STYLESHEET_PATHS.features),
      ]);

      // Apply theme class and remove temp styling
      this.applyThemeClass(theme);
      this.removeTempStyling();
    } catch (error) {
      console.error("Failed to initialize theme:", error);
      this.removeTempStyling();
    }
  }

  async switchTheme(theme: Theme): Promise<void> {
    this.saveThemeToLocalStorage(theme);

    if (!this.styleManagers.unified.isInjected) {
      await this.loadAndApplyStylesheet("unified", STYLESHEET_PATHS.unified);
    }

    this.applyThemeClass(theme);
  }

  switchThemeSync(theme: Theme): void {
    this.saveThemeToLocalStorage(theme);

    if (this.styleManagers.unified.isInjected) {
      this.applyThemeClass(theme);
    } else {
      if (theme !== "default") {
        this.applyTempStyling(theme);
      }
      this.loadAndApplyStylesheet("unified", STYLESHEET_PATHS.unified).then(
        () => {
          this.applyThemeClass(theme);
          this.removeTempStyling();
        }
      );
    }
  }

  async initializePopupTheme(theme: Theme): Promise<void> {
    await this.loadAndApplyStylesheet("unified", STYLESHEET_PATHS.unified);

    if (this.currentThemeClass) {
      document.documentElement.classList.remove(this.currentThemeClass);
    }

    const themeClass = theme !== "default" ? `theme-${theme}` : "theme-dark";
    document.documentElement.classList.add(themeClass);
    this.currentThemeClass = themeClass;
  }

  switchPopupTheme(theme: Theme): void {
    if (this.currentThemeClass) {
      document.documentElement.classList.remove(this.currentThemeClass);
    }

    const themeClass = theme !== "default" ? `theme-${theme}` : "theme-dark";
    document.documentElement.classList.add(themeClass);
    this.currentThemeClass = themeClass;

    if (!this.styleManagers.unified.isInjected) {
      this.loadAndApplyStylesheet("unified", STYLESHEET_PATHS.unified).catch(
        (error) => {
          console.error("Failed to load unified themes for popup:", error);
        }
      );
    }
  }

  removeAllThemeStyles(): void {
    Object.keys(this.styleManagers).forEach((styleType) => {
      this.removeStyleElement(styleType as StyleType);
    });

    if (this.currentThemeClass) {
      document.documentElement.classList.remove(this.currentThemeClass);
      this.currentThemeClass = "";
    }

    try {
      localStorage.removeItem(LOCAL_STORAGE_THEME_KEY);
    } catch (error) {
      console.error("Failed to remove theme from localStorage:", error);
    }
  }

  clearCSSCache(): void {
    this.stylesheetCache = {};
    try {
      localStorage.removeItem(LOCAL_STORAGE_CSS_CACHE_KEY);
    } catch (error) {
      console.error("Failed to clear CSS cache:", error);
    }
  }
}

const themeManager = new ThemeManager();

export const registerShadowRoot = (shadowRoot: ShadowRoot): void =>
  themeManager.registerShadowRoot(shadowRoot);

export const unregisterShadowRoot = (shadowRoot: ShadowRoot): void =>
  themeManager.unregisterShadowRoot(shadowRoot);

export const saveThemeToLocalStorage = (theme: string): void =>
  themeManager.saveThemeToLocalStorage(theme);

export const getThemeFromLocalStorage = (): Theme | null =>
  themeManager.getThemeFromLocalStorage();

export const initializeTheme = (userSettings: UserSettings): Promise<void> =>
  themeManager.initializeTheme(userSettings);

export const switchTheme = (theme: Theme): Promise<void> =>
  themeManager.switchTheme(theme);

export const switchThemeSync = (theme: Theme): void =>
  themeManager.switchThemeSync(theme);

export const removeAllThemeStyles = (): void =>
  themeManager.removeAllThemeStyles();

export const initializePopupTheme = (theme: Theme): Promise<void> =>
  themeManager.initializePopupTheme(theme);

export const switchPopupTheme = (theme: Theme): void =>
  themeManager.switchPopupTheme(theme);

export const clearCSSCache = (): void => themeManager.clearCSSCache();
