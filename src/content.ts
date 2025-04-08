// Example content script
console.log('Content script loaded');

// Example: Send a message to the background script
chrome.runtime.sendMessage({ type: 'contentScriptLoaded' }, (response) => {
  console.log('Response from background:', response);
});

// Example: Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  sendResponse({ status: 'received in content script' });
}); 