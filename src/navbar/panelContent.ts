import { injectFonts } from "../utils/domUtils";
import { defaultUserSettings, type UserSettings } from "../lib/types";

/**
 * Initializes the panel content with the Svelte components
 * This function injects HTML structure similar to the popup
 */
export function initializePanelContent(
  panel: HTMLElement,
  settings: UserSettings = defaultUserSettings
): void {
  // Inject fonts first
  injectFonts();

  // Create panel HTML structure
  panel.innerHTML = `
    <div class="panel-container" style="width: 100%; height: 100%; overflow: hidden; display: flex;">
      <div class="panel-sidebar" style="
        width: 64px; 
        background-color: #1e293b; 
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem 0;
      ">
        <!-- Sidebar tabs will be inserted here -->
      </div>
      <div class="panel-content" style="
        flex: 1;
        padding: 2rem;
        overflow-y: auto;
        background-color: #0f172a;
      ">
        <!-- Tab content will be inserted here -->
      </div>
    </div>
  `;

  // Get sidebar and content elements
  const sidebar = panel.querySelector(".panel-sidebar");
  const content = panel.querySelector(".panel-content");

  if (!sidebar || !content) return;

  // Create tab buttons
  createTabButtons(sidebar as HTMLElement, content as HTMLElement, settings);

  // Load initial tab content
  loadTabContent(
    content as HTMLElement,
    settings.activeTab || "Theme",
    settings
  );
}

/**
 * Creates the tab buttons in the sidebar
 */
