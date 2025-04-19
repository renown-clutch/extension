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
  }

  sendResponse({ status: "received" });
});
