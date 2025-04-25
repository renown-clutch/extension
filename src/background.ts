// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

// Helper function to safely parse JSON with detailed error handling
async function safeJsonParse(response: Response): Promise<any> {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error: unknown) {
    console.error("JSON parse error:", error);
    console.error("Status code:", response.status);
    console.error("Status text:", response.statusText);
    console.error("Response headers:", [...response.headers.entries()]);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse JSON: ${errorMessage}. Raw response: ${text}`
    );
  }
}

// Base URL for API calls
const API_BASE_URL = "https://api.clutch.lorem.sh"; // Updated to use the same API as other features

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "get_faceit_info" && message.steam_ids) {
    getFaceitInfo(message.steam_ids)
      .then(sendResponse)
      .catch((error) => {
        console.error("Error getting Faceit info:", error);
        sendResponse({});
      });
    return true; // Indicates async response
  } else if (message.type === "fetchUserBans") {
    const steamId = message.steamId;

    fetch(`https://api.clutch.lorem.sh/get_user_bans?steam_id=${steamId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}: ${response.statusText}`
          );
        }
        return safeJsonParse(response);
      })
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error: unknown) => {
        console.error("Error fetching user bans in background:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        sendResponse({
          success: false,
          error: String(error),
          details: errorMessage,
        });
      });

    return true;
  } else if (message.type === "fetchUserDrops") {
    const steamId = message.steamId;

    fetch(`https://api.clutch.lorem.sh/get_user_drops?steam_id=${steamId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}: ${response.statusText}`
          );
        }
        return safeJsonParse(response);
      })
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error: unknown) => {
        console.error("Error fetching user drops in background:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        sendResponse({
          success: false,
          error: String(error),
          details: errorMessage,
        });
      });

    return true;
  } else if (message.type === "fetchProfileData") {
    const steamId = message.steamId;

    fetch(`https://api.clutch.lorem.sh/get_profile_data?steam_id=${steamId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}: ${response.statusText}`
          );
        }
        return safeJsonParse(response);
      })
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error: unknown) => {
        console.error("Error fetching profile data in background:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        sendResponse({
          success: false,
          error: String(error),
          details: errorMessage,
        });
      });

    return true;
  } else if (message.type === "fetchUsersRanks") {
    const steamIds = message.steamIds;

    fetch(`https://api.clutch.lorem.sh/get_users_ranks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        steam_ids: steamIds,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}: ${response.statusText}`
          );
        }
        return safeJsonParse(response);
      })
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error: unknown) => {
        console.error("Error fetching users ranks in background:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        sendResponse({
          success: false,
          error: String(error),
          details: errorMessage,
        });
      });

    return true;
  } else if (message.action === "openPopup") {
    chrome.action.openPopup();
    return true;
  }
});

/**
 * Get Faceit info for the given Steam IDs
 */
async function getFaceitInfo(steamIds: string[]): Promise<Record<string, any>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/get_users_faceit_elo_and_url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          steam_ids: steamIds,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Faceit info: ${response.status} ${response.statusText}`
      );
    }

    const data = await safeJsonParse(response);
    return data;
  } catch (error) {
    console.error("Error fetching Faceit info:", error);
    // Return empty object as fallback
    return {};
  }
}
