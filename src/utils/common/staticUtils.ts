import browserAPI from "../lib/browserAPI";

export function getExtensionUrl(path: string): string {
  try {
    if (browserAPI && browserAPI.runtime && browserAPI.runtime.getURL) {
      return browserAPI.runtime.getURL(path);
    }

    if (typeof browser !== "undefined" && browser.runtime) {
      return browser.runtime.getURL(path);
    }

    if (typeof chrome !== "undefined" && chrome.runtime) {
      return chrome.runtime.getURL(path);
    }

    const extensionId =
      document.currentScript?.getAttribute("src")?.split("/")[2] ||
      window.location.href.match(/chrome-extension:\/\/([^\/]+)/)?.[1] ||
      window.location.href.match(/moz-extension:\/\/([^\/]+)/)?.[1];

    const protocol = navigator.userAgent.includes("Firefox")
      ? "moz-extension"
      : "chrome-extension";
    return `${protocol}://${extensionId}/${path}`;
  } catch (error) {
    console.error("Error getting extension URL:", error);
    return path;
  }
}
