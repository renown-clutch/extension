import {
  applyThemeToAllShadowRoots,
  updateShadowRootThemeClasses,
} from "./shadowThemeManager";
import browserAPI from "../lib/browserAPI";

const CSS_CACHE_KEY = "clutch-css-cache";

const CSS_PATHS = {
  unified: "styles/unified-themes.css",
  features: "styles/features.css",
  common: "styles/common.css",
} as const;

type StyleType = keyof typeof CSS_PATHS;

interface CSSCacheEntry {
  content: string;
  hash: string;
  timestamp: number;
}

interface CSSCache {
  cache: Record<string, CSSCacheEntry>;
}

function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString(36);

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36);
}

class CSSCacheManager {
  private cache: Record<string, CSSCacheEntry> = {};
  private isLoaded = false;

  private loadCache(): void {
    if (this.isLoaded) return;

    try {
      const cached = localStorage.getItem(CSS_CACHE_KEY);
      if (!cached) return;

      const parsedCache: CSSCache = JSON.parse(cached);

      if (parsedCache.cache) {
        this.cache = parsedCache.cache;
      }
    } catch (error) {
      console.warn("Failed to load CSS cache:", error);
    } finally {
      this.isLoaded = true;
    }
  }

  private saveCache(): void {
    try {
      const cacheData: CSSCache = {
        cache: this.cache,
      };
      localStorage.setItem(CSS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to save CSS cache:", error);
    }
  }

  async getCSS(styleType: StyleType): Promise<string | null> {
    this.loadCache();

    try {
      const url = browserAPI.runtime.getURL(CSS_PATHS[styleType]);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to load ${styleType}: ${response.statusText}`);
      }

      const css = await response.text();
      const currentHash = simpleHash(css);

      const cachedEntry = this.cache[styleType];
      if (cachedEntry && cachedEntry.hash === currentHash) {
        return cachedEntry.content;
      }

      this.cache[styleType] = {
        content: css,
        hash: currentHash,
        timestamp: Date.now(),
      };

      this.saveCache();

      return css;
    } catch (error) {
      console.error(`Failed to load CSS for ${styleType}:`, error);

      const cachedEntry = this.cache[styleType];
      if (cachedEntry) {
        return cachedEntry.content;
      }

      return null;
    }
  }

  hasCSS(styleType: StyleType): boolean {
    this.loadCache();
    return !!this.cache[styleType];
  }

  getCachedCSS(styleType: StyleType): string | null {
    this.loadCache();
    return this.cache[styleType]?.content || null;
  }

  clearCache(): void {
    this.cache = {};
    try {
      localStorage.removeItem(CSS_CACHE_KEY);
    } catch (error) {
      console.warn("Failed to clear CSS cache:", error);
    }
  }

  getCacheStats(): Record<
    string,
    { hash: string; timestamp: number; size: number }
  > {
    this.loadCache();
    const stats: Record<
      string,
      { hash: string; timestamp: number; size: number }
    > = {};

    Object.entries(this.cache).forEach(([key, entry]) => {
      stats[key] = {
        hash: entry.hash,
        timestamp: entry.timestamp,
        size: entry.content.length,
      };
    });

    return stats;
  }
}

const cssCache = new CSSCacheManager();

function injectCSS(css: string, id: string): void {
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }

  const styleElement = document.createElement("style");
  styleElement.id = id;
  styleElement.textContent = css;

  if (document.head) {
    document.head.appendChild(styleElement);
  } else {
    const observer = new MutationObserver(() => {
      if (document.head) {
        document.head.appendChild(styleElement);
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  }
}

export function fastThemeInjection(): void {
  try {
    let themePreference = localStorage.getItem("clutch-theme-preference");

    if (!themePreference) {
      themePreference = "dark";
      localStorage.setItem("clutch-theme-preference", themePreference);
    }

    if (themePreference !== "default") {
      const themeClass = `theme-${themePreference}`;
      document.documentElement.classList.add(themeClass);
    }

    const stylesToInject: StyleType[] = ["unified", "features"];

    if (themePreference !== "default") {
      stylesToInject.push("common");
    }

    stylesToInject.forEach((styleType) => {
      const cachedCSS = cssCache.getCachedCSS(styleType);
      if (cachedCSS) {
        injectCSS(cachedCSS, `clutch-fast-${styleType}`);
      }
    });
  } catch (error) {
    console.error("Fast theme injection failed:", error);
  }
}

export async function enhancedThemeInjection(): Promise<void> {
  try {
    let themePreference = localStorage.getItem("clutch-theme-preference");

    if (!themePreference) {
      themePreference = "dark";
      localStorage.setItem("clutch-theme-preference", themePreference);
    }

    if (themePreference !== "default") {
      const themeClass = `theme-${themePreference}`;
      document.documentElement.classList.add(themeClass);
    }

    const stylesToInject: StyleType[] = ["unified", "features"];

    if (themePreference !== "default") {
      stylesToInject.push("common");
    }

    const cssPromises = stylesToInject.map(async (styleType) => {
      const css = await cssCache.getCSS(styleType);
      if (css) {
        // Double-check current theme preference before injecting
        const currentTheme = localStorage.getItem("clutch-theme-preference");
        if (styleType === "common" && currentTheme === "default") {
          // Don't inject common CSS if theme was switched to default while we were loading
          return {
            styleType,
            success: false,
            reason: "theme_switched_to_default",
          };
        }

        injectCSS(css, `clutch-fast-${styleType}`);
      }
      return { styleType, success: !!css };
    });

    const results = await Promise.all(cssPromises);
    const failed = results.filter((r) => !r.success);

    if (failed.length > 0) {
      console.warn(
        "Failed to load some CSS files:",
        failed.map((f) => f.styleType)
      );
    }
  } catch (error) {
    console.error("Enhanced theme injection failed:", error);
  }
}

function removeCommonCSS(): void {
  console.log("[Theme Debug] removeCommonCSS called");

  // Remove the main common CSS element
  const commonStyleElement = document.getElementById("clutch-fast-common");
  if (commonStyleElement) {
    commonStyleElement.remove();
    console.log("[Theme Debug] Removed main common CSS element");
  } else {
    console.log("[Theme Debug] Main common CSS element not found");
  }

  // Also remove any duplicate common CSS elements that might exist
  const duplicateElements = document.querySelectorAll(
    '[id^="clutch-fast-common"]'
  );
  if (duplicateElements.length > 0) {
    console.log(
      `[Theme Debug] Found ${duplicateElements.length} duplicate common CSS elements`
    );
    duplicateElements.forEach((el) => {
      if (
        el.id === "clutch-fast-common" ||
        el.id.startsWith("clutch-fast-common-")
      ) {
        el.remove();
        console.log(`[Theme Debug] Removed duplicate element: ${el.id}`);
      }
    });
  } else {
    console.log("[Theme Debug] No duplicate common CSS elements found");
  }
}

export function switchTheme(theme: string): void {
  try {
    console.log(`[Theme Debug] Switching to theme: ${theme}`);
    localStorage.setItem("clutch-theme-preference", theme);

    // Remove all theme classes
    document.documentElement.classList.forEach((className) => {
      if (className.startsWith("theme-")) {
        document.documentElement.classList.remove(className);
        console.log(`[Theme Debug] Removed theme class: ${className}`);
      }
    });

    updateShadowRootThemeClasses(theme);

    if (theme === "default") {
      // For default theme: remove common CSS and ensure it stays removed
      console.log("[Theme Debug] Removing common CSS for default theme");
      removeCommonCSS();
    } else {
      // For non-default themes: add theme class and inject common CSS if needed
      const themeClass = `theme-${theme}`;
      document.documentElement.classList.add(themeClass);
      console.log(`[Theme Debug] Added theme class: ${themeClass}`);

      const commonStyleElement = document.getElementById("clutch-fast-common");
      if (!commonStyleElement) {
        console.log("[Theme Debug] Common CSS not found, loading it...");
        cssCache.getCSS("common").then((css) => {
          if (css) {
            // Double-check that we still need common CSS (user might have switched to default in the meantime)
            const currentTheme = localStorage.getItem(
              "clutch-theme-preference"
            );
            if (currentTheme && currentTheme !== "default") {
              console.log("[Theme Debug] Injecting common CSS");
              injectCSS(css, "clutch-fast-common");
            } else {
              console.log(
                "[Theme Debug] Theme switched to default, skipping common CSS injection"
              );
            }
          }
        });
      } else {
        console.log("[Theme Debug] Common CSS already exists");
      }
    }

    applyThemeToAllShadowRoots();
  } catch (error) {
    console.error("Theme switching failed:", error);
  }
}

export function removeAllInjectedCSS(): void {
  try {
    // Remove all clutch-fast style elements
    const stylesToRemove = ["unified", "features"];

    stylesToRemove.forEach((styleType) => {
      const element = document.getElementById(`clutch-fast-${styleType}`);
      if (element) {
        element.remove();
      }
    });

    // Use the helper function to clean up common CSS
    removeCommonCSS();

    // Remove theme classes from document element
    document.documentElement.classList.forEach((className) => {
      if (className.startsWith("theme-")) {
        document.documentElement.classList.remove(className);
      }
    });
  } catch (error) {
    console.error("Failed to remove injected CSS:", error);
  }
}

export { cssCache };

export function clearCSSCache(): void {
  cssCache.clearCache();
}

export function getCacheStats(): Record<
  string,
  { hash: string; timestamp: number; size: number }
> {
  return cssCache.getCacheStats();
}

if (typeof window !== "undefined") {
  (window as any).clutchThemeCache = {
    stats: getCacheStats,
    clear: clearCSSCache,
    get cache() {
      return cssCache;
    },
    forceRefresh: async () => {
      clearCSSCache();
      await enhancedThemeInjection();
    },
  };
}