function createTabButtons(
  sidebar: HTMLElement,
  content: HTMLElement,
  settings: UserSettings
): void {
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
    const isActive = settings.activeTab === tab.id;

    button.className = "tab-button";
    button.setAttribute("data-tab", tab.id);
    button.setAttribute("title", tab.label);
    button.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 4px;
      border: none;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      background-color: ${isActive ? "#334155" : "transparent"};
      color: white;
      font-size: 16px;
      transition: background-color 0.2s ease;
    `;

    button.innerHTML = tab.icon;

    button.addEventListener("mouseover", () => {
      if (settings.activeTab !== tab.id) {
        button.style.backgroundColor = "#1e40af20";
      }
    });

    button.addEventListener("mouseout", () => {
      if (settings.activeTab !== tab.id) {
        button.style.backgroundColor = "transparent";
      }
    });

    button.addEventListener("click", () => {
      // Update active tab
      document.querySelectorAll(".tab-button").forEach((btn: Element) => {
        (btn as HTMLElement).style.backgroundColor = "transparent";
      });

      button.style.backgroundColor = "#334155";
      settings.activeTab = tab.id;

      // Save settings
      chrome.storage.local.get("userSettings", (result) => {
        const updatedSettings = { ...result.userSettings, activeTab: tab.id };
        chrome.storage.local.set({ userSettings: updatedSettings });
      });

      // Load tab content
      loadTabContent(content, tab.id, settings);
    });

    sidebar.appendChild(button);
  });
}

/**
 * Loads the content for the selected tab
 */
function loadTabContent(
  contentElement: HTMLElement,
  tabId: string,
  settings: UserSettings
): void {
  // Clear current content
  contentElement.innerHTML = "";

  // Load content based on active tab
  switch (tabId) {
    case "Theme":
      renderThemeTab(contentElement, settings);
      break;
    case "Auto-accept":
      renderAutoAcceptTab(contentElement, settings);
      break;
    case "Match":
      renderMatchTab(contentElement, settings);
      break;
    case "Profiles":
      renderProfilesTab(contentElement, settings);
      break;
    case "Settings":
      renderSettingsTab(contentElement, settings);
      break;
    case "Sounds":
      renderSoundsTab(contentElement, settings);
      break;
    default:
      contentElement.innerHTML = "<div>Select a tab to view settings</div>";
  }
}

// Placeholder renderers for each tab
// In a full implementation, these would mirror your Svelte components
// For now, we'll just add basic placeholders with simple controls

function renderThemeTab(
  contentElement: HTMLElement,
  settings: UserSettings
): void {
  contentElement.innerHTML = `
    <h2 style="font-size: 24px; margin-bottom: 16px; color: white;">Theme Settings</h2>
    <div class="theme-selector" style="display: flex; flex-direction: column; gap: 10px;">
      <label style="display: flex; align-items: center;">
        <input type="radio" name="theme" value="default" ${
          settings.selectedTheme === "default" ? "checked" : ""
        } />
        <span style="margin-left: 8px; color: white;">Default</span>
      </label>
      <label style="display: flex; align-items: center;">
        <input type="radio" name="theme" value="dark" ${
          settings.selectedTheme === "dark" ? "checked" : ""
        } />
        <span style="margin-left: 8px; color: white;">Dark</span>
      </label>
      <!-- Add more themes as needed -->
    </div>
  `;

  // Add event listeners
  const themeInputs = contentElement.querySelectorAll('input[name="theme"]');
  themeInputs.forEach((input: Element) => {
    input.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        updateSetting("selectedTheme", target.value);
      }
    });
  });
}

function renderAutoAcceptTab(
  contentElement: HTMLElement,
  settings: UserSettings
): void {
  contentElement.innerHTML = `
    <h2 style="font-size: 24px; margin-bottom: 16px; color: white;">Auto-Accept Settings</h2>
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <label style="display: flex; align-items: center;">
        <input type="checkbox" ${
          settings.autoAccept?.enabled ? "checked" : ""
        } />
        <span style="margin-left: 8px; color: white;">Enable auto-accept for matches</span>
      </label>
      <label style="display: flex; align-items: center;">
        <input type="checkbox" ${
          settings.autoAccept?.parties ? "checked" : ""
        } />
        <span style="margin-left: 8px; color: white;">Auto-accept party invites</span>
      </label>
    </div>
  `;

  // Add event listeners
  const inputs = contentElement.querySelectorAll('input[type="checkbox"]');
  inputs[0].addEventListener("change", (e: Event) => {
    const target = e.target as HTMLInputElement;
    updateSetting("autoAccept", {
      ...settings.autoAccept,
      enabled: target.checked,
    });
  });

  inputs[1].addEventListener("change", (e: Event) => {
    const target = e.target as HTMLInputElement;
    updateSetting("autoAccept", {
      ...settings.autoAccept,
      parties: target.checked,
    });
  });
}

function renderMatchTab(
  contentElement: HTMLElement,
  settings: UserSettings
): void {
  contentElement.innerHTML = `
    <h2 style="font-size: 24px; margin-bottom: 16px; color: white;">Match Settings</h2>
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <label style="display: flex; align-items: center;">
        <input type="checkbox" ${
          settings.showFaceitRanksOnMatchPage ? "checked" : ""
        } />
        <span style="margin-left: 8px; color: white;">Show Faceit ranks on match page</span>
      </label>
    </div>
  `;

  // Add event listeners
  const inputs = contentElement.querySelectorAll('input[type="checkbox"]');
  inputs[0].addEventListener("change", (e: Event) => {
    const target = e.target as HTMLInputElement;
    updateSetting("showFaceitRanksOnMatchPage", target.checked);
  });
}

function renderProfilesTab(
  contentElement: HTMLElement,
  settings: UserSettings
): void {
  contentElement.innerHTML = `
    <h2 style="font-size: 24px; margin-bottom: 16px; color: white;">Profile Settings</h2>
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <label style="display: flex; align-items: center;">
        <input type="checkbox" ${
          settings.csstatsProfileButton ? "checked" : ""
        } />
        <span style="margin-left: 8px; color: white;">Show CS Stats profile button</span>
      </label>
      <label style="display: flex; align-items: center;">
        <input type="checkbox" ${
          settings.faceitProfileButton ? "checked" : ""
        } />
        <span style="margin-left: 8px; color: white;">Show Faceit profile button</span>
      </label>
      <label style="display: flex; align-items: center;">
        <input type="checkbox" ${settings.showBans ? "checked" : ""} />
        <span style="margin-left: 8px; color: white;">Show previous bans</span>
      </label>
      <label style="display: flex; align-items: center;">
        <input type="checkbox" ${settings.showSkinDrops ? "checked" : ""} />
        <span style="margin-left: 8px; color: white;">Show skin drops</span>
      </label>
      <label style="display: flex; align-items: center;">
        <input type="checkbox" ${
          settings.showFriendListRanks ? "checked" : ""
        } />
        <span style="margin-left: 8px; color: white;">Show friend list ranks</span>
      </label>
    </div>
  `;

  // Add event listeners for each checkbox
  const checkboxes = contentElement.querySelectorAll('input[type="checkbox"]');
  const settingKeys = [
    "csstatsProfileButton",
    "faceitProfileButton",
    "showBans",
    "showSkinDrops",
    "showFriendListRanks",
  ];

  checkboxes.forEach((checkbox, index) => {
    checkbox.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLInputElement;
      updateSetting(settingKeys[index], target.checked);
    });
  });
}

function renderSettingsTab(
  contentElement: HTMLElement,
  settings: UserSettings
): void {
  contentElement.innerHTML = `
    <h2 style="font-size: 24px; margin-bottom: 16px; color: white;">General Settings</h2>
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <label style="display: flex; align-items: center;">
        <input type="checkbox" ${settings.keepAlive ? "checked" : ""} />
        <span style="margin-left: 8px; color: white;">Keep CS2 connection alive</span>
      </label>
      <label style="display: flex; align-items: center;">
        <input type="checkbox" ${
          settings.showExtensionNavbarButton ? "checked" : ""
        } />
        <span style="margin-left: 8px; color: white;">Show extension button in navbar</span>
      </label>
      <div style="margin-top: 20px;">
        <p style="color: #cbd5e1; margin-bottom: 8px;">Floating Button Setting</p>
        <label style="display: flex; align-items: center;">
          <input type="checkbox" id="showFloatingButton" />
          <span style="margin-left: 8px; color: white;">Show floating button (like Repeek)</span>
        </label>
      </div>
    </div>
  `;

  // Add event listeners
  const inputs = contentElement.querySelectorAll('input[type="checkbox"]');

  // Keep alive toggle
  inputs[0].addEventListener("change", (e: Event) => {
    const target = e.target as HTMLInputElement;
    updateSetting("keepAlive", target.checked);
  });

  // Navbar button toggle
  inputs[1].addEventListener("change", (e: Event) => {
    const target = e.target as HTMLInputElement;
    updateSetting("showExtensionNavbarButton", target.checked);
  });

  // Floating button toggle
  const floatingButtonCheckbox = document.getElementById(
    "showFloatingButton"
  ) as HTMLInputElement;
  if (floatingButtonCheckbox) {
    // Check if setting exists, and set default state
    chrome.storage.local.get("userSettings", (result) => {
      const settings = result.userSettings || {};
      floatingButtonCheckbox.checked = settings.showFloatingButton || false;
    });

    floatingButtonCheckbox.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLInputElement;
      updateSetting("showFloatingButton", target.checked);
    });
  }
}

function renderSoundsTab(
  contentElement: HTMLElement,
  settings: UserSettings
): void {
  contentElement.innerHTML = `
    <h2 style="font-size: 24px; margin-bottom: 16px; color: white;">Sound Settings</h2>
    <p style="color: white;">Sound settings coming soon.</p>
  `;
}

/**
 * Updates a setting in Chrome storage and sends a message to the content script
 */
function updateSetting(key: string, value: any): void {
  chrome.storage.local.get("userSettings", (result) => {
    const currentSettings = result.userSettings || defaultUserSettings;
    const updatedSettings = { ...currentSettings, [key]: value };

    // Save to storage
    chrome.storage.local.set({ userSettings: updatedSettings });

    // Send message to content script to update settings
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        const changedParts = { [key]: value };
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "settingsUpdate",
          settings: updatedSettings,
          changedParts,
        });
      }
    });
  });
}
