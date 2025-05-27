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

export function switchTheme(theme: string): void {
  try {
    localStorage.setItem("clutch-theme-preference", theme);

    document.documentElement.classList.forEach((className) => {
      if (className.startsWith("theme-")) {
        document.documentElement.classList.remove(className);
      }
    });

    updateShadowRootThemeClasses(theme);

    if (theme === "default") {
      const commonStyleElement = document.getElementById("clutch-fast-common");
      if (commonStyleElement) {
        commonStyleElement.remove();
      }
    } else {
      const themeClass = `theme-${theme}`;
      document.documentElement.classList.add(themeClass);
      const commonStyleElement = document.getElementById("clutch-fast-common");
      if (!commonStyleElement) {
        cssCache.getCSS("common").then((css) => {
          if (css) {
            injectCSS(css, "clutch-fast-common");
          }
        });
      }
    }

    applyThemeToAllShadowRoots();
  } catch (error) {
    console.error("Theme switching failed:", error);
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
