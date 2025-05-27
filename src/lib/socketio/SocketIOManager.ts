import browserAPI from "../browserAPI";
import { config } from "../../config";
import { MessageHandler } from "../socketio/MessageHandler";
import { StorageService } from "../storage/StorageService";
import { io, Socket } from "socket.io-client";

export class SocketIOManager {
  private socket: Socket | null = null;
  private _isConnected = false;
  private reconnectAttempts = 0;
  private clientId: string;
  private messageHandler: MessageHandler;
  private storageService: StorageService;

  constructor(clientId: string) {
    this.clientId = clientId;
    this.messageHandler = new MessageHandler();
    this.storageService = new StorageService();

    this.storageService.performComprehensiveCleanup().catch((error) => {
      console.warn(
        "[SocketIOManager] Failed to perform storage cleanup:",
        error
      );
    });
  }

  public connect(steamId?: string): void {
    this.closeExistingConnection();
    this.connectWithFallback(steamId, 0);
  }

  public reconnect(): void {
    this.closeExistingConnection();
    this.reconnectAttempts = 0;
    this.connectWithFallback();
  }

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public getSocketState(): string | undefined {
    return this.socket?.connected
      ? "OPEN"
      : this.socket?.disconnected
      ? "CLOSED"
      : "CONNECTING";
  }

  public sendMessage(eventName: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        console.warn(
          `[SocketIOManager] ❌ Cannot send message - socket not connected:`,
          {
            event: eventName,
            socketExists: !!this.socket,
            socketConnected: this.socket?.connected,
            isConnected: this.isConnected,
          }
        );

        if (!this.isConnected) {
          this.connect();
        }
        reject(new Error("Socket.IO not connected"));
        return;
      }

      const requestId = this.storageService.generateRequestId(eventName);

      this.storageService.storePendingRequest(
        requestId,
        { type: eventName, ...data },
        resolve
      );

      try {
        this.socket.emit(eventName, data);
      } catch (error) {
        console.error(
          `[SocketIOManager] ❌ Error emitting event: ${eventName}`,
          {
            error,
            requestId,
            data,
          }
        );
        this.storageService.removePendingRequest(requestId);
        reject(error);
      }

