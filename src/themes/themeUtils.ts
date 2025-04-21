// Create main style element for the theme
const styleElement = document.createElement("style");
styleElement.id = "clutch-theme";

// Track if theme is already injected
let isThemeInjected = false;
let currentTheme: string | null = null;

// CSS file paths
const DARK_SHEET_PATH = chrome.runtime.getURL("themes/DarkSheet.css");
const LIGHT_SHEET_PATH = chrome.runtime.getURL("themes/LightSheet.css");

console.log("Theme paths:", { DARK_SHEET_PATH, LIGHT_SHEET_PATH });

// Verify theme files exist
async function verifyThemeFiles() {
  // Check if dark theme file exists
  try {
    const darkThemeResponse = await fetch(DARK_SHEET_PATH, { method: "HEAD" });
    console.log(
      `Dark theme file check: ${darkThemeResponse.ok ? "EXISTS" : "MISSING"} (${
        darkThemeResponse.status
      })`
    );
  } catch (error) {
    console.error("Error checking dark theme file:", error);
  }

  // Check if light theme file exists
  try {
    const lightThemeResponse = await fetch(LIGHT_SHEET_PATH, {
      method: "HEAD",
    });
    console.log(
      `Light theme file check: ${
        lightThemeResponse.ok ? "EXISTS" : "MISSING"
      } (${lightThemeResponse.status})`
    );
  } catch (error) {
    console.error("Error checking light theme file:", error);
  }
}

// Run the verification
verifyThemeFiles();

// Cache for loaded stylesheets
const stylesheetCache: Record<string, string> = {};

// Initialize the theme
export async function initialize(theme: string): Promise<void> {
  console.log(`Theme initialize called with theme: "${theme}"`);
  currentTheme = theme;

  if (theme !== "dark" && theme !== "light") {
    console.warn(
      `Invalid theme specified: "${theme}". Expected "dark" or "light"`
    );
    return; // Only proceed for valid themes
  }

  try {
    console.log(`Starting to load and apply theme: ${theme}`);
    await loadAndApplyTheme(theme);
    console.log(`Theme "${theme}" successfully applied`);
  } catch (error) {
    console.error("Failed to initialize theme:", error);
  }
}

// Load stylesheet from URL or cache
async function loadStylesheet(url: string): Promise<string> {
  console.log(`Loading stylesheet from: ${url}`);

  // Return from cache if available
  if (stylesheetCache[url]) {
    console.log(`Using cached stylesheet for: ${url}`);
    return stylesheetCache[url];
  }

  // Otherwise fetch the stylesheet
  console.log(`Fetching stylesheet from: ${url}`);
  try {
    const startTime = Date.now();
    const response = await fetch(url);
    const fetchTime = Date.now() - startTime;
    console.log(`Fetch completed in ${fetchTime}ms`);

    if (!response.ok) {
      console.error(
        `Fetch failed with status: ${response.status} ${response.statusText}`
      );
      console.error(`URL attempted: ${url}`);
      console.error(
        `Response headers:`,
        Object.fromEntries([...response.headers.entries()])
      );
      throw new Error(`Failed to load stylesheet: ${response.statusText}`);
    }

    console.log(`Fetch successful, processing stylesheet from: ${url}`);
    const textStartTime = Date.now();
    const stylesheet = await response.text();
    const textTime = Date.now() - textStartTime;

    console.log(
      `Stylesheet loaded in ${textTime}ms, length: ${stylesheet.length} characters`
    );
    console.log(
      `First 100 chars of stylesheet: ${stylesheet.substring(0, 100)}...`
    );

    stylesheetCache[url] = stylesheet;
    return stylesheet;
  } catch (error) {
    console.error(`Error fetching stylesheet from ${url}:`, error);

    // Try to determine if this is a CORS issue
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      console.error("This might be a CORS issue or the file does not exist");

      // Additional diagnostics for Chrome extensions
      console.log("chrome.runtime.lastError:", chrome.runtime.lastError);
      console.log("Current extension ID:", chrome.runtime.id);

      // Log web accessible resources if available
      try {
        const manifest = chrome.runtime.getManifest();
        console.log(
          "Web accessible resources:",
          JSON.stringify(manifest.web_accessible_resources)
        );
      } catch (e) {
        console.error("Could not access manifest:", e);
      }
    }

    throw error;
  }
}

// Load and apply theme
async function loadAndApplyTheme(theme: string): Promise<void> {
  const url = theme === "dark" ? DARK_SHEET_PATH : LIGHT_SHEET_PATH;
  console.log(`loadAndApplyTheme: Using ${theme} theme from ${url}`);

  try {
    console.log(`Starting stylesheet fetch for ${theme} theme`);
    const stylesheet = await loadStylesheet(url);
    console.log(
      `Stylesheet loaded successfully (${stylesheet.length} chars), applying to DOM...`
    );

    // Apply the stylesheet
    try {
      styleElement.textContent = stylesheet;
      console.log(
        `Stylesheet content set to style element (id: ${styleElement.id})`
      );
    } catch (error) {
      console.error(`Error setting style element content:`, error);
      throw error;
    }

    // Add to document if not already added
    if (!isThemeInjected) {
      console.log(`Theme not yet injected, attempting to add to document.head`);
      if (document.head) {
        console.log(`document.head exists, appending style element`);
        try {
          document.head.appendChild(styleElement);
          isThemeInjected = true;
          console.log(`Theme successfully injected into document.head`);
          console.log(
            `Current head children count: ${document.head.childNodes.length}`
          );
        } catch (error) {
          console.error(`Error appending style to head:`, error);
          throw error;
        }
      } else {
        // If head doesn't exist yet, wait for it
        console.log(`document.head doesn't exist yet, setting up observer`);
        const observer = new MutationObserver(() => {
          if (document.head) {
            console.log(
              `MutationObserver: document.head now exists, appending style element`
            );
            try {
              document.head.appendChild(styleElement);
              isThemeInjected = true;
              observer.disconnect();
              console.log(
                `MutationObserver: Theme injected, observer disconnected`
              );
            } catch (error) {
              console.error(
                `MutationObserver: Error appending style to head:`,
                error
              );
            }
          }
        });
        observer.observe(document.documentElement, { childList: true });
        console.log(`MutationObserver started for document.head`);
      }
    } else {
      console.log(`Theme already injected, content updated`);
    }

    // Check if style is actually in the DOM and functioning
    setTimeout(() => {
      const injectedStyle = document.getElementById("clutch-theme");
      console.log(
        `Style element check: ${injectedStyle ? "FOUND" : "NOT FOUND"} in DOM`
      );
      if (injectedStyle) {
        console.log(
          `Style element content length: ${
            injectedStyle.textContent?.length || 0
          } chars`
        );
        console.log(
          `Is style element connected to DOM: ${injectedStyle.isConnected}`
        );
      }
    }, 100);
  } catch (error) {
    console.error(`Failed to load theme ${theme}:`, error);
    throw error;
  }
}
