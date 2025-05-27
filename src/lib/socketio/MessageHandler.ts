import browserAPI from "../browserAPI";
import { config } from "../../config";
import { StorageService } from "../storage/StorageService";

export class MessageHandler {
  private processedMessageIds = new Set<string>();

  constructor() {}

  public handleSocketIOMessage(
    message: any,
    storageService: StorageService
  ): void {
    try {
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

      if (message.type === "recent_messages") {
        this.forwardMessageToTabs(message);
        return;
      }

      if (
        message.requestId &&
        storageService.hasPendingRequest(message.requestId)
      ) {
        const callback = storageService.getPendingRequest(message.requestId);
        storageService.removePendingRequest(message.requestId);

        this.processMessageWithCallback(message, callback);
        return;
      }

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
        } else {
          console.log(
            "[MessageHandler] ❌ No matching request found for type:",
            message.type
          );
        }
      }
    } catch (error) {
      console.error("[MessageHandler] ❌ Error handling message:", {
        error,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private isDuplicateMessage(messageData: any): boolean {
    const { username, message: content, timestamp } = messageData;

    if (username && content) {
      const messageId = `${username}_${content}_${timestamp || Date.now()}`;

      if (this.processedMessageIds.has(messageId)) {
        console.log("[MessageHandler] 🔄 Skipping duplicate message:", {
          messageId,
          username,
          content:
            content.substring(0, 50) + (content.length > 50 ? "..." : ""),
          timestamp,
        });
        return true;
      }

      this.processedMessageIds.add(messageId);

      if (this.processedMessageIds.size > config.deduplication.messageLimit) {
        console.log("[MessageHandler] 🧹 Cleaning up processed messages set:", {
          currentSize: this.processedMessageIds.size,
          limit: config.deduplication.messageLimit,
        });

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
    browserAPI.tabs.query(
      { active: true, currentWindow: true },
      (tabs: Array<{ id?: number }>) => {
        if (tabs[0]?.id) {
          browserAPI.tabs.sendMessage(tabs[0].id, message, () => {
            // Silently handle "Receiving end does not exist" error
            const lastError =
              typeof chrome !== "undefined"
                ? chrome.runtime.lastError
                : typeof browser !== "undefined"
                ? browser.runtime.lastError
                : null;
            if (lastError) {
              // This is expected when tabs are closed or content scripts aren't loaded
              return;
            }
          });
        } else {
          console.error(
            "[MessageHandler] ❌ No active tab found for message forwarding"
          );
        }
      }
    );
  }

  private processMessageWithCallback(
    message: any,
    callback?: (data: any) => void
  ): void {
    if (!callback) {
      console.warn("[MessageHandler] ⚠️ No callback provided for message");
      return;
    }

    try {
      if (message.type === "error") {
        console.error(
          "[MessageHandler] ❌ Error message received, calling callback with null"
        );
        callback(null);
        return;
      }
      const responseData = message.data || message;
      callback(responseData);
    } catch (error) {
      console.error("[MessageHandler] ❌ Error processing callback:", {
        error,
        messageType: message.type,
        timestamp: new Date().toISOString(),
      });

      if (callback) {
        callback(null);
      }
    }
  }
}