      setTimeout(() => {
        if (this.storageService.hasPendingRequest(requestId)) {
          console.warn(
            `[SocketIOManager] ⏰ Request timed out for event: ${eventName}`,
            {
              requestId,
              data,
              timeout: 10000,
            }
          );
          this.storageService.removePendingRequest(requestId);
          reject(new Error("Socket.IO request timed out"));
        }
      }, 10000);
    });
  }

  public sendChatMessage(username: string, message: string): boolean {
    if (!this.socket || !this.socket.connected) {
      console.warn(
        `[SocketIOManager] ❌ Cannot send chat message - socket not connected`
      );
      return false;
    }

    try {
      this.socket.emit("send_chat_message", {
        username,
        message,
      });

      return true;
    } catch (error) {
      console.error("[SocketIOManager] ❌ Error sending chat message:", error);
      return false;
    }
  }

  public getRecentMessages(limit: number): boolean {
    if (!this.socket || !this.socket.connected) {
      console.warn(
        `[SocketIOManager] ❌ Cannot get recent messages - socket not connected`
      );
      return false;
    }

    try {
      this.socket.emit("get_recent_messages", {
        limit,
      });

      return true;
    } catch (error) {
      console.error(
        "[SocketIOManager] ❌ Error getting recent messages:",
        error
      );
      return false;
    }
  }

  private getSocketUrl(): string {
    const { stagingUrl, productionUrl, useStaging } = config.socketio;
    return useStaging ? stagingUrl : productionUrl;
  }

  private getAuthData(steamId?: string): any {
    const auth: any = {
      client_id: this.clientId,
    };

    if (steamId) {
      auth.steam_id = steamId;
    }

    return auth;
  }

  private closeExistingConnection(): void {
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (error) {
        console.error("[SocketIOManager] Error closing socket:", error);
      }

      this.socket = null;
    }
  }

  private setupSocketEventHandlers(attempt: number): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this._isConnected = true;
      this.reconnectAttempts = 0;

      try {
        browserAPI.runtime.sendMessage(
          {
            type: "webSocketConnected",
            status: {
              connected: true,
              connectionTime: Date.now(),
            },
          },
          () => {
            // Silently handle "Receiving end does not exist" error
            const lastError =
              typeof chrome !== "undefined"
                ? chrome.runtime.lastError
                : typeof browser !== "undefined"
                ? browser.runtime.lastError
                : null;
            if (lastError) {
              // This is expected when extension is reloading or no listeners exist
              return;
            }
          }
        );
      } catch (error) {
        // Silently handle connection errors during extension reload
        console.warn(
          `[SocketIOManager] ⚠️ Failed to send connection status:`,
          error
        );
      }

      this.processPendingRequests();
    });

    this.socket.on("disconnect", (reason) => {
      this._isConnected = false;

      if (reason === "io server disconnect") {
        console.log(
          `[SocketIOManager] 🔄 Server initiated disconnect, scheduling reconnect`
        );
        this.scheduleReconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      this._isConnected = false;

      if (
        error.message.includes("xhr poll error") ||
        error.message.includes("CORS")
      ) {
        console.log(
          `[SocketIOManager] 🔄 Detected XHR/CORS error, will retry with different transport`
        );
      }
    });

    this.socket.on("chat_message_sent", (data) => {
      this.messageHandler.handleSocketIOMessage(
        {
          type: "chat_message",
          data: data.data,
        },
        this.storageService
      );
    });

    this.socket.on("chat_message", (data) => {
      this.messageHandler.handleSocketIOMessage(
        {
          type: "chat_message",
          data: data.data || data,
        },
        this.storageService
      );
    });

    this.socket.on("new_chat_message", (data) => {
      this.messageHandler.handleSocketIOMessage(
        {
          type: "chat_message",
          data: data.data || data,
        },
        this.storageService
      );
    });

    this.socket.on("recent_messages", (data) => {
      this.messageHandler.handleSocketIOMessage(
        {
          type: "recent_messages",
          data: data.data,
        },
        this.storageService
      );
    });

    const apiEvents = [
      "faceit_data",
      "user_bans",
      "user_drops",
      "users_ranks",
      "users_faceit_data",
      "profile_data",
      "player_matchup",
      "teams_map_stats",
      "players_stats",
      "user_last_matches",
      "live_matches",
      "faceit_elo_by_names",
      "user_renown_stats",
    ];

    apiEvents.forEach((eventName) => {
      this.socket!.on(eventName, (data) => {
        this.messageHandler.handleSocketIOMessage(
          {
            type: eventName,
            data: data.data || data,
          },
          this.storageService
        );
      });
    });

    this.socket.on("error", (error) => {
      console.error(`[SocketIOManager] ❌ SOCKET ERROR:`, {
        error,
        attempt: attempt + 1,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private scheduleReconnect(): void {
    const { maxReconnectAttempts, reconnectDelay } = config.socketio;
    if (this.reconnectAttempts < maxReconnectAttempts) {
      this.reconnectAttempts++;
      const timeout = reconnectDelay * this.reconnectAttempts;

      setTimeout(() => this.connect(), timeout);
    }
  }

  private async processPendingRequests(): Promise<void> {
    const pendingRequests = await this.storageService.getAllPendingRequests();

    for (const [key, value] of Object.entries(pendingRequests)) {
      if (key.startsWith("pending_")) {
        if (value === null) {
          try {
            await browserAPI.storage.local.remove(key);
          } catch (error) {
            console.error(
              `[SocketIOManager] ❌ Error cleaning up null entry ${key}:`,
              error
            );
          }
          continue;
        }

        if (value) {
          const reqId = key.replace("pending_", "");

          try {
            const message = JSON.parse(value);

            if (
              message &&
              message.type &&
              this.socket &&
              this.socket.connected
            ) {
              const { type, ...data } = message;
              this.socket.emit(type, data);
            }
          } catch (error) {
            console.error(
              `[SocketIOManager] ❌ Error processing pending request ${reqId}:`,
              error
            );
            this.storageService.removePendingRequest(reqId);
          }
        }
      }
    }
  }

  private connectWithFallback(steamId?: string, attempt: number = 0): void {
    const socketUrl = this.getSocketUrl();
    const auth = this.getAuthData(steamId);

    const connectionOptions: any = {
      auth,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: config.socketio.maxReconnectAttempts,
      reconnectionDelay: config.socketio.reconnectDelay,
      timeout: 10000,
      withCredentials: false,
      forceNew: true,
      engineIoVersion: 4,
      query: auth,
    };

    if (attempt === 0) {
      connectionOptions.transports = ["websocket"];
      connectionOptions.upgrade = false;
    } else if (attempt === 1) {
      connectionOptions.transports = ["polling"];
      connectionOptions.upgrade = false;
    } else {
      connectionOptions.transports = ["websocket", "polling"];
      connectionOptions.upgrade = true;
      connectionOptions.rememberUpgrade = true;
    }

    try {
      this.socket = io(socketUrl, connectionOptions);
      this.setupSocketEventHandlers(attempt);
    } catch (error) {
      console.error(
        `[SocketIOManager] Failed connection attempt ${attempt + 1}:`,
        error
      );
      if (attempt < 2) {
        setTimeout(() => this.connectWithFallback(steamId, attempt + 1), 2000);
      } else {
        this.scheduleReconnect();
      }
    }
  }
}
