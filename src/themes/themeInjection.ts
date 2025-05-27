import {
  applyThemeToAllShadowRoots,
  updateShadowRootThemeClasses,
} from "./shadowThemeManager";
import browserAPI from "../lib/browserAPI";

// CSS cache configuration
const CSS_CACHE_KEY = "clutch-css-cache";

// CSS file paths
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

// Simple and fast hash function for CSS content
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString(36);

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to base36 for shorter string and make it positive
  return Math.abs(hash).toString(36);
}

// Lightweight CSS cache manager with hash-based invalidation
class CSSCacheManager {
  private cache: Record<string, CSSCacheEntry> = {};
  private isLoaded = false;

  // Load cache from localStorage
  private loadCache(): void {
    if (this.isLoaded) return;

    try {
      const cached = localStorage.getItem(CSS_CACHE_KEY);
      if (!cached) return;

      const parsedCache: CSSCache = JSON.parse(cached);

      // Load cache if it exists and has the right structure
      if (parsedCache.cache) {
        this.cache = parsedCache.cache;
      }
    } catch (error) {
      console.warn("Failed to load CSS cache:", error);
    } finally {
      this.isLoaded = true;
    }
  }

  // Save cache to localStorage
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

  // Get CSS from cache or load from network with hash validation
  async getCSS(styleType: StyleType): Promise<string | null> {
    this.loadCache();

    try {
      // Always fetch to check for changes
      const url = browserAPI.runtime.getURL(CSS_PATHS[styleType]);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to load ${styleType}: ${response.statusText}`);
      }

      const css = await response.text();
      const currentHash = simpleHash(css);

      // Check if we have cached version with same hash
      const cachedEntry = this.cache[styleType];
      if (cachedEntry && cachedEntry.hash === currentHash) {
        // Content hasn't changed, return cached version
        return cachedEntry.content;
      }

      // Content has changed or no cache exists, update cache
      this.cache[styleType] = {
        content: css,
        hash: currentHash,
        timestamp: Date.now(),
      };

      this.saveCache();

      console.log(`CSS updated for ${styleType}, new hash: ${currentHash}`);
      return css;
    } catch (error) {
      console.error(`Failed to load CSS for ${styleType}:`, error);

      // Fallback to cached version if network fails
      const cachedEntry = this.cache[styleType];
      if (cachedEntry) {
        console.log(`Using cached CSS for ${styleType} due to network error`);
        return cachedEntry.content;
      }

      return null;
    }
  }

  // Check if CSS is available in cache (for fast injection)
  hasCSS(styleType: StyleType): boolean {
    this.loadCache();
    return !!this.cache[styleType];
  }

  // Get cached CSS content without network check (for fast injection)
  getCachedCSS(styleType: StyleType): string | null {
    this.loadCache();
    return this.cache[styleType]?.content || null;
  }

  // Clear the cache (useful for development/debugging)
  clearCache(): void {
    this.cache = {};
    try {
      localStorage.removeItem(CSS_CACHE_KEY);
    } catch (error) {
      console.warn("Failed to clear CSS cache:", error);
    }
  }

  // Get cache stats for debugging
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

// Global cache manager instance
const cssCache = new CSSCacheManager();

// Inject CSS into document head
function injectCSS(css: string, id: string): void {
  // Remove existing style element
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }

  // Create new style element
  const styleElement = document.createElement("style");
  styleElement.id = id;
  styleElement.textContent = css;

  // Insert into head
  if (document.head) {
    document.head.appendChild(styleElement);
  } else {
    // Wait for head to be available
    const observer = new MutationObserver(() => {
      if (document.head) {
        document.head.appendChild(styleElement);
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  }
}

// Fast theme injection - runs immediately with cached CSS (no network calls)
export function fastThemeInjection(): void {
  try {
    const themePreference = localStorage.getItem("clutch-theme-preference");
    if (!themePreference) return;

    // Apply theme class immediately
    if (themePreference !== "default") {
      const themeClass = `theme-${themePreference}`;
      document.documentElement.classList.add(themeClass);
    }

    // Inject cached CSS immediately (synchronous, no network calls)
    const stylesToInject: StyleType[] = ["unified", "features"];

    // Add common styles for non-default themes
    if (themePreference !== "default") {
      stylesToInject.push("common");
    }

    stylesToInject.forEach((styleType) => {
      const cachedCSS = cssCache.getCachedCSS(styleType);
      if (cachedCSS) {
        injectCSS(cachedCSS, `clutch-fast-${styleType}`);
      }
    });

    console.log("Fast theme injection applied:", themePreference);
  } catch (error) {
    console.error("Fast theme injection failed:", error);
  }
}

// Enhanced theme injection - loads CSS with hash validation
export async function enhancedThemeInjection(): Promise<void> {
  try {
    const themePreference = localStorage.getItem("clutch-theme-preference");
    if (!themePreference) return;

    // Apply theme class
    if (themePreference !== "default") {
      const themeClass = `theme-${themePreference}`;
      document.documentElement.classList.add(themeClass);
    }

    // Load and inject all required CSS with hash validation
    const stylesToInject: StyleType[] = ["unified", "features"];

    if (themePreference !== "default") {
      stylesToInject.push("common");
    }

    // Load CSS files (with hash-based cache validation)
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

    console.log("Enhanced theme injection completed:", themePreference);
  } catch (error) {
    console.error("Enhanced theme injection failed:", error);
  }
}

// Simple theme switching function
export function switchTheme(theme: string): void {
  try {
    // Save to localStorage
    localStorage.setItem("clutch-theme-preference", theme);

    // Remove existing theme classes from document
    document.documentElement.classList.forEach((className) => {
      if (className.startsWith("theme-")) {
        document.documentElement.classList.remove(className);
      }
    });

    // Update shadow root theme classes
    updateShadowRootThemeClasses(theme);

    // Handle common styles based on theme
    const commonStyleElement = document.getElementById("clutch-fast-common");

    if (theme === "default") {
      // Remove common styles for default theme
      if (commonStyleElement) {
        commonStyleElement.remove();
      }
    } else {
      // Apply new theme class to document
      const themeClass = `theme-${theme}`;
      document.documentElement.classList.add(themeClass);

      // Load and inject common styles if not present
      if (!commonStyleElement) {
        cssCache.getCSS("common").then((css) => {
          if (css) {
            injectCSS(css, "clutch-fast-common");
          }
        });
      }
    }

    // Apply theme to all registered shadow roots
    applyThemeToAllShadowRoots();

    console.log("Theme switched to:", theme);
  } catch (error) {
    console.error("Theme switching failed:", error);
  }
}

// Export cache manager and utility functions for external use
export { cssCache };

// Utility function to clear CSS cache (useful for development)
export function clearCSSCache(): void {
  cssCache.clearCache();
}

// Utility function to get cache statistics (useful for debugging)
export function getCacheStats(): Record<
  string,
  { hash: string; timestamp: number; size: number }
> {
  return cssCache.getCacheStats();
}

// Expose cache utilities to window for development/debugging
if (typeof window !== "undefined") {
  (window as any).clutchThemeCache = {
    stats: getCacheStats,
    clear: clearCSSCache,
    get cache() {
      return cssCache;
    },
    // Force refresh all CSS (useful during development)
    forceRefresh: async () => {
      clearCSSCache();
      await enhancedThemeInjection();
      console.log("Theme cache cleared and CSS refreshed");
    },
  };
}
