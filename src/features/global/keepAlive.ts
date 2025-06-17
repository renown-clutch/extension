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
    if (settings.keepAlive !== lastKeepAlive) {
      if (keepAliveIntervalId !== null) {
        clearInterval(keepAliveIntervalId);
        keepAliveIntervalId = null;
      }

      if (settings.keepAlive) {
        keepAliveIntervalId = window.setInterval(doKeepAliveAction, 10 * 1000);
      }

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
