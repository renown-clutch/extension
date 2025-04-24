import { defaultUserSettings } from "./lib/types";

/**
 * Creates a shadow root and embeds a popup interface similar to the extension popup
 */
export function embedPopupInShadow(): void {
  // Create container that will host the shadow DOM
  const container = document.createElement("div");
  container.id = "clutch-embedded-popup";
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    width: 600px;
    height: 440px;
  `;
  document.body.appendChild(container);

  // Create shadow DOM
  const shadowRoot = container.attachShadow({ mode: "open" });

  // Add styles to shadow DOM
  const style = document.createElement("style");
  style.textContent = `
    :host {
      font-family: 'Poppins', sans-serif;
      color: white;
    }
    
    .panel {
      background-color: #0f172a;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
    }
    
    .sidebar {
      width: 64px;
      background-color: #1e293b;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 0;
    }
    
    .content {
      flex: 1;
      padding: 32px;
      overflow-y: auto;
    }
    
    .tab-button {
      width: 40px;
      height: 40px;
      border-radius: 4px;
      border: none;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      background-color: transparent;
      color: white;
      font-size: 16px;
      transition: background-color 0.2s ease;
    }
    
    .tab-button.active {
      background-color: #334155;
    }
    
    .tab-button:hover:not(.active) {
      background-color: rgba(30, 64, 175, 0.2);
    }
    
    h1 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 16px;
    }
    
    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 22px;
    }
    
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #334155;
      transition: .4s;
      border-radius: 34px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 4px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    
    input:checked + .slider {
      background-color: #3b82f6;
    }
    
    input:checked + .slider:before {
      transform: translateX(20px);
    }
    
    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
    }
    
    .setting-description {
      margin-top: 4px;
      color: #94a3b8;
      font-size: 12px;
    }
  `;
  shadowRoot.appendChild(style);

  // Add fonts
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap";
  shadowRoot.appendChild(link);

  // Create panel structure
  const panel = document.createElement("div");
  panel.className = "panel";

  // Create sidebar
  const sidebar = document.createElement("div");
  sidebar.className = "sidebar";

  // Create content area
  const content = document.createElement("div");
  content.className = "content";

  // Add sidebar and content to panel
  panel.appendChild(sidebar);
  panel.appendChild(content);
  shadowRoot.appendChild(panel);

  // Load settings
  chrome.storage.local.get("userSettings", (result) => {
    const userSettings = result.userSettings || defaultUserSettings;

    // Create tabs
    const tabs = [
      { id: "Theme", icon: "🎨", label: "Theme" },
      { id: "Auto-accept", icon: "✓", label: "Auto Accept" },
      { id: "Match", icon: "🎮", label: "Match" },
      { id: "Sounds", icon: "🔊", label: "Sounds" },
      { id: "Profiles", icon: "👤", label: "Profiles" },
      { id: "Settings", icon: "⚙️", label: "Settings" },
    ];

    tabs.forEach((tab) => {
      const button = document.createElement("button");
      const isActive = userSettings.activeTab === tab.id;

      button.className = `tab-button ${isActive ? "active" : ""}`;
      button.setAttribute("data-tab", tab.id);
      button.setAttribute("title", tab.label);
      button.textContent = tab.icon;

      button.addEventListener("click", () => {
        // Remove active class from all buttons
        sidebar.querySelectorAll(".tab-button").forEach((btn) => {
          btn.classList.remove("active");
        });

        // Add active class to clicked button
        button.classList.add("active");

        // Update active tab in settings
        userSettings.activeTab = tab.id;
        chrome.storage.local.set({ userSettings });

        // Load tab content
        loadTabContent(content, tab.id, userSettings);
      });

      sidebar.appendChild(button);
    });

    // Load initial tab content
    loadTabContent(content, userSettings.activeTab || "Theme", userSettings);
  });
}

/**
 * Loads content for the selected tab
 */
function loadTabContent(
  contentElement: HTMLElement,
  tabId: string,
  settings: any
): void {
  // Clear current content
  contentElement.innerHTML = "";

  // Create tab content based on active tab
  switch (tabId) {
    case "Theme":
      renderThemeTab(contentElement, settings);
      break;
    case "Settings":
      renderSettingsTab(contentElement, settings);
      break;
    default:
      contentElement.innerHTML = `<h1>${tabId}</h1><p>This tab is not implemented in the embedded view yet.</p>`;
  }
}

/**
 * Renders the Theme tab content
 */
function renderThemeTab(contentElement: HTMLElement, settings: any): void {
  const container = document.createElement("div");
  container.innerHTML = `
    <h1>Theme Settings</h1>
    <div class="theme-options">
      <div class="setting-row">
        <div>
          <label>
            <input type="radio" name="theme" value="default" ${
              settings.selectedTheme === "default" ? "checked" : ""
            }>
            Default Theme
          </label>
        </div>
      </div>
      <div class="setting-row">
        <div>
          <label>
            <input type="radio" name="theme" value="dark" ${
              settings.selectedTheme === "dark" ? "checked" : ""
            }>
            Dark Theme
          </label>
        </div>
      </div>
    </div>
  `;

  // Add event listeners for theme selection
  const themeInputs = container.querySelectorAll('input[name="theme"]');
  themeInputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        updateSetting("selectedTheme", target.value);
      }
    });
  });

  contentElement.appendChild(container);
}

/**
 * Renders the Settings tab content
 */
function renderSettingsTab(contentElement: HTMLElement, settings: any): void {
  const container = document.createElement("div");
  container.innerHTML = `
    <h1>Settings</h1>
    
    <div class="setting-row">
      <div>
        <h4>Keep CS2 active</h4>
        <div class="setting-description">Keep the connection to CS2 alive while you browse the website.</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="keep-alive-switch" ${
          settings.keepAlive ? "checked" : ""
        }>
        <span class="slider"></span>
      </label>
    </div>
    
    <div class="setting-row">
      <div>
        <h4>Show Extension Button</h4>
        <div class="setting-description">Show the extension button in the navbar.</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="extension-button-switch" ${
          settings.showExtensionNavbarButton ? "checked" : ""
        }>
        <span class="slider"></span>
      </label>
    </div>
    
    <div class="setting-row">
      <div>
        <h4>Floating Button</h4>
        <div class="setting-description">Show a floating button in the corner with quick access to settings.</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="floating-button-switch" ${
          settings.showFloatingButton ? "checked" : ""
        }>
        <span class="slider"></span>
      </label>
    </div>
  `;

  // Add event listeners
  contentElement.appendChild(container);

  const keepAliveSwitch = contentElement.querySelector(
    "#keep-alive-switch"
  ) as HTMLInputElement;
  keepAliveSwitch?.addEventListener("change", () => {
    updateSetting("keepAlive", keepAliveSwitch.checked);
  });

  const extensionButtonSwitch = contentElement.querySelector(
    "#extension-button-switch"
  ) as HTMLInputElement;
  extensionButtonSwitch?.addEventListener("change", () => {
    updateSetting("showExtensionNavbarButton", extensionButtonSwitch.checked);
  });

  const floatingButtonSwitch = contentElement.querySelector(
    "#floating-button-switch"
  ) as HTMLInputElement;
  floatingButtonSwitch?.addEventListener("change", () => {
    updateSetting("showFloatingButton", floatingButtonSwitch.checked);
  });
}

/**
 * Updates a setting in Chrome storage
 */
function updateSetting(key: string, value: any): void {
  chrome.storage.local.get("userSettings", (result) => {
    const settings = result.userSettings || defaultUserSettings;
    settings[key] = value;
    chrome.storage.local.set({ userSettings: settings });

    // Send message to content script to update settings
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "settingsUpdate",
          settings,
          changedParts: { [key]: value },
        });
      }
    });
  });
}
