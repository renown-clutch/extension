import { createShadowRoot } from "../lib/shadowDOM";
import browserAPI from "../lib/browserAPI";
import { waitForElement } from "../utils/profileUtils";
import { getUserInfo } from "../steamId/steamIdParser";
import { getStoredUIState, saveUIState } from "../utils/uiStateUtils";

const CHAT_MINIMIZED_KEY = "clutchChatMinimized";

export async function initializeChatWindow() {
  await waitForElement("body");
  if (document.getElementById("clutch-chat-window")) {
    return;
  }

  const container = document.createElement("div");
  container.id = "clutch-chat-window";

  const shadowRoot = createShadowRoot(container);

  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = browserAPI.runtime.getURL("featureStyles/chatWindow.css");
  shadowRoot.appendChild(style);

  const chatContainer = document.createElement("div");
  chatContainer.className = "chat-container";

  const minimizeTab = document.createElement("div");
  minimizeTab.className = "minimize-tab";
  minimizeTab.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
    </svg>
  `;

  const minimizedIcon = document.createElement("div");
  minimizedIcon.className = "minimized-icon";
  minimizedIcon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="#888">
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
    </svg>
  `;

  // Initialize minimized state from storage
  const isMinimized = await getStoredUIState(CHAT_MINIMIZED_KEY);
  if (isMinimized) {
    chatContainer.classList.add("minimized");
  }

  function toggleMinimize() {
    const newState = !chatContainer.classList.contains("minimized");
    chatContainer.classList.toggle("minimized", newState);
    saveUIState(CHAT_MINIMIZED_KEY, newState);
  }

  minimizeTab.addEventListener("click", toggleMinimize);
  minimizedIcon.addEventListener("click", toggleMinimize);

  chatContainer.appendChild(minimizeTab);
  chatContainer.appendChild(minimizedIcon);

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
        updateCharCount(); // Reset character count
        isCooldown = true;
        cooldownIndicator.classList.add("active");
        updateSendButtonState();

        // Implement countdown
        let timeLeft = 2;
        const updateCountdown = () => {
          if (timeLeft > 0) {
            cooldownIndicator.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#888" stroke-width="2"/><path d="M12 6v6l4 2" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> <span>${timeLeft}s</span>`;
            timeLeft--;
            setTimeout(updateCountdown, 1000);
          } else {
            isCooldown = false;
            cooldownIndicator.classList.remove("active");
            cooldownIndicator.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#888" stroke-width="2"/><path d="M12 6v6l4 2" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> <span>2s</span>`;
            updateSendButtonState();
          }
        };
        updateCountdown();
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

  function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  function usernameToColor(username: string): string {
    const hash = hashString(username);
    // Use HSL color space for better color distribution
    // Hue: 0-360 (full color spectrum)
    // Saturation: 60-80% (avoid too pale or too intense)
    // Lightness: 45-65% (avoid too dark or too light)
    const hue = hash % 360;
    const saturation = 60 + (hash % 20); // 60-80%
    const lightness = 45 + (hash % 20); // 45-65%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
    usernameSpan.style.color = usernameToColor(message.username);

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
