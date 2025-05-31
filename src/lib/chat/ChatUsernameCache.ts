import browserAPI from "../browserAPI";

interface CachedUser {
  steamId: string;
  timestamp: number;
  lastSeen: number;
}

interface PendingRequest {
  username: string;
  timestamp: number;
}

export class ChatUsernameCache {
  private cache: Map<string, CachedUser> = new Map();
  private pendingRequests: Set<string> = new Set();
  private batchQueue: PendingRequest[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private initialized = false;

  // Cache settings
  private readonly CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly BATCH_DELAY_MS = 2000; // 2 seconds
  private readonly MAX_BATCH_SIZE = 20;
  private readonly STORAGE_KEY = "chatUsernameCache";

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await browserAPI.storage.local.get(this.STORAGE_KEY);
      if (stored[this.STORAGE_KEY]) {
        const data = JSON.parse(stored[this.STORAGE_KEY]);
        const now = Date.now();

        // Load cache and filter out expired entries
        Object.entries(data).forEach(([username, userData]: [string, any]) => {
          if (
            userData.timestamp &&
            now - userData.timestamp < this.CACHE_EXPIRY_MS
          ) {
            this.cache.set(username, userData);
          }
        });
      }
      this.initialized = true;
    } catch (error) {
      console.warn("[ChatUsernameCache] Failed to load cache:", error);
      this.initialized = true;
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const cacheData: Record<string, CachedUser> = {};
      this.cache.forEach((value, key) => {
        cacheData[key] = value;
      });

      await browserAPI.storage.local.set({
        [this.STORAGE_KEY]: JSON.stringify(cacheData),
      });
    } catch (error) {
      console.warn("[ChatUsernameCache] Failed to save cache:", error);
    }
  }

  /**
   * Get Steam ID for username if cached, otherwise queue for batch request
   */
  public async getSteamId(username: string): Promise<string | null> {
    await this.initialize();

    const cached = this.cache.get(username);
    if (cached) {
      // Update last seen timestamp
      cached.lastSeen = Date.now();
      return cached.steamId;
    }

    // Queue for batch request if not already pending
    this.queueForBatch(username);
    return null;
  }

  /**
   * Check if username is cached (synchronous)
   */
  public hasCached(username: string): boolean {
    return this.cache.has(username);
  }

  /**
   * Get cached Steam ID immediately (synchronous)
   */
  public getCachedSteamId(username: string): string | null {
    const cached = this.cache.get(username);
    if (cached) {
      cached.lastSeen = Date.now();
      return cached.steamId;
    }
    return null;
  }

  /**
   * Queue username for batch Steam ID request
   */
  private queueForBatch(username: string): void {
    if (this.pendingRequests.has(username)) {
      return;
    }

    this.pendingRequests.add(username);
    this.batchQueue.push({
      username,
      timestamp: Date.now(),
    });

    // Clear existing timeout and set new one
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY_MS);

    // Process immediately if batch is full
    if (this.batchQueue.length >= this.MAX_BATCH_SIZE) {
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }
      this.processBatch();
    }
  }

  /**
   * Process batch request for Steam IDs
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return;
    }

    const usernamesToFetch = [...this.batchQueue.map((req) => req.username)];
    this.batchQueue = [];

    try {
      const response = await browserAPI.runtime.sendMessage({
        type: "getSteamIdsByNames",
        playerNames: usernamesToFetch,
      });

      if (response?.success && response?.data) {
        const now = Date.now();
        const steamIdData = response.data as Record<string, string>;

        // Update cache with results
        Object.entries(steamIdData).forEach(([username, steamId]) => {
          if (steamId) {
            this.cache.set(username, {
              steamId,
              timestamp: now,
              lastSeen: now,
            });
          }
        });

        // Save updated cache
        await this.saveCache();

        // Trigger update for any pending chat messages
        this.notifyUsernameResolved(steamIdData);
      }
    } catch (error) {
      console.error("[ChatUsernameCache] Batch request failed:", error);
    } finally {
      // Clear pending requests
      usernamesToFetch.forEach((username) => {
        this.pendingRequests.delete(username);
      });
    }
  }

  /**
   * Manually add username-steamid mapping to cache
   */
  public addToCache(username: string, steamId: string): void {
    const now = Date.now();
    this.cache.set(username, {
      steamId,
      timestamp: now,
      lastSeen: now,
    });
    this.saveCache();
  }

  /**
   * Preload Steam IDs for usernames (for background prefetching)
   */
  public async preloadUsernames(usernames: string[]): Promise<void> {
    const uncachedUsernames = usernames.filter(
      (username) => !this.cache.has(username)
    );

    if (uncachedUsernames.length === 0) {
      return;
    }

    uncachedUsernames.forEach((username) => {
      this.queueForBatch(username);
    });
  }

  /**
   * Clean expired entries from cache
   */
  public async cleanExpiredCache(): Promise<void> {
    const now = Date.now();
    let hasChanges = false;

    this.cache.forEach((userData, username) => {
      if (now - userData.timestamp > this.CACHE_EXPIRY_MS) {
        this.cache.delete(username);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      await this.saveCache();
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    cacheSize: number;
    pendingRequests: number;
    queueSize: number;
  } {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      queueSize: this.batchQueue.length,
    };
  }

  /**
   * Notify that usernames have been resolved (for UI updates)
   */
  private notifyUsernameResolved(steamIdData: Record<string, string>): void {
    // Dispatch custom event that chat can listen to
    const event = new CustomEvent("chatUsernamesResolved", {
      detail: steamIdData,
    });
    document.dispatchEvent(event);
  }
}

// Global instance
export const chatUsernameCache = new ChatUsernameCache();
