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

  const style = document.createElement("style");
  style.textContent = `
    .chat-container {
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 300px;
      height: 400px;
      background-color: rgba(20, 20, 20, 0.92);
      backdrop-filter: blur(8px);
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
      scrollbar-width: thin;
      scrollbar-color: #4a9eff #222;
    }

    .chat-messages::-webkit-scrollbar {
      width: 8px;
    }

    .chat-messages::-webkit-scrollbar-thumb {
      background: #4a9eff;
      border-radius: 4px;
    }

    .chat-messages::-webkit-scrollbar-track {
      background: #222;
      border-radius: 4px;
    }

    .chat-input-container {
      display: flex;
      padding: 6px 10px 6px 10px;
      gap: 4px;
      border-top: 1px solid #444;
      flex-direction: column;
      position: relative;
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

    .input-indicators {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1px;
    }
    .cooldown-indicator {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 12px;
      color: #888;
      min-width: 32px;
      height: 16px;
      visibility: hidden;
    }
    .cooldown-indicator.active {
      visibility: visible;
    }
    .char-count {
      font-size: 12px;
      color: #888;
    }

    .char-count.warning {
      color: #ff6b6b;
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

    .send-button:disabled {
      background-color: #333;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .message {
      margin-bottom: 8px;
      word-wrap: break-word;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .message .username {
      font-weight: bold;
      color: #4a9eff;
    }

    .message-content-row {
      position: relative;
      width: 100%;
      word-break: break-word;
      padding-bottom: 2px;
    }
    .message-main {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      flex: 1 1 auto;
      word-break: break-word;
      white-space: pre-wrap;
      min-width: 0;
      padding-right: 48px; /* space for timestamp */
    }
    .message .username {
      font-weight: bold;
      color: #4a9eff;
      margin-right: 3px;
      flex-shrink: 0;
    }
    .message-colon {
      margin-right: 3px;
      flex-shrink: 0;
    }
    .message-text {
      flex: 1 1 auto;
      word-break: break-word;
      white-space: pre-wrap;
      min-width: 0;
    }

    .message .timestamp {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 11px;
      color: #888;
      margin-left: 8px;
      white-space: nowrap;
    }
  `;

  shadowRoot.appendChild(style);

  const chatContainer = document.createElement("div");
  chatContainer.className = "chat-container";

  const messagesContainer = document.createElement("div");
  messagesContainer.className = "chat-messages";

  const inputContainer = document.createElement("div");
  inputContainer.className = "chat-input-container";

  const input = document.createElement("input");
  input.className = "chat-input";
  input.placeholder = "Type a message...";
  input.maxLength = 300;

  const inputIndicators = document.createElement("div");
  inputIndicators.className = "input-indicators";

  const cooldownIndicator = document.createElement("div");
  cooldownIndicator.className = "cooldown-indicator";
  cooldownIndicator.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#888" stroke-width="2"/><path d="M12 6v6l4 2" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> <span>2s</span>`;

  const charCount = document.createElement("div");
  charCount.className = "char-count";
  charCount.textContent = "0/300";

  inputIndicators.appendChild(cooldownIndicator);
  inputIndicators.appendChild(charCount);

  const sendButton = document.createElement("button");
  sendButton.className = "send-button";
  sendButton.textContent = "Send";
  sendButton.disabled = true;

  let isCooldown = false;
  function updateSendButtonState() {
    const message = input.value.trim();
    sendButton.disabled = message.length === 0 || isCooldown;
  }

  function updateCharCount() {
    const count = input.value.length;
    charCount.textContent = `${count}/300`;
    charCount.className = `char-count ${count > 250 ? "warning" : ""}`;
    updateSendButtonState();
  }

  const sendMessage = async () => {
    const message = input.value.trim();
    if (message && !isCooldown) {
      try {
        const { username } = await getUserInfo();
        const response = await browserAPI.runtime.sendMessage({
          type: "send_chat_message",
          username: username,
          message: message,
        });
        input.value = "";
        isCooldown = true;
        cooldownIndicator.classList.add("active");
        updateSendButtonState();
        setTimeout(() => {
          isCooldown = false;
          cooldownIndicator.classList.remove("active");
          updateSendButtonState();
        }, 2000);
      } catch (error) {
        console.error("[Chat Content] Error sending message:", error);
      }
    }
  };

  sendButton.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !sendButton.disabled && !isCooldown) {
      sendMessage();
    }
  });

  input.addEventListener("input", updateCharCount);

  browserAPI.runtime.onMessage.addListener((message) => {
    if (message.type === "chat_message") {
      addMessageToChat(message.data);
    } else if (message.type === "recent_messages") {
      if (Array.isArray(message.data)) {
        message.data.reverse().forEach(addMessageToChat);
      }
    }
  });

  async function loadRecentMessages() {
    try {
      const response = await browserAPI.runtime.sendMessage({
        type: "get_recent_messages",
        limit: 50,
      });

      if (response && response.data) {
        response.data.reverse().forEach(addMessageToChat);
      }
    } catch (error) {
      console.error("[Chat Content] Error loading recent messages:", error);
    }
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function addMessageToChat(message: {
    username: string;
    message: string;
    timestamp: string;
  }) {
    const messageElement = document.createElement("div");
    messageElement.className = "message";

    const contentRow = document.createElement("div");
    contentRow.className = "message-content-row";

    const mainContent = document.createElement("span");
    mainContent.className = "message-main";

    const usernameSpan = document.createElement("span");
    usernameSpan.className = "username";
    usernameSpan.textContent = message.username;

    const colonSpan = document.createElement("span");
    colonSpan.className = "message-colon";
    colonSpan.textContent = ":";

    const textSpan = document.createElement("span");
    textSpan.className = "message-text";
    textSpan.textContent = message.message;

    mainContent.appendChild(usernameSpan);
    mainContent.appendChild(colonSpan);
    mainContent.appendChild(textSpan);

    const timestampSpan = document.createElement("span");
    timestampSpan.className = "timestamp";
    timestampSpan.textContent = formatTimestamp(message.timestamp);

    contentRow.appendChild(mainContent);
    contentRow.appendChild(timestampSpan);

    messageElement.appendChild(contentRow);

    messagesContainer.appendChild(messageElement);

    while (messagesContainer.children.length > 50) {
      messagesContainer.removeChild(messagesContainer.firstChild!);
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  inputContainer.appendChild(inputIndicators);
  inputContainer.appendChild(input);
  inputContainer.appendChild(sendButton);
  chatContainer.appendChild(messagesContainer);
  chatContainer.appendChild(inputContainer);
  shadowRoot.appendChild(chatContainer);

  document.body.appendChild(container);

  loadRecentMessages();
}
