console.log("Clutch extension content script loaded");

import { initialize } from "./themes/themeUtils";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initialize());
} else {
  initialize();
}

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === "updateColors") {
//     applyColorVariables(colorVariablesStyleElement);
//     sendResponse({ status: "colors updated" });
//   }
//   return true;
// });
