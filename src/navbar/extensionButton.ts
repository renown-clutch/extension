const BUTTON_ID = "clutch-extension-navbar-link";

function handleButtonClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  if (typeof chrome !== "undefined") {
    if (chrome.action && typeof chrome.action.openPopup === "function") {
      chrome.action.openPopup();
    } else {
      chrome.runtime.sendMessage({ action: "openPopup" });
    }
  }
}

async function addLinkToNavbar(): Promise<void> {
  if (document.getElementById(BUTTON_ID)) {
    return;
  }

  const linksContainer = document.querySelector(
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

export function initialize(enabled: boolean): void {
  if (!enabled) {
    removeLinkFromNavbar();
    return;
  }

  addLinkToNavbar();
}

export function updateSettings(enabled: boolean): void {
  initialize(enabled);
}
