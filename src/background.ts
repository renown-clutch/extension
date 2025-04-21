// Example background script
console.log("Background script loaded");

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

// Helper function to safely parse JSON with detailed error handling
async function safeJsonParse(response: Response): Promise<any> {
  const text = await response.text();
  console.log("Raw API response:", text);

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

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message);

  if (message.type === "fetchFaceitUrl") {
    const steamId = message.steamId;
    console.log("Fetching Faceit URL for Steam ID:", steamId);

    fetch(
      `https://api.clutch.lorem.sh/get_user_faceit_elo_and_url?steam_id=${steamId}`
    )
      .then(async (response) => {
        console.log(
          "Faceit data response status:",
          response.status,
          response.statusText
        );
        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}: ${response.statusText}`
          );
        }
        return safeJsonParse(response);
      })
      .then((data) => {
        console.log("Faceit data response in background:", data);
        sendResponse({ success: true, data });
      })
      .catch((error: unknown) => {
        console.error("Error fetching Faceit data in background:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        sendResponse({
          success: false,
          error: String(error),
          details: errorMessage,
        });
      });

    // Return true to indicate that we will send a response asynchronously
    return true;
  } else if (message.type === "fetchUserBans") {
    const steamId = message.steamId;
    console.log("Fetching bans for Steam ID:", steamId);

    fetch(`https://api.clutch.lorem.sh/get_user_bans?steam_id=${steamId}`)
      .then(async (response) => {
        console.log(
          "User bans response status:",
          response.status,
          response.statusText
        );
        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}: ${response.statusText}`
          );
        }
        return safeJsonParse(response);
      })
      .then((data) => {
        console.log("User bans response in background:", data);
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
    console.log("Fetching drops for Steam ID:", steamId);

    fetch(`https://api.clutch.lorem.sh/get_user_drops?steam_id=${steamId}`)
      .then(async (response) => {
        console.log(
          "User drops response status:",
          response.status,
          response.statusText
        );
        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}: ${response.statusText}`
          );
        }
        return safeJsonParse(response);
      })
      .then((data) => {
        console.log("User drops response in background:", data);
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
  } else if (message.type === "fetchUsersRanks") {
    const steamIds = message.steamIds;
    console.log("Fetching ranks for Steam IDs:", steamIds.length, "users");

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
        console.log(
          "Users ranks response status:",
          response.status,
          response.statusText
        );
        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}: ${response.statusText}`
          );
        }
        return safeJsonParse(response);
      })
      .then((data) => {
        console.log("Users ranks response in background:", data);
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
  }
});
