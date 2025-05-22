import { createShadowRoot } from "../lib/shadowDOM";
import browserAPI from "../lib/browserAPI";
import { waitForElement } from "../utils/profileUtils";
import { getUserInfo } from "../steamId/steamIdParser";

export async function initializeChatWindow() {
  await waitForElement("body");
  if (document.getElementById("clutch-chat-window")) {
    return;
  }

  const container = document.createElement("div");
  container.id = "clutch-chat-window";

  const shadowRoot = createShadowRoot(container);

  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    .chat-container {
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 300px;
      height: 400px;
      background-color: rgba(0, 0, 0, 0.8);
      border: 1px solid #444;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      z-index: 9999;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 14px;
    }

    .chat-input-container {
      display: flex;
      padding: 10px;
      gap: 8px;
      border-top: 1px solid #444;
    }

    .chat-input {
      flex: 1;
      padding: 8px;
      border: 1px solid #444;
      border-radius: 4px;
      background-color: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .chat-input:focus {
      outline: none;
      border-color: #666;
    }

    .send-button {
      padding: 8px 16px;
      background-color: #444;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .send-button:hover {
      background-color: #555;
    }

    .message {
      margin-bottom: 8px;
      word-wrap: break-word;
    }

    .message .username {
      font-weight: bold;
      color: #4a9eff;
    }

    .message .timestamp {
      font-size: 12px;
      color: #888;
      margin-left: 8px;
    }
  `;

  shadowRoot.appendChild(style);

  // Create chat container
  const chatContainer = document.createElement("div");
  chatContainer.className = "chat-container";

  // Create messages container
  const messagesContainer = document.createElement("div");
  messagesContainer.className = "chat-messages";

  // Create input container
  const inputContainer = document.createElement("div");
  inputContainer.className = "chat-input-container";

  // Create input field
  const input = document.createElement("input");
  input.className = "chat-input";
  input.placeholder = "Type a message...";

  // Create send button
  const sendButton = document.createElement("button");
  sendButton.className = "send-button";
  sendButton.textContent = "Send";

  // Function to format timestamp
  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  // Function to add a message to the chat
  function addMessageToChat(message: {
    username: string;
    message: string;
    timestamp: string;
  }) {
    const messageElement = document.createElement("div");
    messageElement.className = "message";

    const usernameSpan = document.createElement("span");
    usernameSpan.className = "username";
    usernameSpan.textContent = message.username;

    const timestampSpan = document.createElement("span");
    timestampSpan.className = "timestamp";
    timestampSpan.textContent = formatTimestamp(message.timestamp);

    messageElement.appendChild(usernameSpan);
    messageElement.appendChild(
      document.createTextNode(": " + message.message + " ")
    );
    messageElement.appendChild(timestampSpan);

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Add event listener for sending messages
  const sendMessage = async () => {
    const message = input.value.trim();
    if (message) {
      try {
        const { username } = await getUserInfo();

        console.log("[Chat Content] Sending message:", { username, message });

        // Send message through background script
        const response = await browserAPI.runtime.sendMessage({
          type: "send_chat_message",
          username: username,
          message: message,
        });

        console.log("[Chat Content] Send message response:", response);

        input.value = "";
      } catch (error) {
        console.error("[Chat Content] Error sending message:", error);
      }
    }
  };

  sendButton.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  // Listen for chat messages from background script
  browserAPI.runtime.onMessage.addListener((message) => {
    console.log("[Chat Content] Received message from background:", message);

    if (message.type === "chat_message") {
      console.log("[Chat Content] Processing chat message:", message.data);
      addMessageToChat(message.data);
    } else if (message.type === "recent_messages") {
      console.log("[Chat Content] Processing recent messages:", message.data);
      if (Array.isArray(message.data)) {
        message.data.reverse().forEach(addMessageToChat);
      }
    }
  });

  // Load recent messages
  async function loadRecentMessages() {
    try {
      console.log("[Chat Content] Requesting recent messages");

      const response = await browserAPI.runtime.sendMessage({
        type: "get_recent_messages",
        limit: 50,
      });

      console.log("[Chat Content] Received recent messages:", response);

      if (response && response.data) {
        response.data.reverse().forEach(addMessageToChat);
      }
    } catch (error) {
      console.error("[Chat Content] Error loading recent messages:", error);
    }
  }

  // Assemble the components
  inputContainer.appendChild(input);
  inputContainer.appendChild(sendButton);
  chatContainer.appendChild(messagesContainer);
  chatContainer.appendChild(inputContainer);
  shadowRoot.appendChild(chatContainer);

  // Add to page
  document.body.appendChild(container);

  // Load recent messages
  loadRecentMessages();
}
