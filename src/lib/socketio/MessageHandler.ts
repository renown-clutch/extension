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
        console.log("[MessageHandler] 📨 Processing recent_messages:", {
          messageCount: Array.isArray(message.data) ? message.data.length : 0,
          hasData: !!message.data,
          timestamp: Date.now(),
          firstMessage:
            Array.isArray(message.data) && message.data.length > 0
              ? {
                  username: message.data[0].username,
                  timestamp: message.data[0].timestamp,
                }
              : null,
          lastMessage:
            Array.isArray(message.data) && message.data.length > 0
              ? {
                  username: message.data[message.data.length - 1].username,
                  timestamp: message.data[message.data.length - 1].timestamp,
                }
              : null,
        });

        // For recent_messages, we only forward to tabs since content script
        // no longer expects data from the direct response callback
        console.log(
          "[MessageHandler] 📤 Forwarding recent_messages to tabs (skipping callback resolution)"
        );
        this.forwardMessageToTabs(message);

        // Clean up any pending request without resolving the callback
        const matchingRequest = storageService.getResponseHandlerForType(
          message.type
        );
        if (matchingRequest) {
          console.log(
            "[MessageHandler] 🧹 Cleaning up pending request without callback:",
            {
              requestId: matchingRequest[0],
            }
          );
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
    // Query all tabs that match our content script URLs (renown.gg domains)
    browserAPI.tabs.query(
      { url: ["*://*.renown.gg/*", "*://renown.gg/*"] },
      (tabs: Array<{ id?: number; url?: string; active?: boolean }>) => {
        if (tabs.length === 0) {
          console.log(
            "[MessageHandler] 📭 No renown.gg tabs found for message forwarding"
          );
          return;
        }

        console.log(
          `[MessageHandler] 📤 Sending message to ${tabs.length} renown.gg tab(s):`,
          {
            messageType: message.type,
            tabs: tabs.map((tab) => ({
              id: tab.id,
              url: tab.url,
              active: tab.active,
            })),
          }
        );

        // Send message to all matching tabs
        tabs.forEach((tab, index) => {
          if (tab.id) {
            browserAPI.tabs.sendMessage(tab.id, message, () => {
              // Silently handle "Receiving end does not exist" error
              const lastError =
                typeof chrome !== "undefined"
                  ? chrome.runtime.lastError
                  : typeof browser !== "undefined"
                  ? browser.runtime.lastError
                  : null;
              if (lastError) {
                console.log(
                  `[MessageHandler] ⚠️ Tab ${index + 1}/${tabs.length} (ID: ${
                    tab.id
                  }) - Content script not ready:`,
                  lastError.message
                );
                return;
              }
              console.log(
                `[MessageHandler] ✅ Message sent to tab ${index + 1}/${
                  tabs.length
                } (ID: ${tab.id})`
              );
            });
          }
        });
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
