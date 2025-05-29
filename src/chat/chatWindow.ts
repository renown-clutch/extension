import { createShadowRoot } from "../lib/shadowDOM";
import browserAPI from "../lib/browserAPI";
import { waitForElement } from "../utils/profileUtils";
import { getUserInfo } from "../steamId/steamIdParser";
import { getStoredUIState, saveUIState } from "../utils/uiStateUtils";
import { unregisterShadowRoot } from "../themes/shadowThemeManager";
import type { UserSettings } from "../lib/types";

const CHAT_MINIMIZED_KEY = "clutchChatMinimized";

// Global reference to current chat window for message handling
let currentChatWindow: {
  addMessageToChat: (message: any) => void;
  processRecentMessages: (data: any[]) => void;
} | null = null;

// Single global runtime message listener
let messageListenerRegistered = false;

function setupGlobalMessageListener() {
  if (messageListenerRegistered) return;

  console.log("[Chat Content] 🔧 Setting up global message listener");
  messageListenerRegistered = true;

  browserAPI.runtime.onMessage.addListener((message) => {
    console.log("[Chat Content] 🎯 Runtime message received:", {
      type: message.type,
      timestamp: Date.now(),
      hasData: !!message.data,
      dataType: Array.isArray(message.data) ? "array" : typeof message.data,
      hasChatWindow: !!currentChatWindow,
    });

    if (!currentChatWindow) {
      console.log("[Chat Content] ⚠️ No active chat window to handle message");
      return;
    }

    if (message.type === "chat_message") {
      currentChatWindow.addMessageToChat(message.data);
    } else if (message.type === "recent_messages") {
      console.log("[Chat Content] 📥 Processing recent_messages:", {
        messageCount: Array.isArray(message.data) ? message.data.length : 0,
        firstThreeMessages: Array.isArray(message.data)
          ? message.data.slice(0, 3).map((m) => ({
              username: m.username,
              message: m.message?.substring(0, 20) + "...",
              timestamp: m.timestamp,
            }))
          : [],
      });

      if (Array.isArray(message.data)) {
        currentChatWindow.processRecentMessages(message.data);
      }
    }
  });
}

async function removeChatWindow() {
  const chatWindow = document.getElementById("clutch-chat-window");
  console.log("[Chat Content] 🧹 removeChatWindow called", {
    windowExists: !!chatWindow,
  });

  if (chatWindow) {
    console.log("[Chat Content] 🗑️ Removing existing chat window");
    // Unregister shadow root before removing
    const shadowRoot = chatWindow.shadowRoot;
    if (shadowRoot) {
      unregisterShadowRoot(shadowRoot);
    }
    chatWindow.remove();
  }

  // Clear the global reference
  currentChatWindow = null;
}

export async function initializeChatWindow(userSettings: UserSettings) {
  console.log("[Chat Content] 🏗️ initializeChatWindow called", {
    showChatWindow: userSettings.showChatWindow,
    existingWindow: !!document.getElementById("clutch-chat-window"),
  });

  if (!userSettings.showChatWindow) {
    console.log("[Chat Content] 🚮 Removing chat window due to settings");
    removeChatWindow();
    return;
  }

  await waitForElement("body");
  if (document.getElementById("clutch-chat-window")) {
    console.log(
      "[Chat Content] ⚠️ Chat window already exists, skipping initialization"
    );
    return;
  }

  console.log("[Chat Content] ✅ Creating new chat window");

  const container = document.createElement("div");
  container.id = "clutch-chat-window";

  const shadowRoot = createShadowRoot(container);

  const chatContainer = document.createElement("div");
  chatContainer.className = "chat-container";

  const chatHeader = document.createElement("div");
  chatHeader.className = "chat-header";

  const chatTitle = document.createElement("h3");
  chatTitle.className = "chat-title";
  chatTitle.textContent = "Clutch Global Chat";

  const minimizeTab = document.createElement("div");
  minimizeTab.className = "minimize-tab";
  minimizeTab.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
    </svg>
  `;

  chatHeader.appendChild(chatTitle);
  chatHeader.appendChild(minimizeTab);
  chatContainer.appendChild(chatHeader);

  const minimizedIcon = document.createElement("div");
  minimizedIcon.className = "minimized-icon";
  minimizedIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-icon lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
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
  sendButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send-icon lucide-send"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
  `;
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

  async function loadRecentMessages() {
    try {
      console.log("[Chat Content] 🚀 Requesting recent messages...");
      // Clear existing messages before loading new ones
      messagesContainer.innerHTML = "";
      await browserAPI.runtime.sendMessage({
        type: "get_recent_messages",
        limit: 50,
      });
      console.log(
        "[Chat Content] ✅ Recent messages request sent successfully"
      );
      // Data will come through the runtime message listener above
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

  // Set up the current chat window
  currentChatWindow = {
    addMessageToChat,
    processRecentMessages: (data: any[]) => {
      console.log("[Chat Content] 🔄 Adding messages:", {
        total: data.length,
        firstMessage:
          data.length > 0
            ? {
                username: data[0].username,
                message: data[0].message?.substring(0, 30) + "...",
                timestamp: data[0].timestamp,
              }
            : null,
        lastMessage:
          data.length > 0
            ? {
                username: data[data.length - 1].username,
                message:
                  data[data.length - 1].message?.substring(0, 30) + "...",
                timestamp: data[data.length - 1].timestamp,
              }
            : null,
      });

      data.reverse().forEach((msg, index) => {
        addMessageToChat(msg);
      });
      console.log("[Chat Content] ✅ Finished adding all recent messages");
    },
  };

  setupGlobalMessageListener();
}
