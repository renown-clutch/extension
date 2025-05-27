import type { UserSettings } from "../lib/types";

let keepAliveIntervalId: number | null = null;
let lastKeepAlive: boolean | undefined = undefined;

function doKeepAliveAction() {
  window.scrollBy(0, 1);
  setTimeout(() => window.scrollBy(0, -1), 100);
}

export function initializeKeepAlive(settings: UserSettings) {
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
}
