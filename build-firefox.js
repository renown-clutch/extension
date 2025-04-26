import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const buildDir = path.join(__dirname, 'dist');
const firefoxDir = path.join(__dirname, 'dist-firefox');

// Ensure Firefox build directory exists
if (!fs.existsSync(firefoxDir)) {
  fs.mkdirSync(firefoxDir, { recursive: true });
}

// First make sure we have a production build
console.log('Building extension for production...');
execSync('npm run build', { stdio: 'inherit' });

// Copy all files from dist to firefox-dist
console.log('Copying files to Firefox build directory...');
execSync(`cp -r ${buildDir}/* ${firefoxDir}/`);

// Create a proven working polyfill
function createWorkingPolyfill() {
  console.log('Creating Firefox browser polyfill...');
  
  // This is a simple but working polyfill for basic browser/chrome compatibility
  const polyfillScript = `// Firefox/Chrome compatibility polyfill
if (typeof browser === 'undefined') {
  // Running in Chrome, make 'browser' available
  window.browser = {
    runtime: {
      sendMessage: chrome.runtime.sendMessage,
      onMessage: chrome.runtime.onMessage,
      getURL: chrome.runtime.getURL,
      id: chrome.runtime.id
    },
    storage: {
      local: {
        get: function(items) {
          return new Promise((resolve) => {
            chrome.storage.local.get(items, resolve);
          });
        },
        set: function(items) {
          return new Promise((resolve) => {
            chrome.storage.local.set(items, () => resolve());
          });
        }
      }
    },
    tabs: {
      query: function(options) {
        return new Promise((resolve) => {
          chrome.tabs.query(options, resolve);
        });
      },
      sendMessage: function(tabId, message) {
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(tabId, message, resolve);
        });
      },
      reload: function(tabId) {
        return new Promise((resolve) => {
          chrome.tabs.reload(tabId, resolve);
        });
      }
    }
  };
} else if (typeof chrome === 'undefined') {
  // Running in Firefox, make 'chrome' available
  window.chrome = {
    runtime: {
      sendMessage: function(message, callback) {
        if (callback) {
          browser.runtime.sendMessage(message).then(callback, (error) => {
            console.error("Error sending message:", error);
            callback(null);
          });
        } else {
          return browser.runtime.sendMessage(message);
        }
      },
      onMessage: browser.runtime.onMessage,
      getURL: browser.runtime.getURL,
      id: browser.runtime.id
    },
    storage: {
      local: {
        get: function(items, callback) {
          browser.storage.local.get(items).then(callback);
        },
        set: function(items, callback) {
          browser.storage.local.set(items).then(() => {
            if (callback) callback();
          });
        }
      }
    },
    tabs: {
      query: function(options, callback) {
        browser.tabs.query(options).then(callback);
      },
      sendMessage: function(tabId, message, callback) {
        browser.tabs.sendMessage(tabId, message).then(callback);
      },
      reload: function(tabId, callback) {
        browser.tabs.reload(tabId).then(() => {
          if (callback) callback();
        });
      }
    },
    action: {
      // This will not work in Firefox, but prevents errors when code tries to use it
      openPopup: function() {
        console.warn("action.openPopup() is not supported in Firefox");
      }
    }
  };
}`;

  const polyfillPath = path.join(firefoxDir, 'browser-polyfill.js');
  fs.writeFileSync(polyfillPath, polyfillScript);
}

// Create our polyfill and modify the manifest
createWorkingPolyfill();
modifyManifest();

function modifyManifest() {
  // Modify manifest.json for Firefox
  console.log('Adjusting manifest.json for Firefox...');
  const manifestPath = path.join(firefoxDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Ensure browser_specific_settings exists
  if (!manifest.browser_specific_settings) {
    manifest.browser_specific_settings = {
      gecko: {
        id: "clutch-extension@lorem.sh",
        strict_min_version: "109.0"
      }
    };
  }

  // Insert the browser-polyfill.js script into content_scripts and background
  if (manifest.content_scripts && manifest.content_scripts.length > 0) {
    // Add browser-polyfill.js at the beginning of each content script
    manifest.content_scripts.forEach(script => {
      if (script.js && script.js.length > 0) {
        script.js.unshift('browser-polyfill.js');
      }
      
      // Remove 'type' property - not supported in Firefox
      if (script.hasOwnProperty('type')) {
        delete script.type;
      }
    });
  }

  // Package background scripts with the polyfill
  if (manifest.background) {
    if (manifest.background.service_worker) {
      // Create a scripts array for manifest v3 in Firefox
      const serviceWorker = manifest.background.service_worker;
      
      // For Firefox, use scripts instead of service_worker
      manifest.background.scripts = ['browser-polyfill.js', serviceWorker];
      
      // Remove type property if it exists
      if (manifest.background.hasOwnProperty('type')) {
        delete manifest.background.type;
      }
    }
  }

  // Write the updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('Firefox build complete! Files are in the dist-firefox directory.');
  console.log('You can load this as a temporary extension in Firefox or package it with web-ext.');
} 