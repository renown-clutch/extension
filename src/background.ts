import browserAPI, {
  type RuntimeMessage,
  type MessageSender,
  type SendResponseCallback,
} from "./lib/browserAPI";

const WS_BASE_URL = "wss://api.clutch.lorem.sh/ws";

let socket: WebSocket | null = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;
let heartbeatInterval: number | null = null;
const HEARTBEAT_INTERVAL = 30000;

type RequestCallback = (data: any) => void;
const pendingRequests: Map<string, RequestCallback> = new Map();
let requestId = 0;

const pendingRequestTypes: Map<string, string> = new Map();

async function storePendingRequest(
  requestId: string,
  message: any
): Promise<void> {
  const storageKey = `pending_${requestId}`;
  const data = { [storageKey]: JSON.stringify(message) };
  await browserAPI.storage.local.set(data);
}

async function removePendingRequest(requestId: string): Promise<void> {
  const storageKey = `pending_${requestId}`;

  const data = { [storageKey]: null };
  await browserAPI.storage.local.set(data);
}

async function getAllPendingRequests(): Promise<Record<string, string>> {
  try {
    return (await browserAPI.storage.local.get({})) as Record<string, string>;
  } catch (error) {
    return {};
  }
}

async function processPendingRequest(
  fullKey: string,
  value: string
): Promise<void> {
  const reqId = fullKey.replace("pending_", "");
  try {
    if (!value) return;

    const originalMessage = JSON.parse(value);
    if (originalMessage && originalMessage.type) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(originalMessage));
      }

      await removePendingRequest(reqId);
    }
  } catch (error) {
    await removePendingRequest(reqId);
  }
}

function connectWebSocket() {
  const clientId = `extension_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}`;

  browserAPI.storage.local
    .get("user_steam_id")
    .then((result) => {
      let url = `${WS_BASE_URL}?client_id=${clientId}`;

      const typedResult = result as { user_steam_id?: string };
      if (typedResult.user_steam_id) {
        url += `&steam_id=${typedResult.user_steam_id}`;
      }

      socket = new WebSocket(url);

      socket.onopen = () => {
        isConnected = true;
        reconnectAttempts = 0;

        startHeartbeat();

        try {
          browserAPI.runtime.sendMessage({
            type: "webSocketConnected",
            status: {
              connected: true,
              connectionTime: Date.now(),
            },
          });
        } catch (error) {}

        if (pendingRequests.size > 0) {
          getAllPendingRequests().then((allStorage) => {
            const pendingKeys = Object.keys(allStorage).filter((key) =>
              key.startsWith("pending_")
            );

            pendingKeys.forEach(async (fullKey) => {
              const value = allStorage[fullKey];
              await processPendingRequest(fullKey, value);
            });
          });
        }
      };

      socket.onmessage = handleWebSocketMessage;
      socket.onclose = handleWebSocketClose;
      socket.onerror = handleWebSocketError;
    })
    .catch((error) => {
      console.error("Error retrieving user steam ID:", error);

      const url = `${WS_BASE_URL}?client_id=${clientId}`;
      socket = new WebSocket(url);

      socket.onopen = () => {
        isConnected = true;
        reconnectAttempts = 0;

        startHeartbeat();

        try {
          browserAPI.runtime.sendMessage({
            type: "webSocketConnected",
            status: {
              connected: true,
              connectionTime: Date.now(),
            },
          });
        } catch (error) {}

        if (pendingRequests.size > 0) {
          getAllPendingRequests().then((allStorage) => {
            const pendingKeys = Object.keys(allStorage).filter((key) =>
              key.startsWith("pending_")
            );

            pendingKeys.forEach(async (fullKey) => {
              const value = allStorage[fullKey];
              await processPendingRequest(fullKey, value);
            });
          });
        }
      };

      socket.onmessage = handleWebSocketMessage;
      socket.onclose = handleWebSocketClose;
      socket.onerror = handleWebSocketError;
    });
}

