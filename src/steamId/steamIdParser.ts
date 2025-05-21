import browserAPI from "../lib/browserAPI";

const STEAM_ID_STORAGE_KEY = "userSteamId";
const STEAM_ID_REFRESH_INTERVAL = 60 * 60 * 1000;

interface SteamIdData {
  steamId: string;
  timestamp: number;
}

async function getStoredSteamId(): Promise<SteamIdData | null> {
  try {
    const result = (await browserAPI.storage.local.get(
      STEAM_ID_STORAGE_KEY
    )) as Record<string, SteamIdData>;
    return result[STEAM_ID_STORAGE_KEY] || null;
  } catch (error) {
    console.error("Error loading steam ID from storage:", error);
    return null;
  }
}

async function storeSteamId(steamId: string): Promise<void> {
  try {
    const data: SteamIdData = {
      steamId,
      timestamp: Date.now(),
    };
    await browserAPI.storage.local.set({ [STEAM_ID_STORAGE_KEY]: data });
  } catch (error) {
    console.error("Error storing steam ID:", error);
  }
}

async function parseSteamIdFromDropdown(): Promise<string | null> {
  const profileMenu = document.querySelector(".profile-menu");
  if (!profileMenu) return null;

  const dropdown = profileMenu.querySelector(".dropdown");
  if (!dropdown) return null;

  const firstProfileLink = dropdown.querySelector('a[href^="/profile/"]');
  if (!firstProfileLink) return null;

  const href = firstProfileLink.getAttribute("href");
  if (!href) return null;

  const match = href.match(/\/profile\/(\d+)/);
  return match ? match[1] : null;
}

export async function initializeSteamIdParser(): Promise<void> {
  const storedData = await getStoredSteamId();
  const currentTime = Date.now();

  if (
    storedData &&
    currentTime - storedData.timestamp < STEAM_ID_REFRESH_INTERVAL
  ) {
    return;
  }

  const steamId = await parseSteamIdFromDropdown();
  if (steamId) {
    await storeSteamId(steamId);
  }
}

export async function getUserSteamId(): Promise<string | null> {
  const storedData = await getStoredSteamId();
  const currentTime = Date.now();

  if (
    storedData &&
    currentTime - storedData.timestamp < STEAM_ID_REFRESH_INTERVAL
  ) {
    return storedData.steamId;
  }

  const steamId = await parseSteamIdFromDropdown();
  if (steamId) {
    await storeSteamId(steamId);
    return steamId;
  }

  return null;
}
