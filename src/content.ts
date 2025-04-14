console.log("Clutch extension content script loaded");

import { initialize as initializeTheme } from "./themes/themeUtils";
import { initialize as initializeProfileButtons } from "./playerProfile/profileButtons";
// import type { UserSettings } from "./lib/types/types";
// import { defaultUserSettings } from "./lib/types/types";

// let userSettings: UserSettings = defaultUserSettings;

async function initialize() {
  // const result = await chrome.storage.local.get("userSettings");
  // userSettings = result.userSettings || defaultUserSettings;
  // console.log("Loaded user settings in content script:", userSettings);

  initializeTheme();
  initializeProfileButtons();
}

initialize();
