import browserAPI from "../browserAPI";
import { config } from "../../config";
import { MessageHandler } from "../websocket/MessageHandler";
import { StorageService } from "../storage/StorageService";

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private _isConnected = false;
  private reconnectAttempts = 0;
  private heartbeatInterval: number | null = null;
  private baseUrl = "";
  private clientId: string;
  private messageHandler: MessageHandler;
  private storageService: StorageService;

  constructor(clientId: string) {
    this.clientId = clientId;
    this.messageHandler = new MessageHandler();
    this.storageService = new StorageService();
  }

  public connect(steamId?: string): void {
    this.closeExistingConnection();

    const wsUrl = this.getWebSocketUrl(steamId);
    this.baseUrl = wsUrl;

    try {
      this.socket = new WebSocket(wsUrl);
      this.setupSocketEventHandlers();
    } catch (error) {
      console.error("[WebSocketManager] Failed to connect:", error);
      this.scheduleReconnect();
    }
  }

  public reconnect(): void {
    this.closeExistingConnection();
    this.reconnectAttempts = 0;
    this.connect();
  }

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public getSocketState(): number | undefined {
    return this.socket?.readyState;
  }

  public sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        if (!this.isConnected) {
          this.connect();
        }
        reject(new Error("WebSocket not connected"));
        return;
      }

      const requestId = this.storageService.generateRequestId(message.type);
      message.requestId = requestId;

      this.storageService.storePendingRequest(requestId, message, resolve);

      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        this.storageService.removePendingRequest(requestId);
        reject(error);
      }

      // Set timeout for request
      setTimeout(() => {
        if (this.storageService.hasPendingRequest(requestId)) {
          this.storageService.removePendingRequest(requestId);
          reject(new Error("WebSocket request timed out"));
        }
      }, 10000);
    });
  }

  public sendChatMessage(username: string, message: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    const wsMessage = {
      type: "send_chat_message",
      username,
      message,
    };

    try {
      this.socket.send(JSON.stringify(wsMessage));
      return true;
    } catch (error) {
      console.error("[WebSocketManager] Error sending chat message:", error);
      return false;
    }
  }

  public getRecentMessages(limit: number): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    const wsMessage = {
      type: "get_recent_messages",
      limit,
    };

    try {
      this.socket.send(JSON.stringify(wsMessage));
      return true;
    } catch (error) {
      console.error("[WebSocketManager] Error getting recent messages:", error);
      return false;
    }
  }

  private getWebSocketUrl(steamId?: string): string {
    const { stagingUrl, productionUrl, useStaging } = config.websocket;
    const baseUrl = useStaging ? stagingUrl : productionUrl;

    if (steamId) {
      return `${baseUrl}?client_id=${this.clientId}&steam_id=${steamId}`;
    }

    return `${baseUrl}?client_id=${this.clientId}`;
  }

  private closeExistingConnection(): void {
    if (this.socket) {
      try {
        if (
          this.socket.readyState !== WebSocket.CLOSED &&
          this.socket.readyState !== WebSocket.CLOSING
        ) {
          this.socket.onclose = null; // Remove reconnect handler
          this.socket.close();
        }
      } catch (error) {
        console.error("[WebSocketManager] Error closing socket:", error);
      }

      this.socket = null;
    }

    this.stopHeartbeat();
  }

  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this._isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();

      try {
        browserAPI.runtime.sendMessage({
          type: "webSocketConnected",
          status: {
            connected: true,
            connectionTime: Date.now(),
          },
        });
      } catch (error) {
        // Ignore errors from sendMessage
      }

      this.processPendingRequests();
    };

    this.socket.onmessage = (event) => {
      this.messageHandler.handleMessage(event, this.storageService);
    };

    this.socket.onclose = () => {
      this._isConnected = false;
      this.stopHeartbeat();
      this.scheduleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error("[WebSocketManager] Socket error:", error);
    };
  }

  private scheduleReconnect(): void {
    const { maxReconnectAttempts, reconnectDelay } = config.websocket;

    if (this.reconnectAttempts < maxReconnectAttempts) {
      this.reconnectAttempts++;
      const timeout = reconnectDelay * this.reconnectAttempts;

      setTimeout(() => this.connect(), timeout);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (
        this.isConnected &&
        this.socket &&
        this.socket.readyState === WebSocket.OPEN
      ) {
        this.socket.send(JSON.stringify({ type: "ping" }));
      } else {
        this.stopHeartbeat();
      }
    }, config.websocket.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async processPendingRequests(): Promise<void> {
    const pendingRequests = await this.storageService.getAllPendingRequests();

    for (const [key, value] of Object.entries(pendingRequests)) {
      if (key.startsWith("pending_") && value) {
        const reqId = key.replace("pending_", "");

        try {
          const message = JSON.parse(value);

          if (
            message &&
            message.type &&
            this.socket &&
            this.socket.readyState === WebSocket.OPEN
          ) {
            this.socket.send(JSON.stringify(message));
          }
        } catch (error) {
          // Remove invalid pending requests
          this.storageService.removePendingRequest(reqId);
        }
      }
    }
  }
}
