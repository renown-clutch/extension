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

      if (message.type === "chat_message_sent") {
        // First try to resolve any pending send_chat_message request
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

        // Also handle as a regular chat message for UI updates
        if (message.data) {
          if (!this.isDuplicateMessage(message.data)) {
            this.forwardMessageToTabs({
              type: "chat_message",
              data: message.data,
            });
          }
        }
        return;
      }

      if (message.type === "recent_messages") {
        // For recent_messages, we only forward to tabs since content script
        // no longer expects data from the direct response callback
        this.forwardMessageToTabs(message);

        // Clean up any pending request without resolving the callback
        const matchingRequest = storageService.getResponseHandlerForType(
          message.type
        );
        if (matchingRequest) {
          const [reqId] = matchingRequest;
          storageService.removePendingRequest(reqId);
        }

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
        }
      }
    } catch (error) {
      console.error("[MessageHandler] ❌ Error handling message:", {
        messageType: message.type,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private isDuplicateMessage(messageData: any): boolean {
    const { username, message: content, timestamp } = messageData;

    if (username && content) {
      const messageId = `${username}_${content}_${timestamp || Date.now()}`;

      if (this.processedMessageIds.has(messageId)) {
        return true;
      }

      this.processedMessageIds.add(messageId);

      if (this.processedMessageIds.size > config.deduplication.messageLimit) {
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
    // Query only the active tab in the current window
    browserAPI.tabs.query(
      { active: true, currentWindow: true },
      (tabs: Array<{ id?: number; url?: string; active?: boolean }>) => {
        if (tabs.length === 0) {
          return;
        }

        // Send message to the active tab only
        const activeTab = tabs[0];
        if (activeTab.id) {
          browserAPI.tabs.sendMessage(activeTab.id, message, () => {
            // Silently handle "Receiving end does not exist" error
            const lastError =
              typeof chrome !== "undefined"
                ? chrome.runtime.lastError
                : typeof browser !== "undefined"
                ? browser.runtime.lastError
                : null;
            if (lastError) {
              return;
            }
          });
        }
      }
    );
  }

  private processMessageWithCallback(
    message: any,
    callback?: (data: any) => void
  ): void {
    if (!callback) {
      return;
    }

    try {
      if (message.type === "error") {
        callback(null);
        return;
      }
      const responseData = message.data || message;

      callback(responseData);
    } catch (error) {
      console.error("[MessageHandler] ❌ Error processing callback:", {
        messageType: message.type,
        timestamp: new Date().toISOString(),
      });

      if (callback) {
        callback(null);
      }
    }
  }
}
