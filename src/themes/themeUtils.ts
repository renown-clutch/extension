const styleElement = document.createElement("style");
styleElement.id = "clutch-theme";

let isThemeInjected = false;
let currentTheme: string | null = null;

const DARK_SHEET_PATH = chrome.runtime.getURL("themes/DarkSheet.css");
const LIGHT_SHEET_PATH = chrome.runtime.getURL("themes/LightSheet.css");

const stylesheetCache: Record<string, string> = {};

export async function initialize(theme: string): Promise<void> {
  if (theme !== "dark" && theme !== "light") {
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
  const url = theme === "dark" ? DARK_SHEET_PATH : LIGHT_SHEET_PATH;

  try {
    const stylesheet = await loadStylesheet(url);
    styleElement.textContent = stylesheet;

    if (!isThemeInjected) {
      if (document.head) {
        document.head.appendChild(styleElement);
        isThemeInjected = true;
      } else {
        const observer = new MutationObserver(() => {
          if (document.head) {
            document.head.appendChild(styleElement);
            isThemeInjected = true;
            observer.disconnect();
          }
        });
        observer.observe(document.documentElement, { childList: true });
      }
    }
  } catch (error) {
    console.error(`Failed to load theme ${theme}:`, error);
    throw error;
  }
}
