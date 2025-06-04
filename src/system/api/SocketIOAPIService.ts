import { SocketIOManager } from "./socketio/SocketIOManager";

export class SocketIOAPIService {
  private socketIOManager: SocketIOManager;

  constructor(socketIOManager: SocketIOManager) {
    this.socketIOManager = socketIOManager;
  }

  public async getFaceitInfo(steamIds: string[]): Promise<any> {
    return this.socketIOManager.sendMessage("get_users_faceit_elo_and_url", {
      steam_ids: steamIds,
    });
  }

  public async getFaceitEloByNames(playerNames: string[]): Promise<any> {
    return this.socketIOManager.sendMessage("get_faceit_elo_by_names", {
      player_names: playerNames,
    });
  }

  public async getSteamIdsByNames(playerNames: string[]): Promise<any> {
    return this.socketIOManager.sendMessage("get_steam_ids_by_names", {
      player_names: playerNames,
    });
  }

  public async getTeamsMapStats(
    team1SteamIds: string[],
    team2SteamIds: string[]
  ): Promise<any> {
    return this.socketIOManager.sendMessage("get_teams_map_stats", {
      team1_steam_ids: team1SteamIds,
      team2_steam_ids: team2SteamIds,
    });
  }

  public async getUserBans(steamId: string): Promise<any> {
    return this.socketIOManager.sendMessage("get_user_bans", {
      steam_id: steamId,
    });
  }

  public async getUserDrops(steamId: string): Promise<any> {
    return this.socketIOManager.sendMessage("get_user_drops", {
      steam_id: steamId,
    });
  }

  public async getProfileData(steamId: string): Promise<any> {
    return this.socketIOManager.sendMessage("get_profile_data", {
      steam_id: steamId,
    });
  }

  public async getUsersRanks(steamIds: string[]): Promise<any> {
    return this.socketIOManager.sendMessage("get_users_ranks", {
      steam_ids: steamIds,
    });
  }

  public async getPlayersStats(steamIds: string[]): Promise<any> {
    return this.socketIOManager.sendMessage("get_players_stats", {
      steam_ids: steamIds,
    });
  }

  public async getUserLastMatches(
    steamId: string,
    limit: number
  ): Promise<any> {
    return this.socketIOManager.sendMessage("get_user_last_matches", {
      steam_id: steamId,
      limit,
    });
  }

  public async getLiveMatches(): Promise<any> {
    return this.socketIOManager.sendMessage("get_live_matches", {});
  }

  async getPlayerMatchup(
    player1SteamId: string,
    player2SteamId: string
  ): Promise<any> {
    return this.socketIOManager.sendMessage("get_player_matchup", {
      player1_steam_id: player1SteamId,
      player2_steam_id: player2SteamId,
    });
  }

  async getMatchesWithBannedPlayers(matchIds: number[]): Promise<any> {
    return this.socketIOManager.sendMessage("get_matches_with_banned_players", {
      match_ids: matchIds,
    });
  }
}
