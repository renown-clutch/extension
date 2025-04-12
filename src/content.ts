console.log("Clutch extension content script loaded");

import { initialize } from "./themes/themeUtils";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initialize());
} else {
  initialize();
}
