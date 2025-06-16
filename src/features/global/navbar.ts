import {
  registerFeature,
  ActivationHelpers,
} from "$system/lib/featureRegistry";
import { type UserSettings } from "$system/lib/types";
import { waitForElement } from "$utils/profileUtils";

const BUTTON_ID = "clutch-extension-navbar-link";

function handleButtonClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  if (typeof chrome !== "undefined") {
    if (chrome.action && typeof chrome.action.openPopup === "function") {
      chrome.action.openPopup();
    } else {
      chrome.runtime.sendMessage({ action: "openPopup" }, () => {
        if (chrome.runtime.lastError) {
          return;
        }
      });
    }
  }
}

async function addLinkToNavbar(): Promise<void> {
  if (document.getElementById(BUTTON_ID)) {
    return;
  }

  const linksContainer = await waitForElement(
    ".navbar .container .content .links"
  );
  if (!linksContainer) {
    return;
  }

  const banlistLink = Array.from(linksContainer.querySelectorAll("a")).find(
    (link) => link.getAttribute("href")?.includes("/banlist")
  );
  if (!banlistLink) {
    return;
  }

  const clutchLink = document.createElement("a");
  clutchLink.id = BUTTON_ID;
  clutchLink.className = "clutch-animate-fade-in-slide-delayed";
  clutchLink.href = "#";
  clutchLink.textContent = "CLUTCH";
  clutchLink.addEventListener("click", handleButtonClick);

  banlistLink.after(clutchLink);
}

function removeLinkFromNavbar(): void {
  const elements = document.querySelectorAll(`#${BUTTON_ID}`);

  elements.forEach((element) => {
    if (element instanceof HTMLElement) {
      element.remove();
    }
  });
}

function initializeNavbar(settings: UserSettings): void {
  try {
    addLinkToNavbar();
  } catch (error) {
    console.error("[Navbar] Error in initialization:", error);
  }
}

// Register this feature with the new unified system
registerFeature({
  settingKey: "showExtensionNavbarButton",
  category: "general",
  defaultValue: true,
  description: "Extension navbar button",

  shouldActivate: ActivationHelpers.whenEnabled("showExtensionNavbarButton"),

  handler: initializeNavbar,
  cleanupHandler: removeLinkFromNavbar,

  apiCalls: [],
});
