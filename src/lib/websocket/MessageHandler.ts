import browserAPI from "../browserAPI";
import { config } from "../../config";
import { StorageService } from "../storage/StorageService";

export class MessageHandler {
  private processedMessageIds = new Set<string>();

  constructor() {}

  public handleMessage(
    event: MessageEvent,
    storageService: StorageService
  ): void {
    try {
      const message = JSON.parse(event.data);
      console.log("[MessageHandler] Received WebSocket message:", message);

      if (message.type === "pong") {
        return;
      }

      if (message.type === "chat_message" && message.data) {
        if (this.isDuplicateMessage(message.data)) {
          return;
        }

        this.forwardMessageToTabs(message);
        return;
      }

      // Handle recent messages
      if (message.type === "recent_messages") {
        this.forwardMessageToTabs(message);
        return;
      }

      // Handle responses with requestId
      if (
        message.requestId &&
        storageService.hasPendingRequest(message.requestId)
      ) {
        const callback = storageService.getPendingRequest(message.requestId);
        storageService.removePendingRequest(message.requestId);

        this.processMessageWithCallback(message, callback);
        return;
      }

      // Handle responses without requestId but with a matching request type
      if (!message.requestId) {
        const matchingRequest = storageService.getResponseHandlerForType(
          message.type
        );

        if (matchingRequest) {
          const [reqId, callback] = matchingRequest;
          storageService.removePendingRequest(reqId);

          this.processMessageWithCallback(
            { type: message.type, data: message.data },
            callback
          );
        }
      }
    } catch (error) {
      console.error("[MessageHandler] Error handling message:", error);
    }
  }

  private isDuplicateMessage(messageData: any): boolean {
    const { username, message: content, timestamp } = messageData;

    if (username && content) {
      const messageId = `${username}_${content}_${timestamp || Date.now()}`;

      // If we've already processed this exact message recently, skip it
      if (this.processedMessageIds.has(messageId)) {
        console.log("[MessageHandler] Skipping duplicate message:", messageId);
        return true;
      }

      // Add to processed messages
      this.processedMessageIds.add(messageId);

      // Limit the size of our tracking set
      if (this.processedMessageIds.size > config.deduplication.messageLimit) {
        // Remove the oldest entries (convert to array, slice, and convert back to set)
        const messagesArray = Array.from(this.processedMessageIds);
        this.processedMessageIds.clear();
        messagesArray
          .slice(-config.deduplication.messageLimit / 2)
          .forEach((id) => this.processedMessageIds.add(id));
      }
    }

    return false;
  }

  private forwardMessageToTabs(message: any): void {
    console.log(
      "[MessageHandler] Forwarding message to content script:",
      message
    );

    browserAPI.tabs.query(
      { active: true, currentWindow: true },
      (tabs: Array<{ id?: number }>) => {
        if (tabs[0]?.id) {
          console.log("[MessageHandler] Sending to tab:", tabs[0].id);
          browserAPI.tabs.sendMessage(tabs[0].id, message);
        } else {
          console.error("[MessageHandler] No active tab found");
        }
      }
    );
  }

  private processMessageWithCallback(
    message: any,
    callback?: (data: any) => void
  ): void {
    if (!callback) return;

    try {
      if (message.type === "error") {
        callback(null);
        return;
      }

      const responseData = message.data || message;
      callback(responseData);
    } catch (error) {
      console.error("[MessageHandler] Error processing callback:", error);
      if (callback) {
        callback(null);
      }
    }
  }
}
