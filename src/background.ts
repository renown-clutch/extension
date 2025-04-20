// Example background script
console.log("Background script loaded");

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message);

  if (message.type === "fetchFaceitUrl") {
    const steamId = message.steamId;

    fetch(`https://api.clutch.lorem.sh/get_user_faceit_url?steam_id=${steamId}`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Faceit URL response in background:", data);
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error("Error fetching Faceit URL in background:", error);
        sendResponse({ success: false, error: error.toString() });
      });

    // Return true to indicate that we will send a response asynchronously
    return true;
  } else if (message.type === "fetchUserBans") {
    const steamId = message.steamId;

    fetch(`https://api.clutch.lorem.sh/get_user_bans?steam_id=${steamId}`)
      .then((response) => response.json())
      .then((data) => {
        console.log("User bans response in background:", data);
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error("Error fetching user bans in background:", error);
        sendResponse({ success: false, error: error.toString() });
      });

    return true;
  } else if (message.type === "fetchUserDrops") {
    const steamId = message.steamId;

    fetch(`https://api.clutch.lorem.sh/get_user_drops?steam_id=${steamId}`)
      .then((response) => response.json())
      .then((data) => {
        console.log("User drops response in background:", data);
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error("Error fetching user drops in background:", error);
        sendResponse({ success: false, error: error.toString() });
      });

    return true;
  }
});
