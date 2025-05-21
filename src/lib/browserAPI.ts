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
          // Firefox returns a promise
          const promise = browser.runtime.sendMessage(message);
          if (responseCallback) {
            promise.then(responseCallback).catch((error) => {});
          }
          return promise;
        } else if (api.runtime) {
          // Chrome takes a callback
          return api.runtime.sendMessage(message, responseCallback);
        }
      },
      getURL: (path: string) => api.runtime.getURL(path),
      // Add the id property as a getter that handles both browsers
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
  };
})();

export default browserAPI;