function handleWebSocketMessage(event: MessageEvent) {
  try {
    const message = JSON.parse(event.data);

    if (message.type === "pong") {
      return;
    }

    if (message.requestId && pendingRequests.has(message.requestId)) {
      const callback = pendingRequests.get(message.requestId);
      pendingRequests.delete(message.requestId);
      pendingRequestTypes.delete(message.requestId);

      processWebSocketMessageWithCallback(message, callback);
    } else if (!message.requestId) {
      let matchingRequests: [string, Function][] = [];

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

      const expectedRequestType = responseTypeMap[message.type];

      if (expectedRequestType) {
        for (const [reqId, msgType] of pendingRequestTypes.entries()) {
          if (msgType === expectedRequestType && pendingRequests.has(reqId)) {
            matchingRequests.push([reqId, pendingRequests.get(reqId)!]);
          }
        }

        if (matchingRequests.length > 0) {
          const [reqId, callback] = matchingRequests[0];
          pendingRequests.delete(reqId);
          pendingRequestTypes.delete(reqId);

          processWebSocketMessageWithCallback(
            { type: message.type, data: message.data },
            callback as any
          );
        }
      }
    } else if (message.requestId) {
    }
  } catch (error) {}
}

function processWebSocketMessageWithCallback(
  message: any,
  callback?: (data: any) => void
) {
  if (!callback) return;

  try {
    if (message.type === "error") {
      callback(null);
      return;
    }

    const responseData = message.data || message;

    callback(responseData);
  } catch (error) {
    callback(null);
  }
}

function handleWebSocketClose(event: CloseEvent) {
  isConnected = false;
  stopHeartbeat();

  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    const timeout = RECONNECT_DELAY * reconnectAttempts;
    setTimeout(connectWebSocket, timeout);
  }
}

function handleWebSocketError(event: Event) {}

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "ping" }));
    } else {
      stopHeartbeat();
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function sendWebSocketMessage(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const currentRequestId = `req_${requestId++}_${message.type}`;
    message.requestId = currentRequestId;

    pendingRequestTypes.set(currentRequestId, message.type);

    pendingRequests.set(currentRequestId, (data) => {
      pendingRequestTypes.delete(currentRequestId);
      resolve(data);
      removePendingRequest(currentRequestId).catch((error) => {});
    });

    storePendingRequest(currentRequestId, message).catch((error) => {});

    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      if (!isConnected) {
        connectWebSocket();
      }

      setTimeout(() => {
        if (pendingRequests.has(currentRequestId)) {
          pendingRequests.delete(currentRequestId);
          removePendingRequest(currentRequestId).catch((error) => {});
          reject(new Error("WebSocket request timed out"));
        }
      }, 10000);
    }
  });
}

browserAPI.runtime.onInstalled.addListener(() => {
  connectWebSocket();
});

browserAPI.runtime.onStartup.addListener(() => {
  connectWebSocket();
});

function openPopupWindow() {
  try {
    const isFirefox = typeof browser !== "undefined";

    if (isFirefox) {
      return;
    } else if (typeof chrome !== "undefined") {
      if (chrome.action && typeof chrome.action.openPopup === "function") {
        chrome.action.openPopup();
      }
    }
  } catch (error) {}
}

