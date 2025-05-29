// Browser API Compatibility Layer

// Add browser global variable declaration for TypeScript
declare global {
  interface FirefoxBrowserActionAPI {
    openPopup(): Promise<void>;
  }

  interface FirefoxBrowserAPI extends Omit<typeof chrome, "browserAction"> {
    browserAction: FirefoxBrowserActionAPI;
  }

  const browser: FirefoxBrowserAPI;
  interface Window {
    browser?: FirefoxBrowserAPI;
  }
}

// Define types for the messaging API
export interface RuntimeMessage {
  type: string;
  [key: string]: any;
}

export type MessageSender = chrome.runtime.MessageSender;
export type SendResponseCallback = (response?: any) => void;

const browserAPI = (function () {
  // Determine if we're running in Chrome or Firefox
  const api = typeof browser !== "undefined" ? browser : chrome;

  return {
    // Runtime API
    runtime: {
      onMessage: {
        addListener: (
          callback: (
            message: RuntimeMessage,
            sender: MessageSender,
            sendResponse: SendResponseCallback
          ) => boolean | void
        ) => api.runtime.onMessage.addListener(callback),
      },
      onInstalled: {
        addListener: (callback: () => void) =>
          api.runtime.onInstalled.addListener(callback),
      },
      onStartup: {
        addListener: (callback: () => void) =>
          api.runtime.onStartup.addListener(callback),
      },
      sendMessage: (
        message: any,
        responseCallback?: (response: any) => void
      ) => {
        if (typeof browser !== "undefined" && browser.runtime) {
          // Firefox - uses Promise-based API
          const promise = browser.runtime.sendMessage(message);
          if (responseCallback) {
            promise.then(responseCallback).catch((error) => {
              if (
                error.message &&
                error.message.includes("Receiving end does not exist")
              ) {
                responseCallback(null);
                return;
              }
              console.warn("Runtime message error:", error);
            });
          }
          return promise.catch((error) => {
            if (
              error.message &&
              error.message.includes("Receiving end does not exist")
            ) {
              return null;
            }
            throw error;
          });
        } else if (api.runtime) {
          // Chrome - convert callback-based API to Promise
          return new Promise((resolve, reject) => {
            const wrappedCallback = (response: any) => {
              if (api.runtime.lastError) {
                const errorMessage = api.runtime.lastError.message;

                // Handle "Receiving end does not exist" gracefully
                if (
                  errorMessage &&
                  errorMessage.includes("Receiving end does not exist")
                ) {
                  resolve(null);
                  if (responseCallback) {
                    responseCallback(null);
                  }
                  return;
                }

                // For other errors, reject the promise
                reject(new Error(errorMessage));
                return;
              }
              resolve(response);
              if (responseCallback) {
                responseCallback(response);
              }
            };
            api.runtime.sendMessage(message, wrappedCallback);
          });
        }
        return Promise.reject(new Error("No runtime API available"));
      },
      getURL: (path: string) => api.runtime.getURL(path),
      get id() {
        try {
          return api.runtime.id;
        } catch (e) {
          return null;
        }
      },
    },

    // Storage API
    storage: {
      local: {
        get: (key: string | string[] | object) => {
          if (typeof browser !== "undefined" && browser.storage) {
            return browser.storage.local.get(key);
          }
          return new Promise((resolve) => {
            api.storage.local.get(key, resolve);
          });
        },
        set: (obj: object) => {
          if (typeof browser !== "undefined" && browser.storage) {
            return browser.storage.local.set(obj);
          }
          return new Promise((resolve) => {
            api.storage.local.set(obj, () => resolve(undefined));
          });
        },
        remove: (keys: string | string[]) => {
          if (typeof browser !== "undefined" && browser.storage) {
            return browser.storage.local.remove(keys);
          }
          return new Promise((resolve) => {
            api.storage.local.remove(keys, () => resolve(undefined));
          });
        },
      },
    },

    // Action/Browser Action API (handles both Chrome action and Firefox browserAction)
    action: {
      openPopup: () => {
        try {
          // Always defer to the background script for opening popups
          // as it has the necessary permissions in both browsers
          if (typeof browser !== "undefined" && browser.runtime) {
            return browser.runtime.sendMessage({ action: "openPopup" });
          } else if (typeof chrome !== "undefined" && chrome.runtime) {
            chrome.runtime.sendMessage({ action: "openPopup" });
          }
        } catch (error) {}

        return Promise.resolve();
      },
    },

    // Determine if the extension context is valid
    isContextValid: () => {
      try {
        return !!api.runtime.id;
      } catch (e) {
        return false;
      }
    },

    // Tabs API
    tabs: {
      query: (
        queryInfo: {
          active?: boolean;
          currentWindow?: boolean;
          url?: string | string[];
        },
        callback: (
          tabs: Array<{
            id?: number;
            url?: string;
            active?: boolean;
          }>
        ) => void
      ) => {
        return api.tabs.query(queryInfo, callback);
      },
      sendMessage: (
        tabId: number,
        message: any,
        responseCallback?: (response: any) => void
      ) => {
        if (typeof browser !== "undefined" && browser.tabs) {
          const promise = browser.tabs.sendMessage(tabId, message);
          if (responseCallback) {
            promise.then(responseCallback).catch((error) => {
              // Silently handle "Receiving end does not exist" errors
              if (
                error.message &&
                error.message.includes("Receiving end does not exist")
              ) {
                return;
              }
              console.warn("Tab message error:", error);
            });
          } else {
            promise.catch((error) => {
              // Silently handle "Receiving end does not exist" errors
              if (
                error.message &&
                error.message.includes("Receiving end does not exist")
              ) {
                return;
              }
              console.warn("Tab message error:", error);
            });
          }
          return promise;
        } else if (api.tabs) {
          const wrappedCallback = responseCallback
            ? (response: any) => {
                // Check for lastError and handle silently
                if (api.runtime.lastError) {
                  // Silently handle "Receiving end does not exist" errors
                  return;
                }
                responseCallback(response);
              }
            : () => {
                // Default callback to handle lastError
                if (api.runtime.lastError) {
                  // Silently handle "Receiving end does not exist" errors
                  return;
                }
              };
          return api.tabs.sendMessage(tabId, message, wrappedCallback);
        }
      },
    },
  };
})();

export default browserAPI;
