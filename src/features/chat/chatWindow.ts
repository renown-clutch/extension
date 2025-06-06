import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { createShadowRoot } from "$system/lib/shadowDOM";
import browserAPI from "$system/lib/browserAPI";
import { waitForElement } from "$utils/profileUtils";
import { getUserInfo } from "$system/auth/steamIdParser";
import { getStoredUIState, saveUIState } from "$utils/ui/uiStateUtils";
import { unregisterShadowRoot } from "../../themes/shadowThemeManager";
import { chatUsernameCache } from "$system/api/chat/ChatUsernameCache";

const CHAT_MINIMIZED_KEY = "clutchChatMinimized";

// Global reference to current chat window for message handling
let currentChatWindow: {
  addMessageToChat: (message: any) => void;
  processRecentMessages: (data: any[]) => void;
  updateClickableUsernames: () => void;
} | null = null;

// Single global runtime message listener
let messageListenerRegistered = false;

function setupGlobalMessageListener() {
  if (messageListenerRegistered) return;

  messageListenerRegistered = true;

  browserAPI.runtime.onMessage.addListener((message) => {
    if (!currentChatWindow) {
      return;
    }

    if (message.type === "chat_message") {
      currentChatWindow.addMessageToChat(message.data);
    } else if (message.type === "recent_messages") {
      if (Array.isArray(message.data)) {
        currentChatWindow.processRecentMessages(message.data);
      }
    }
  });
}

async function removeChatWindow() {
  const chatWindow = document.getElementById("clutch-chat-window");
  if (chatWindow) {
    const shadowRoot = chatWindow.shadowRoot;
    if (shadowRoot) {
      unregisterShadowRoot(shadowRoot);
    }
    chatWindow.remove();
  }

  // Clear the global reference
  currentChatWindow = null;
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

function createUsernameElement(username: string): HTMLElement {
  const usernameSpan = document.createElement("span");
  usernameSpan.className = "username";
  usernameSpan.textContent = username;
  usernameSpan.style.color = usernameToColor(username);
  usernameSpan.style.cursor = "pointer";
  usernameSpan.setAttribute("data-clickable-username", username);

  // Queue username for cache if not already cached
  if (!chatUsernameCache.hasCached(username)) {
    chatUsernameCache.getSteamId(username);
  }

  usernameSpan.onclick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    let steamId = chatUsernameCache.getCachedSteamId(username);

    if (!steamId) {
      // Try to get it from cache (this will also queue it for batch request)
      steamId = await chatUsernameCache.getSteamId(username);
    }

    if (steamId) {
      const profileUrl = `https://renown.gg/profile/${steamId}`;
      window.open(profileUrl, "_blank");
    } else {
      // Show loading indicator or fallback
      usernameSpan.style.opacity = "0.6";
      usernameSpan.title = "Loading profile...";

      // Try again after a short delay
      setTimeout(async () => {
        const delayedSteamId = chatUsernameCache.getCachedSteamId(username);
        if (delayedSteamId) {
          const profileUrl = `https://renown.gg/profile/${delayedSteamId}`;
          window.open(profileUrl, "_blank");
          usernameSpan.style.opacity = "1";
          usernameSpan.title = "";
        }
      }, 3000);
    }
  };

  return usernameSpan;
}

async function initializeChatWindow(settings: UserSettings): Promise<void> {
  try {
    await waitForElement("body");
    if (document.getElementById("clutch-chat-window")) {
      return;
    }

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

    const inputWrapper = document.createElement("div");
    inputWrapper.className = "chat-input-wrapper";

    const input = document.createElement("input");
    input.className = "chat-input";
    input.placeholder = "Type a message...";
    input.maxLength = 300;

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

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(sendButton);

    inputContainer.appendChild(inputIndicators);
    inputContainer.appendChild(inputWrapper);

    async function loadRecentMessages() {
      try {
        // Request recent messages - don't clear messages until we get new ones
        const response = await browserAPI.runtime.sendMessage({
          type: "get_recent_messages",
          limit: 50,
        });

        if (!response?.success) {
          console.warn(
            "[Chat Content] Failed to request recent messages:",
            response
          );
        }
      } catch (error) {
        console.error("[Chat Content] Error in loadRecentMessages:", error);
      }
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

      // Create clickable username element
      const usernameSpan = createUsernameElement(message.username);

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

    function updateClickableUsernames(): void {
      const usernameElements = messagesContainer.querySelectorAll(
        "[data-clickable-username]"
      );

      usernameElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          const username = element.getAttribute("data-clickable-username");
          if (username && chatUsernameCache.hasCached(username)) {
            // Reset any loading states
            element.style.opacity = "1";
            element.title = "";
          }
        }
      });
    }

    // Listen for username resolution events
    document.addEventListener("chatUsernamesResolved", (event: any) => {
      updateClickableUsernames();
    });

    // Track visibility state to reload messages when tab becomes active
    let wasHidden = false;

    function handleVisibilityChange() {
      if (document.hidden) {
        wasHidden = true;
      } else if (wasHidden) {
        // Tab just became visible after being hidden - reload recent messages
        loadRecentMessages();
        wasHidden = false;
      }
    }

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    chatContainer.appendChild(messagesContainer);
    chatContainer.appendChild(inputContainer);
    shadowRoot.appendChild(chatContainer);

    document.body.appendChild(container);

    // Load recent messages when chat initializes
    loadRecentMessages();

    function processRecentMessages(data: any[]): void {
      // Clear messages only when we actually have new messages to show
      messagesContainer.innerHTML = "";

      // Collect all usernames for preloading
      const usernames = data.map((msg) => msg.username).filter(Boolean);
      if (usernames.length > 0) {
        chatUsernameCache.preloadUsernames(usernames);
      }

      data.reverse().forEach((msg, index) => {
        addMessageToChat(msg);
      });
    }

    // Set up the current chat window
    currentChatWindow = {
      addMessageToChat,
      processRecentMessages,
      updateClickableUsernames,
    };

    setupGlobalMessageListener();
  } catch (error) {
    console.error("[ChatWindow] Error in initialization:", error);
  }
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "showChatWindow",
  category: "chat",
  defaultValue: true,
  description: "Extension chat window",

  shouldActivate: ActivationHelpers.whenEnabled("showChatWindow"),

  handler: initializeChatWindow,
  cleanupHandler: removeChatWindow,

  apiCalls: [
    {
      requestType: "send_chat_message",
      responseType: "chat_message_response",
    },
    {
      requestType: "get_recent_messages",
      responseType: "recent_messages",
    },
    {
      requestType: "chat_message",
      responseType: "chat_message_broadcast",
    },
  ],
});
