import { createHeadObserver } from "../utils/observerUtils";

const styleElement = document.createElement("style");
styleElement.id = "clutch-theme";

let isThemeInjected = false;
let currentTheme: string | null = null;

const DARK_SHEET_PATH = chrome.runtime.getURL("themes/DarkSheet.css");
const PINK_SHEET_PATH = chrome.runtime.getURL("themes/PinkSheet.css");
const PURPLE_SHEET_PATH = chrome.runtime.getURL("themes/PurpleSheet.css");
const GREEN_SHEET_PATH = chrome.runtime.getURL("themes/GreenSheet.css");
const DARK_GRAY_SHEET_PATH = chrome.runtime.getURL("themes/DarkGraySheet.css");

const stylesheetCache: Record<string, string> = {};

export async function initialize(theme: string): Promise<void> {
  if (
    theme !== "dark" &&
    theme !== "pink" &&
    theme !== "purple" &&
    theme !== "green" &&
    theme !== "darkgray"
  ) {
    return;
  }

  currentTheme = theme;

  try {
    await loadAndApplyTheme(theme);
  } catch (error) {
    console.error("Failed to initialize theme:", error);
  }
}

async function loadStylesheet(url: string): Promise<string> {
  if (stylesheetCache[url]) {
    return stylesheetCache[url];
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load stylesheet: ${response.statusText}`);
    }

    const stylesheet = await response.text();
    stylesheetCache[url] = stylesheet;
    return stylesheet;
  } catch (error) {
    console.error(`Error fetching stylesheet:`, error);
    throw error;
  }
}

async function loadAndApplyTheme(theme: string): Promise<void> {
  let url;

  switch (theme) {
    case "dark":
      url = DARK_SHEET_PATH;
      break;
    case "pink":
      url = PINK_SHEET_PATH;
      break;
    case "purple":
      url = PURPLE_SHEET_PATH;
      break;
    case "green":
      url = GREEN_SHEET_PATH;
      break;
    case "darkgray":
      url = DARK_GRAY_SHEET_PATH;
      break;
    default:
      url = DARK_SHEET_PATH;
  }

  try {
    const stylesheet = await loadStylesheet(url);
    styleElement.textContent = stylesheet;

    if (!isThemeInjected) {
      if (document.head) {
        document.head.appendChild(styleElement);
        isThemeInjected = true;
      } else {
        // Use our new utility for head observer
        createHeadObserver(
          () => {
            if (document.head && !isThemeInjected) {
              document.head.appendChild(styleElement);
              isThemeInjected = true;
            }
          },
          { childList: true }
        );
      }
    }
  } catch (error) {
    console.error(`Failed to load theme ${theme}:`, error);
    throw error;
  }
}
