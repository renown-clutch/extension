import browserAPI, {
  type RuntimeMessage,
  type MessageSender,
  type SendResponseCallback,
} from "./lib/browserAPI";
import { getUserInfo } from "./steamId/steamIdParser";
import { SocketIOManager } from "./lib/socketio/SocketIOManager";
import { SocketIOAPIService } from "./lib/api/SocketIOAPIService";

const clientId = crypto.randomUUID();
const socketIOManager = new SocketIOManager(clientId);
const apiService = new SocketIOAPIService(socketIOManager);

// Don't initialize immediately on install/startup - wait for content script to notify us
// browserAPI.runtime.onInstalled.addListener(initialize);
// browserAPI.runtime.onStartup.addListener(initialize);

let hasInitialized = false;

async function initializeWithSteamId(steamId: string) {
  if (hasInitialized) {
    console.log("[Chat Background] ⚠️ Already initialized, skipping...");
    return;
  }

  try {
    console.log(
      "[Chat Background] 🚀 Initializing connection with Steam ID:",
      steamId
    );
    hasInitialized = true;
    socketIOManager.connect(steamId);
  } catch (error) {
    console.error(
      "[Chat Background] ❌ Error initializing with Steam ID:",
      error
    );
    hasInitialized = false;
  }
}

async function waitForValidSteamId(
  maxAttempts = 10,
  delayMs = 2000
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `[Chat Background] 🔍 Checking for Steam ID (attempt ${attempt}/${maxAttempts})`
      );

      const { steamId } = await getUserInfo();

      if (steamId && steamId.trim() !== "") {
        console.log(`[Chat Background] ✅ Found valid Steam ID: ${steamId}`);
        return steamId;
      }

      console.log(
        `[Chat Background] ⏳ Steam ID not available yet, waiting ${delayMs}ms...`
      );

      // Wait before next attempt (except on last attempt)
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.warn(
        `[Chat Background] ❌ Error getting Steam ID (attempt ${attempt}):`,
        error
      );

      // Wait before next attempt (except on last attempt)
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.warn(
    `[Chat Background] ⚠️ Failed to get Steam ID after ${maxAttempts} attempts`
  );
  return null;
}

// Helper function to check if we can make API requests
function canMakeAPIRequests(): boolean {
  return socketIOManager.hasSteamId();
}

// Helper function to provide consistent error response when Steam ID is not available
function steamIdNotAvailableResponse() {
  return {
    success: false,
    error: "Steam ID not available yet - extension is still initializing",
  };
}

