import browserAPI from "$system/lib/browserAPI";
import { config } from "$core/config";
import { MessageHandler } from "./MessageHandler";
import { StorageService } from "../storage/StorageService";
import { io, Socket } from "socket.io-client";

interface QueuedRequest {
  eventName: string;
  data: any;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timestamp: number;
  requestId: string;
}

export class SocketIOManager {
  private socket: Socket | null = null;
  private _isConnected = false;
  private reconnectAttempts = 0;
  private clientId: string;
  private steamId: string | null = null;
  private messageHandler: MessageHandler;
  private storageService: StorageService;
  private requestQueue: QueuedRequest[] = [];
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;

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
    if (!steamId) {
      console.error(
        "[SocketIOManager] ❌ Cannot connect without Steam ID - backend requires it"
      );
      return;
    }

    this.steamId = steamId; // Store the Steam ID for reconnections
    this.closeExistingConnection();
    this.createConnectionPromise();
    this.connectWithFallback(steamId, 0);
  }

  public reconnect(): void {
    if (!this.steamId) {
      console.error(
        "[SocketIOManager] ❌ Cannot reconnect without Steam ID - backend requires it"
      );
      return;
    }

    this.closeExistingConnection();
    this.reconnectAttempts = 0;
    this.createConnectionPromise();
    this.connectWithFallback(this.steamId, 0);
  }

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public hasSteamId(): boolean {
    return this.steamId !== null;
  }

  public getSteamId(): string | null {
    return this.steamId;
  }

  public getSocketState(): string | undefined {
    return this.socket?.connected
      ? "OPEN"
      : this.socket?.disconnected
      ? "CLOSED"
      : "CONNECTING";
  }

  public async sendMessage(eventName: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = this.storageService.generateRequestId(eventName);

      const queuedRequest: QueuedRequest = {
        eventName,
        data,
        resolve,
        reject,
        timestamp: Date.now(),
        requestId,
      };

      // If socket is connected, send immediately
      if (this.socket && this.socket.connected) {
        this.sendQueuedRequest(queuedRequest);
        return;
      }

      // If not connected, queue the request
      console.log(`[SocketIOManager] 📋 Queueing request:`, {
        event: eventName,
        clientId: this.clientId,
        queueSize: this.requestQueue.length + 1,
      });

      this.requestQueue.push(queuedRequest);

      // Set timeout for queued requests
      setTimeout(() => {
        const index = this.requestQueue.findIndex(
          (req) => req.requestId === requestId
        );
        if (index !== -1) {
          console.warn(`[SocketIOManager] ⏰ Queued request timed out:`, {
            event: eventName,
            clientId: this.clientId,
            queuePosition: index,
          });
          this.requestQueue.splice(index, 1);
          reject(new Error("Socket.IO request timed out in queue"));
        }
      }, 30000);

      // Don't auto-connect here - wait for Steam ID to be available
      // The connection will be initiated by the content script via initializeWithSteamId
      if (!this.connectionPromise && !this.isConnected && !this.steamId) {
        console.log(
          `[SocketIOManager] ⏳ Request queued, waiting for Steam ID to initialize connection`
        );
      } else if (!this.connectionPromise && !this.isConnected && this.steamId) {
        console.log(
          `[SocketIOManager] 🔄 Auto-connecting with available Steam ID due to queued request`
        );
        this.connect(this.steamId);
      }
    });
  }

  public async sendChatMessage(
    username: string,
    message: string
  ): Promise<boolean> {
    try {
      if (!this.socket || !this.socket.connected) {
        return false;
      }

      // Directly emit chat message without waiting for response
      this.socket.emit("send_chat_message", {
        username,
        message,
      });

      return true;
    } catch (error) {
      console.error("[SocketIOManager] ❌ Error sending chat message");
      return false;
    }
  }

  public async getRecentMessages(limit: number): Promise<boolean> {
    try {
      await this.sendMessage("get_recent_messages", {
        limit,
      });
      return true;
    } catch (error) {
      console.error("[SocketIOManager] ❌ Error getting recent messages");
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

    // Clear connection state
    this._isConnected = false;
    this.connectionPromise = null;
    this.connectionResolve = null;
  }

  private setupSocketEventHandlers(attempt: number): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this._isConnected = true;
      this.reconnectAttempts = 0;

      console.log(
        `[SocketIOManager] ✅ Socket connected, processing ${this.requestQueue.length} queued requests`
      );

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
        console.warn(`[SocketIOManager] ⚠️ Failed to send connection status`);
      }

      // Resolve connection promise
      if (this.connectionResolve) {
        this.connectionResolve();
        this.connectionResolve = null;
        this.connectionPromise = null;
      }

      // Process queued requests first
      this.processQueuedRequests();

      // Then process any pending requests from storage
      this.processPendingRequests();
    });

    this.socket.on("disconnect", (reason) => {
      this._isConnected = false;

      // Clear connection promise on disconnect
      this.connectionPromise = null;
      this.connectionResolve = null;

      console.log(
        `[SocketIOManager] 🔌 Socket disconnected, ${this.requestQueue.length} requests in queue`
      );

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
          type: "chat_message_sent",
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

    // Handle all API events
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
      "steam_ids_by_names",
      "user_renown_stats",
      "matches_with_banned_players",
    ];

    apiEvents.forEach((eventName) => {
      this.socket!.on(eventName, (data) => {
        console.log(`[SocketIOManager] 📥 Received ${eventName} event`, data);

        // Add specific logging for our new event
        if (eventName === "matches_with_banned_players") {
          console.log(
            `[SocketIOManager] 🔍 Matches with banned players response:`,
            data
          );
        }

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

      setTimeout(() => {
        if (this.steamId) {
          this.connect(this.steamId);
        } else {
          console.error(
            `[SocketIOManager] ❌ Cannot schedule reconnect without Steam ID - backend requires it`
          );
        }
      }, timeout);
    } else {
      console.error(
        `[SocketIOManager] ❌ Max reconnect attempts reached (${maxReconnectAttempts})`
      );
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

  private createConnectionPromise(): void {
    this.connectionPromise = new Promise<void>((resolve) => {
      this.connectionResolve = resolve;
    });
  }

  private sendQueuedRequest(queuedRequest: QueuedRequest): void {
    const { eventName, data, requestId } = queuedRequest;

    this.storageService.storePendingRequest(
      requestId,
      { type: eventName, ...data },
      queuedRequest.resolve
    );

    try {
      console.log(`[SocketIOManager] 📤 Emitting ${eventName} event`);
      this.socket!.emit(eventName, data);
    } catch (error) {
      console.error(`[SocketIOManager] ❌ Error emitting event: ${eventName}`, {
        clientId: this.clientId,
        requestId,
      });
      this.storageService.removePendingRequest(requestId);
      queuedRequest.reject(error);
    }

    setTimeout(() => {
      if (this.storageService.hasPendingRequest(requestId)) {
        console.warn(`[SocketIOManager] ⏰ Request timed out:`, {
          event: eventName,
          clientId: this.clientId,
          requestId,
        });
        this.storageService.removePendingRequest(requestId);
        queuedRequest.reject(new Error("Socket.IO request timed out"));
      }
    }, 10000);
  }

  private processQueuedRequests(): void {
    if (this.requestQueue.length === 0) {
      return;
    }

    console.log(
      `[SocketIOManager] 📤 Processing ${this.requestQueue.length} queued requests`
    );

    const queueToProcess = [...this.requestQueue];
    this.requestQueue = [];

    queueToProcess.forEach((queuedRequest, index) => {
      try {
        console.log(
          `[SocketIOManager] 📤 Sending queued request ${index + 1}/${
            queueToProcess.length
          }: ${queuedRequest.eventName}`
        );
        this.sendQueuedRequest(queuedRequest);
      } catch (error) {
        console.error(`[SocketIOManager] ❌ Error processing queued request:`, {
          event: queuedRequest.eventName,
          clientId: this.clientId,
        });
        queuedRequest.reject(error);
      }
    });
  }
}
