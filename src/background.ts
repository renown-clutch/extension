import browserAPI, {
  type RuntimeMessage,
  type MessageSender,
  type SendResponseCallback,
} from "./lib/browserAPI";
import { getUserInfo } from "./steamId/steamIdParser";
import { WebSocketManager } from "./lib/websocket/WebSocketManager";
import { APIService } from "./lib/api/APIService";

// Initialize services
const clientId = crypto.randomUUID();
const webSocketManager = new WebSocketManager(clientId);
const apiService = new APIService(webSocketManager);

// Initialize app
async function initialize() {
  try {
    const { steamId } = await getUserInfo();
    webSocketManager.connect(steamId || undefined);
  } catch (error) {
    console.error("[Chat Background] Error initializing:", error);
    webSocketManager.connect();
  }
}

// Event listeners
browserAPI.runtime.onInstalled.addListener(initialize);
browserAPI.runtime.onStartup.addListener(initialize);

// Message handling
browserAPI.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    sender: MessageSender,
    sendResponse: SendResponseCallback
  ) => {
    // WebSocket status requests
    if (message.type === "checkWebSocketStatus") {
      sendResponse({
        connected: webSocketManager.isConnected,
        socketState: webSocketManager.getSocketState(),
      });
      return true;
    }

    // WebSocket reconnection request
    else if (message.type === "reconnectWebSocket") {
      webSocketManager.reconnect();
      sendResponse({ success: true });
      return true;
    }

    // Chat related requests
    else if (message.type === "send_chat_message") {
      const success = webSocketManager.sendChatMessage(
        message.username,
        message.message
      );
      sendResponse({ success });
      return true;
    } else if (message.type === "get_recent_messages") {
      const success = webSocketManager.getRecentMessages(message.limit || 50);
      sendResponse({ success });
      return true;
    }

    // Faceit and other data requests
    else if (message.type === "get_faceit_info" && message.steam_ids) {
      apiService
        .getFaceitInfo(message.steam_ids)
        .then((response) => sendResponse(response))
        .catch(() => sendResponse({}));
      return true;
    } else if (message.type === "fetchFaceitEloByNames") {
      apiService
        .getFaceitEloByNames(message.playerNames)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
          })
        );
      return true;
    } else if (message.type === "fetchTeamsMapStats") {
      apiService
        .getTeamsMapStats(message.team1SteamIds, message.team2SteamIds)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
          })
        );
      return true;
    } else if (message.type === "fetchUserBans") {
      apiService
        .getUserBans(message.steamId)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
          })
        );
      return true;
    } else if (message.type === "fetchUserDrops") {
      apiService
        .getUserDrops(message.steamId)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
          })
        );
      return true;
    } else if (message.type === "fetchProfileData") {
      apiService
        .getProfileData(message.steamId)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
          })
        );
      return true;
    } else if (message.type === "fetchUsersRanks") {
      apiService
        .getUsersRanks(message.steamIds)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
          })
        );
      return true;
    } else if (message.type === "fetchPlayersStats") {
      apiService
        .getPlayersStats(message.steamIds)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: String(error),
          })
        );
      return true;
    } else if (message.type === "fetchUserLastMatches") {
      apiService
        .getUserLastMatches(message.steamId, message.limit || 3)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
          })
        );
      return true;
    } else if (message.type === "fetchLiveMatches") {
      apiService
        .getLiveMatches()
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: String(error),
            details: error instanceof Error ? error.message : String(error),
          })
        );
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
        sendResponse({ success: false });
      }
      return true;
    }
  }
);
