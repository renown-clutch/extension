import { WebSocketManager } from "../websocket/WebSocketManager";

export class APIService {
  private webSocketManager: WebSocketManager;

  constructor(webSocketManager: WebSocketManager) {
    this.webSocketManager = webSocketManager;
  }

  public async getFaceitInfo(steamIds: string[]): Promise<Record<string, any>> {
    try {
      const response = await this.webSocketManager.sendMessage({
        type: "get_users_faceit_elo_and_url",
        steam_ids: steamIds,
      });

      return response || {};
    } catch (error) {
      console.error("[APIService] Error getting Faceit info:", error);
      return {};
    }
  }

  public async getFaceitEloByNames(playerNames: string[]): Promise<any> {
    return this.webSocketManager.sendMessage({
      type: "get_faceit_elo_by_names",
      player_names: playerNames,
    });
  }

  public async getTeamsMapStats(
    team1SteamIds: string[],
    team2SteamIds: string[]
  ): Promise<any> {
    return this.webSocketManager.sendMessage({
      type: "get_teams_map_stats",
      team1_steam_ids: team1SteamIds,
      team2_steam_ids: team2SteamIds,
    });
  }

  public async getUserBans(steamId: string): Promise<any> {
    return this.webSocketManager.sendMessage({
      type: "get_user_bans",
      steam_id: steamId,
    });
  }

  public async getUserDrops(steamId: string): Promise<any> {
    return this.webSocketManager.sendMessage({
      type: "get_user_drops",
      steam_id: steamId,
    });
  }

  public async getProfileData(steamId: string): Promise<any> {
    return this.webSocketManager.sendMessage({
      type: "get_profile_data",
      steam_id: steamId,
    });
  }

  public async getUsersRanks(steamIds: string[]): Promise<any> {
    return this.webSocketManager.sendMessage({
      type: "get_users_ranks",
      steam_ids: steamIds,
    });
  }

  public async getPlayersStats(steamIds: string[]): Promise<any> {
    return this.webSocketManager.sendMessage({
      type: "get_players_stats",
      steam_ids: steamIds,
    });
  }

  public async getUserLastMatches(
    steamId: string,
    limit: number
  ): Promise<any> {
    return this.webSocketManager.sendMessage({
      type: "get_user_last_matches",
      steam_id: steamId,
      limit,
    });
  }

  public async getLiveMatches(): Promise<any> {
    return this.webSocketManager.sendMessage({
      type: "get_live_matches",
    });
  }
}