browserAPI.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    sender: MessageSender,
    sendResponse: SendResponseCallback
  ) => {
    if (message.type === "checkWebSocketStatus") {
      sendResponse({
        connected: isConnected,
        socketState: socket?.readyState,
      });
      return true;
    } else if (message.type === "reconnectWebSocket") {
      if (socket) {
        try {
          socket.close();
        } catch (e) {}
      }
      reconnectAttempts = 0;
      connectWebSocket();
      sendResponse({ success: true });
      return true;
    } else if (message.type === "get_faceit_info" && message.steam_ids) {
      getFaceitInfo(message.steam_ids)
        .then((response) => {
          sendResponse(response);
        })
        .catch((error) => {
          sendResponse({});
        });
      return true;
    } else if (message.type === "fetchFaceitEloByNames") {
      const playerNames = message.playerNames;

      sendWebSocketMessage({
        type: "get_faceit_elo_by_names",
        player_names: playerNames,
      })
        .then((data) => {
          sendResponse({ success: true, data });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          sendResponse({
            success: false,
            error: String(error),
            details: errorMessage,
          });
        });

      return true;
    } else if (message.type === "fetchTeamsMapStats") {
      const team1SteamIds = message.team1SteamIds;
      const team2SteamIds = message.team2SteamIds;

      sendWebSocketMessage({
        type: "get_teams_map_stats",
        team1_steam_ids: team1SteamIds,
        team2_steam_ids: team2SteamIds,
      })
        .then((data) => {
          sendResponse({ success: true, data });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          sendResponse({
            success: false,
            error: String(error),
            details: errorMessage,
          });
        });

      return true;
    } else if (message.type === "fetchUserBans") {
      const steamId = message.steamId;

      sendWebSocketMessage({
        type: "get_user_bans",
        steam_id: steamId,
      })
        .then((data) => {
          sendResponse({ success: true, data });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          sendResponse({
            success: false,
            error: String(error),
            details: errorMessage,
          });
        });

      return true;
    } else if (message.type === "fetchUserDrops") {
      const steamId = message.steamId;

      sendWebSocketMessage({
        type: "get_user_drops",
        steam_id: steamId,
      })
        .then((data) => {
          sendResponse({ success: true, data });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          sendResponse({
            success: false,
            error: String(error),
            details: errorMessage,
          });
        });

      return true;
    } else if (message.type === "fetchProfileData") {
      const steamId = message.steamId;

      sendWebSocketMessage({
        type: "get_profile_data",
        steam_id: steamId,
      })
        .then((data) => {
          sendResponse({ success: true, data });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          sendResponse({
            success: false,
            error: String(error),
            details: errorMessage,
          });
        });

      return true;
    } else if (message.type === "fetchUsersRanks") {
      const steamIds = message.steamIds;

      sendWebSocketMessage({
        type: "get_users_ranks",
        steam_ids: steamIds,
      })
        .then((data) => {
          sendResponse({ success: true, data });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          sendResponse({
            success: false,
            error: String(error),
            details: errorMessage,
          });
        });

      return true;
    } else if (message.action === "openPopup") {
      openPopupWindow();
      sendResponse({ success: true });
      return true;
    } else if (message.type === "fetchPlayersStats") {
      const steamIds = message.steamIds;

      sendWebSocketMessage({
        type: "get_players_stats",
        steam_ids: steamIds,
      })
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => {
          sendResponse({ success: false, error: String(error) });
        });
      return true;
    } else if (message.type === "fetchUserLastMatches") {
      const steamId = message.steamId;
      const limit = message.limit || 3;

      sendWebSocketMessage({
        type: "get_user_last_matches",
        steam_id: steamId,
        limit: limit,
      })
        .then((data) => {
          sendResponse({ success: true, data });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          sendResponse({
            success: false,
            error: String(error),
            details: errorMessage,
          });
        });

      return true;
    } else if (message.type === "fetchLiveMatches") {
      sendWebSocketMessage({
        type: "get_live_matches",
      })
        .then((data) => {
          sendResponse({ success: true, data });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          sendResponse({
            success: false,
            error: String(error),
            details: errorMessage,
          });
        });

      return true;
    }
  }
);

async function getFaceitInfo(steamIds: string[]): Promise<Record<string, any>> {
  try {
    const response = await sendWebSocketMessage({
      type: "get_users_faceit_elo_and_url",
      steam_ids: steamIds,
    });

    return response || {};
  } catch (error) {
    return {};
  }
}
