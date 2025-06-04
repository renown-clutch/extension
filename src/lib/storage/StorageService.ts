import browserAPI from "../browserAPI";

type RequestCallback = (data: any) => void;

export class StorageService {
  private pendingRequests: Map<string, RequestCallback> = new Map();
  private pendingRequestTypes: Map<string, string> = new Map();
  private requestId = 0;

  constructor() {}

  public generateRequestId(type: string): string {
    return `req_${this.requestId++}_${type}`;
  }

  public async storePendingRequest(
    requestId: string,
    message: any,
    callback: RequestCallback
  ): Promise<void> {
    this.pendingRequests.set(requestId, callback);
    this.pendingRequestTypes.set(requestId, message.type);

    const storageKey = `pending_${requestId}`;
    const data = { [storageKey]: JSON.stringify(message) };

    try {
      await browserAPI.storage.local.set(data);
    } catch (error) {
      console.error("[StorageService] Error storing pending request:", error);
    }
  }

  public async removePendingRequest(requestId: string): Promise<void> {
    this.pendingRequests.delete(requestId);
    this.pendingRequestTypes.delete(requestId);

    const storageKey = `pending_${requestId}`;

    try {
      await browserAPI.storage.local.remove(storageKey);
    } catch (error) {
      console.error("[StorageService] Error removing pending request:", error);
    }
  }

  public hasPendingRequest(requestId: string): boolean {
    return this.pendingRequests.has(requestId);
  }

  public getPendingRequest(requestId: string): RequestCallback | undefined {
    return this.pendingRequests.get(requestId);
  }

  public getPendingRequestType(requestId: string): string | undefined {
    return this.pendingRequestTypes.get(requestId);
  }

  public async getAllPendingRequests(): Promise<Record<string, string>> {
    try {
      return (await browserAPI.storage.local.get({})) as Record<string, string>;
    } catch (error) {
      console.error(
        "[StorageService] Error getting all pending requests:",
        error
      );
      return {};
    }
  }

  public async cleanupNullStorageEntries(): Promise<void> {
    try {
      const allStorage = (await browserAPI.storage.local.get({})) as Record<
        string,
        any
      >;
      const nullKeys: string[] = [];

      for (const [key, value] of Object.entries(allStorage)) {
        if (key.startsWith("pending_") && value === null) {
          nullKeys.push(key);
        }
      }

      if (nullKeys.length > 0) {
        await browserAPI.storage.local.remove(nullKeys);
      }
    } catch (error) {
      console.error(
        "[StorageService] Error cleaning up null storage entries:",
        error
      );
    }
  }

  public async performComprehensiveCleanup(): Promise<void> {
    try {
      let allStorage: Record<string, any> = {};

      try {
        allStorage = (await browserAPI.storage.local.get(
          null as any
        )) as Record<string, any>;
      } catch (error) {
        allStorage = (await browserAPI.storage.local.get({})) as Record<
          string,
          any
        >;
      }

      const keysToRemove: string[] = [];

      const legitimateKeys = new Set([
        "userSettings",
        "userSteamId",
        "clutchLastMatchesExpanded",
        "clutchChatMinimized",
      ]);

      for (const [key, value] of Object.entries(allStorage)) {
        let shouldKeep = false;

        if (legitimateKeys.has(key)) {
          shouldKeep = true;
        }

        if (!shouldKeep) {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await browserAPI.storage.local.remove(keysToRemove);
      }
    } catch (error) {
      console.error(
        "[StorageService] Error during comprehensive cleanup:",
        error
      );
    }
  }

  public async logStorageUsage(): Promise<void> {
    try {
      const allStorage = (await browserAPI.storage.local.get(
        null as any
      )) as Record<string, any>;
      console.log(`[StorageService] Current storage:`, {
        keys: Object.keys(allStorage),
        count: Object.keys(allStorage).length,
      });
    } catch (error) {
      console.error("[StorageService] Error logging storage usage:", error);
    }
  }

  public getResponseHandlerForType(
    messageType: string
  ): [string, RequestCallback] | null {
    const responseTypeMap: Record<string, string> = {
      users_faceit_data: "get_users_faceit_elo_and_url",
      faceit_data: "get_faceit_info",
      user_bans: "get_user_bans",
      user_drops: "get_user_drops",
      profile_data: "get_profile_data",
      users_ranks: "get_users_ranks",
      faceit_elo_by_names: "get_faceit_elo_by_names",
      steam_ids_by_names: "get_steam_ids_by_names",
      user_last_matches: "get_user_last_matches",
      live_matches: "get_live_matches",
      player_matchup: "get_player_matchup",
      teams_map_stats: "get_teams_map_stats",
      players_stats: "get_players_stats",
      recent_messages: "get_recent_messages",
      matches_with_banned_players: "get_matches_with_banned_players",
    };

    const expectedRequestType = responseTypeMap[messageType];

    if (!expectedRequestType) {
      return null;
    }

    for (const [reqId, msgType] of this.pendingRequestTypes.entries()) {
      if (msgType === expectedRequestType && this.pendingRequests.has(reqId)) {
        return [reqId, this.pendingRequests.get(reqId)!];
      }
    }

    return null;
  }
}
