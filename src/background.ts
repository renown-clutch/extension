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

async function initialize() {
  try {
    const { steamId } = await getUserInfo();
    socketIOManager.connect(steamId || undefined);
  } catch (error) {
    console.error("[Chat Background] Error initializing:", error);
    socketIOManager.connect();
  }
}

browserAPI.runtime.onInstalled.addListener(initialize);
browserAPI.runtime.onStartup.addListener(initialize);

browserAPI.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    sender: MessageSender,
    sendResponse: SendResponseCallback
  ) => {
    if (message.type === "checkWebSocketStatus") {
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
      socketIOManager
        .sendChatMessage(message.username, message.message)
        .then((success) => {
          sendResponse({ success });
        })
        .catch((error) => {
          console.error("[Background] ❌ sendChatMessage error:", error);
          sendResponse({ success: false });
        });
      return true;
    } else if (message.type === "get_recent_messages") {
      console.log("[Background] 📨 get_recent_messages request received:", {
        limit: message.limit,
        timestamp: Date.now(),
        senderId: sender.id,
        senderUrl: sender.url,
        senderTab: sender.tab?.id,
      });

      socketIOManager
        .getRecentMessages(message.limit || 50)
        .then((success) => {
          console.log("[Background] ✅ getRecentMessages completed:", {
            success,
          });
          sendResponse({ success });
        })
        .catch((error) => {
          console.error("[Background] ❌ getRecentMessages error:", error);
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
          console.error("[Background] ❌ getFaceitInfo error:", error);
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
          console.error("[Background] ❌ fetchFaceitEloByNames error:", error);
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
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
          console.error("[Background] ❌ fetchTeamsMapStats error:", error);
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
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
          console.error("[Background] ❌ fetchUserBans error:", error);
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
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
          console.error("[Background] ❌ fetchUserDrops error:", error);
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
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
          console.error("[Background] ❌ fetchProfileData error:", error);
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
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
          console.error("[Background] ❌ fetchUsersRanks error:", error);
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
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
          console.error("[Background] ❌ fetchPlayersStats error:", error);
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
          console.error("[Background] ❌ fetchUserLastMatches error:", error);
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
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
          console.error("[Background] ❌ fetchLiveMatches error:", error);
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
          });
        });
      return true;
    } else if (message.action === "openPopup") {
      try {
        const isFirefox = typeof browser !== "undefined";
        if (!isFirefox && typeof chrome !== "undefined") {
          if (chrome.action && typeof chrome.action.openPopup === "function") {
            chrome.action.openPopup();
          }
        }
        sendResponse({ success: true });
      } catch (error) {
        console.error("[Background] ❌ Error opening popup:", error);
        sendResponse({ success: false });
      }
      return true;
    } else {
      console.warn("[Background] ⚠️ Unknown message type:", {
        type: message.type,
        action: message.action,
      });
    }
  }
);