browserAPI.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    sender: MessageSender,
    sendResponse: SendResponseCallback
  ) => {
    const handleMessage = async () => {
      if (message.type === "initializeWithSteamId") {
        if (message.steamId) {
          await initializeWithSteamId(message.steamId);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "No Steam ID provided" });
        }
        return true;
      } else if (message.type === "checkWebSocketStatus") {
        const response = {
          connected: socketIOManager.isConnected,
          socketState: socketIOManager.getSocketState(),
        };

        sendResponse(response);
        return true;
      } else if (message.type === "reconnectWebSocket") {
        socketIOManager.reconnect();
        sendResponse({ success: true });
        return true;
      } else if (message.type === "send_chat_message") {
        try {
          const success = await socketIOManager.sendChatMessage(
            message.username,
            message.message
          );
          sendResponse({ success });
        } catch (error) {
          console.error("[Background] ❌ sendChatMessage error");
          sendResponse({ success: false });
        }
        return true;
      } else if (message.type === "get_recent_messages") {
        socketIOManager
          .getRecentMessages(message.limit || 50)
          .then((success) => {
            sendResponse({ success });
          })
          .catch((error) => {
            console.error("[Background] ❌ getRecentMessages error");
            sendResponse({ success: false });
          });
        return true;
      } else if (message.type === "get_faceit_info" && message.steam_ids) {
        apiService
          .getFaceitInfo(message.steam_ids)
          .then((response) => {
            sendResponse(response);
          })
          .catch((error) => {
            console.error("[Background] ❌ getFaceitInfo error");
            sendResponse({});
          });
        return true;
      } else if (message.type === "fetchFaceitEloByNames") {
        apiService
          .getFaceitEloByNames(message.playerNames)
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error("[Background] ❌ fetchFaceitEloByNames error");
            sendResponse({
              success: false,
              error: String(error),
            });
          });
        return true;
      } else if (message.type === "getSteamIdsByNames") {
        apiService
          .getSteamIdsByNames(message.playerNames)
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error("[Background] ❌ getSteamIdsByNames error");
            sendResponse({
              success: false,
              error: String(error),
            });
          });
        return true;
      } else if (message.type === "fetchTeamsMapStats") {
        apiService
          .getTeamsMapStats(message.team1SteamIds, message.team2SteamIds)
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error("[Background] ❌ fetchTeamsMapStats error");
            sendResponse({
              success: false,
              error: String(error),
            });
          });
        return true;
      } else if (message.type === "fetchUserBans") {
        apiService
          .getUserBans(message.steamId)
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error("[Background] ❌ fetchUserBans error");
            sendResponse({
              success: false,
              error: String(error),
            });
          });
        return true;
      } else if (message.type === "fetchUserDrops") {
        apiService
          .getUserDrops(message.steamId)
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error("[Background] ❌ fetchUserDrops error");
            sendResponse({
              success: false,
              error: String(error),
            });
          });
        return true;
      } else if (message.type === "fetchProfileData") {
        apiService
          .getProfileData(message.steamId)
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error("[Background] ❌ fetchProfileData error");
            sendResponse({
              success: false,
              error: String(error),
            });
          });
        return true;
      } else if (message.type === "fetchUsersRanks") {
        apiService
          .getUsersRanks(message.steamIds)
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error("[Background] ❌ fetchUsersRanks error");
            sendResponse({
              success: false,
              error: String(error),
            });
          });
        return true;
      } else if (message.type === "fetchPlayersStats") {
        apiService
          .getPlayersStats(message.steamIds)
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error("[Background] ❌ fetchPlayersStats error");
            sendResponse({
              success: false,
              error: String(error),
            });
          });
        return true;
      } else if (message.type === "fetchUserLastMatches") {
        apiService
          .getUserLastMatches(message.steamId, message.limit || 3)
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error("[Background] ❌ fetchUserLastMatches error");
            sendResponse({
              success: false,
              error: String(error),
            });
          });
        return true;
      } else if (message.type === "fetchLiveMatches") {
        apiService
          .getLiveMatches()
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error("[Background] ❌ fetchLiveMatches error");
            sendResponse({
              success: false,
              error: String(error),
            });
          });
        return true;
      } else if (message.action === "openPopup") {
        try {
          const isFirefox = typeof browser !== "undefined";
          if (!isFirefox && typeof chrome !== "undefined") {
            if (
              chrome.action &&
              typeof chrome.action.openPopup === "function"
            ) {
              chrome.action.openPopup();
            }
          }
          sendResponse({ success: true });
        } catch (error) {
          console.error("[Background] ❌ Error opening popup");
          sendResponse({ success: false });
        }
        return true;
      } else if (message.type === "getCurrentUserSteamId") {
        try {
          const { steamId } = await getUserInfo();
          sendResponse({ steamId });
        } catch (error) {
          console.error("[Background] ❌ Error getting current user steam ID");
          sendResponse({ steamId: null });
        }
        return true;
      } else if (message.type === "get_player_matchup") {
        try {
          const response = await apiService.getPlayerMatchup(
            message.player1SteamId,
            message.player2SteamId
          );
          sendResponse(response);
        } catch (error) {
          console.error("[Background] ❌ Error getting player matchup");
          sendResponse({ error: String(error) });
        }
        return true;
      } else if (message.type === "get_matches_with_banned_players") {
        console.log(
          "[Background] 🚀 Processing get_matches_with_banned_players request:",
          message.match_ids
        );
        try {
          const response = await apiService.getMatchesWithBannedPlayers(
            message.match_ids
          );
          console.log(
            "[Background] 📥 Received response from API service:",
            response
          );
          sendResponse(response);
        } catch (error) {
          console.error(
            "[Background] ❌ Error getting matches with banned players:",
            error
          );
          sendResponse({ success: false, error: String(error) });
        }
        return true;
      } else {
        console.warn("[Background] ⚠️ Unknown message type:", {
          type: message.type,
          action: message.action,
        });
      }
    };

    handleMessage();
    return true;
  }
);
