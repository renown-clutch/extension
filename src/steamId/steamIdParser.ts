import browserAPI from "../lib/browserAPI";

const STEAM_ID_STORAGE_KEY = "userSteamId";
const STEAM_ID_REFRESH_INTERVAL = 10 * 60 * 1000;

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

function parseUserInfoFromDropdown(): {
  steamId: string | null;
  username: string | null;
} {
  if (typeof document === "undefined") {
    console.error(
      "parseUserInfoFromDropdown called from context without document access"
    );
    return { steamId: null, username: null };
  }

  const profileMenu = document.querySelector(".profile-menu");
  if (!profileMenu) {
    return { steamId: null, username: null };
  }

  const dropdown = profileMenu.querySelector(".dropdown");
  if (!dropdown) {
    return { steamId: null, username: null };
  }

  const firstProfileLink = dropdown.querySelector('a[href^="/profile/"]');
  let steamId: string | null = null;
  if (firstProfileLink) {
    const href = firstProfileLink.getAttribute("href");
    if (href) {
      const match = href.match(/\/profile\/(\d+)/);
      steamId = match ? match[1] : null;
    }
  }

  const nameElement = dropdown.querySelector(".name");
  const username = nameElement ? nameElement.textContent?.trim() || null : null;

  return { steamId, username };
}

export async function requestUserDataFromContent(): Promise<SteamIdData> {
  return new Promise((resolve) => {
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].id) {
        resolve({ steamId: null, username: null, timestamp: Date.now() });
        return;
      }

      const activeTab = tabs[0];

      browserAPI.tabs.sendMessage(
        activeTab.id,
        { type: "parseUserData" },
        async (response) => {
          const lastError = browserAPI.runtime.lastError;
          if (lastError) {
            resolve({ steamId: null, username: null, timestamp: Date.now() });
            return;
          }

          if (response && response.success) {
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
      return true;
    }
    return false;
  });
}

async function fetchUserDataIfNeeded(): Promise<SteamIdData> {
  const storedData = await getStoredUserData();
  const currentTime = Date.now();

  const needsRefresh =
    !storedData ||
    currentTime - storedData.timestamp > STEAM_ID_REFRESH_INTERVAL ||
    storedData.steamId === null ||
    storedData.username === null;

  if (needsRefresh) {
    if (typeof document !== "undefined") {
      const { steamId, username } = parseUserInfoFromDropdown();
      if (steamId && username) {
        await storeUserData(steamId, username);
        return { steamId, username, timestamp: currentTime };
      }
    } else {
      return await requestUserDataFromContent();
    }
  }

  return (
    storedData || { steamId: null, username: null, timestamp: currentTime }
  );
}

export async function initializeSteamIdParser(): Promise<void> {
  if (typeof document !== "undefined") {
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
