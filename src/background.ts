// Example background script
console.log('Background script loaded');

// Register a listener for extension installation or update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Clutch extension installed or updated');
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward theme-related messages to the content script
  if (message.type === 'updateTheme' || message.type === 'toggleTheme' || message.type === 'getThemeInfo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, message, sendResponse);
      }
    });
    return true; // Keep the message channel open for async response
  }
  return false;
}); 