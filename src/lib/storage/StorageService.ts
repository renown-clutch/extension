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
    // Store callback in memory
    this.pendingRequests.set(requestId, callback);
    this.pendingRequestTypes.set(requestId, message.type);

    // Persist the request to storage
    const storageKey = `pending_${requestId}`;
    const data = { [storageKey]: JSON.stringify(message) };

    try {
      await browserAPI.storage.local.set(data);
    } catch (error) {
      console.error("[StorageService] Error storing pending request:", error);
    }
  }

  public async removePendingRequest(requestId: string): Promise<void> {
    // Remove from memory
    this.pendingRequests.delete(requestId);
    this.pendingRequestTypes.delete(requestId);

    // Remove from storage
    const storageKey = `pending_${requestId}`;

    try {
      await browserAPI.storage.local.set({ [storageKey]: null });
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
      user_last_matches: "get_user_last_matches",
      live_matches: "get_live_matches",
      player_matchup: "get_player_matchup",
      teams_map_stats: "get_teams_map_stats",
      players_stats: "get_players_stats",
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
