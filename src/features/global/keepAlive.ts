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
    if (settings.keepAlive && settings.keepAlive !== lastKeepAlive) {
      if (keepAliveIntervalId !== null) {
        clearInterval(keepAliveIntervalId);
      }
      keepAliveIntervalId = window.setInterval(doKeepAliveAction, 60 * 1000);
      lastKeepAlive = settings.keepAlive;
    } else if (!settings.keepAlive && keepAliveIntervalId !== null) {
      clearInterval(keepAliveIntervalId);
      keepAliveIntervalId = null;
      lastKeepAlive = settings.keepAlive;
    }
  } catch (error) {
    console.error("[KeepAlive] Error in initialization:", error);
  }
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "keepAlive",
  category: "general",
  defaultValue: false,
  description: "Keep extension connection alive",

  shouldActivate: ActivationHelpers.whenEnabled("keepAlive"),

  handler: initializeKeepAlive,

  apiCalls: [],
});
