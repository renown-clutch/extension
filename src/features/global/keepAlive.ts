import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";

let keepAliveIntervalId: number | null = null;
let lastKeepAlive: boolean | undefined = undefined;

function doKeepAliveAction() {
  window.scrollBy(0, 1);
  setTimeout(() => window.scrollBy(0, -1), 100);
}

function initializeKeepAlive(settings: UserSettings): void {
  try {
    // Check if the setting has changed from the last time
    if (settings.keepAlive !== lastKeepAlive) {
      // Clear any existing interval first
      if (keepAliveIntervalId !== null) {
        clearInterval(keepAliveIntervalId);
        keepAliveIntervalId = null;
      }

      // If keepAlive is enabled, start the interval
      if (settings.keepAlive) {
        keepAliveIntervalId = window.setInterval(doKeepAliveAction, 10 * 1000);
        console.log("[KeepAlive] Started - interval every 10 seconds");
      } else {
        console.log("[KeepAlive] Stopped - interval cleared");
      }

      // Update the last known state
      lastKeepAlive = settings.keepAlive;
    }
  } catch (error) {
    console.error("[KeepAlive] Error in initialization:", error);
  }
}

function cleanupKeepAlive(): void {
  if (keepAliveIntervalId !== null) {
    clearInterval(keepAliveIntervalId);
    keepAliveIntervalId = null;
  }
  lastKeepAlive = undefined;
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "keepAlive",
  category: "general",
  defaultValue: false,
  description: "Keep extension connection alive",

  shouldActivate: ActivationHelpers.whenEnabled("keepAlive"),

  handler: initializeKeepAlive,

  cleanupHandler: cleanupKeepAlive,

  apiCalls: [],
});
