import browserAPI from "../lib/browserAPI";

const STEAM_ID_STORAGE_KEY = "userSteamId";
const STEAM_ID_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

interface SteamIdData {
  steamId: string | null;
  username: string | null;
  timestamp: number;
}

async function getStoredUserData(): Promise<SteamIdData | null> {
  try {
    const result = (await browserAPI.storage.local.get(
      STEAM_ID_STORAGE_KEY
    )) as Record<string, SteamIdData>;
    return result[STEAM_ID_STORAGE_KEY] || null;
  } catch (error) {
    console.error("Error loading user data from storage:", error);
    return null;
  }
}

async function storeUserData(
  steamId: string | null,
  username: string | null
): Promise<void> {
  try {
    const data: SteamIdData = {
      steamId,
      username,
      timestamp: Date.now(),
    };
    await browserAPI.storage.local.set({ [STEAM_ID_STORAGE_KEY]: data });
  } catch (error) {
    console.error("Error storing user data:", error);
  }
}

// This function can only be called from content script where document is available
function parseUserInfoFromDropdown(): {
  steamId: string | null;
  username: string | null;
} {
  // Check if we're in a context with access to document
  if (typeof document === "undefined") {
    console.error(
      "parseUserInfoFromDropdown called from context without document access"
    );
    return { steamId: null, username: null };
  }

  const profileMenu = document.querySelector(".profile-menu");
  if (!profileMenu) return { steamId: null, username: null };

  const dropdown = profileMenu.querySelector(".dropdown");
  if (!dropdown) return { steamId: null, username: null };

  // Parse Steam ID
  const firstProfileLink = dropdown.querySelector('a[href^="/profile/"]');
  let steamId: string | null = null;
  if (firstProfileLink) {
    const href = firstProfileLink.getAttribute("href");
    if (href) {
      const match = href.match(/\/profile\/(\d+)/);
      steamId = match ? match[1] : null;
    }
  }

  // Parse username
  const nameElement = dropdown.querySelector(".name");
  const username = nameElement ? nameElement.textContent?.trim() || null : null;

  return { steamId, username };
}

// Function to request data parse from content script
export async function requestUserDataFromContent(): Promise<SteamIdData> {
  return new Promise((resolve) => {
    // Try to send a message to content script to parse the data
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].id) {
        // No active tab, return empty data
        resolve({ steamId: null, username: null, timestamp: Date.now() });
        return;
      }

      browserAPI.tabs.sendMessage(
        tabs[0].id,
        { type: "parseUserData" },
        async (response) => {
          if (response && response.success) {
            // Store the data we received
            await storeUserData(response.steamId, response.username);
            resolve({
              steamId: response.steamId,
              username: response.username,
              timestamp: Date.now(),
            });
          } else {
            resolve({ steamId: null, username: null, timestamp: Date.now() });
          }
        }
      );
    });
  });
}

// This needs to be called from content script to setup message listener
export function setupUserDataMessageListener(): void {
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "parseUserData") {
      const { steamId, username } = parseUserInfoFromDropdown();
      if (steamId && username) {
        storeUserData(steamId, username).then(() => {
          sendResponse({ success: true, steamId, username });
        });
      } else {
        sendResponse({ success: false });
      }
      return true; // Indicates async response
    }
    return false;
  });
}

async function fetchUserDataIfNeeded(): Promise<SteamIdData> {
  const storedData = await getStoredUserData();
  const currentTime = Date.now();

  // Refresh data if it's null, expired, or missing steamId or username
  const needsRefresh =
    !storedData ||
    currentTime - storedData.timestamp > STEAM_ID_REFRESH_INTERVAL ||
    storedData.steamId === null ||
    storedData.username === null;

  if (needsRefresh) {
    // Check if we have access to document to parse data
    if (typeof document !== "undefined") {
      const { steamId, username } = parseUserInfoFromDropdown();
      if (steamId && username) {
        await storeUserData(steamId, username);
        return { steamId, username, timestamp: currentTime };
      }
    } else {
      // In background script, try to request data from content script
      return await requestUserDataFromContent();
    }
  }

  return (
    storedData || { steamId: null, username: null, timestamp: currentTime }
  );
}

export async function initializeSteamIdParser(): Promise<void> {
  if (typeof document !== "undefined") {
    // In content script context, setup listener
    setupUserDataMessageListener();
  }
  await fetchUserDataIfNeeded();
}

export async function getUserSteamId(): Promise<string | null> {
  const userData = await fetchUserDataIfNeeded();
  return userData.steamId;
}

export async function getUserUsername(): Promise<string | null> {
  const userData = await fetchUserDataIfNeeded();
  return userData.username;
}

export async function getUserInfo(): Promise<{
  steamId: string | null;
  username: string | null;
}> {
  const userData = await fetchUserDataIfNeeded();
  return {
    steamId: userData.steamId,
    username: userData.username,
  };
}
