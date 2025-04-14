const getExtensionUrl = (path: string): string => {
  const extensionId =
    chrome.runtime.id ||
    document.currentScript?.getAttribute("src")?.split("/")[2] ||
    window.location.href.match(/chrome-extension:\/\/([^\/]+)/)?.[1];

  return `chrome-extension://${extensionId}/${path}`;
};

const isProfilePageRegex = /\/profile\/\d+/;
let currentPlayerId = "";
let observer: MutationObserver | null = null;

function isProfilePage(): boolean {
  return isProfilePageRegex.test(window.location.pathname);
}

function createButton(
  className: string,
  href: string,
  bgColor: string
): HTMLAnchorElement {
  const button = document.createElement("a");
  button.className = className;
  button.target = "_blank";
  button.href = href;
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.height = "40px";
  button.style.width = "40px";
  button.style.borderRadius = "4px";
  button.style.color = "#000";
  button.style.backgroundColor = "#292c34";
  button.addEventListener("mouseover", () => {
    button.style.backgroundColor = "#333640"; // 10% lighter color
  });
  button.addEventListener("mouseout", () => {
    button.style.backgroundColor = "#292c34"; // Original color
  });

  const img = document.createElement("img");
  img.src = getExtensionUrl("static/csstats.svg");
  img.style.width = "24px";
  img.style.height = "24px";
  button.appendChild(img);

  return button;
}

function addButtons(linksDiv: Element): void {
  const button1 = createButton(
    "clutch-button1",
    `https://csstats.gg/player/${currentPlayerId}`,
    "gray"
  );
  button1.setAttribute("data-clutch-extension", "true");

  // const button2 = createButton("clutch-button2", "#", "#ff9800");
  // button2.setAttribute("data-clutch-extension", "true");

  const fragment = document.createDocumentFragment();
  fragment.appendChild(button1);
  // fragment.appendChild(button2);

  linksDiv.appendChild(fragment);

  console.log("Clutch extension: Added buttons to profile page");
}

function updateButtonHref(linksDiv: Element): void {
  const button = linksDiv.querySelector(".clutch-button1") as HTMLAnchorElement;
  if (button) {
    button.href = `https://csstats.gg/player/${currentPlayerId}`;
    console.log(
      "Clutch extension: Updated button href for player ID:",
      currentPlayerId
    );
  } else {
    addButtons(linksDiv);
  }
}

function setupMutationObserver(): void {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations) => {
    if (!isProfilePage()) return;

    const linksDiv = document.querySelector(".profile-banner div.links");
    if (linksDiv && !linksDiv.querySelector(".clutch-button1")) {
      addButtons(linksDiv);
    }
  });

  // Make sure body exists before observing
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } else {
    // If body doesn't exist yet, wait for it
    document.addEventListener("DOMContentLoaded", () => {
      if (observer) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    });
  }

  // Handle URL changes more robustly
  let lastUrl = location.href;
  const checkForUrlChanges = () => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;

      if (isProfilePage()) {
        currentPlayerId = window.location.pathname.split("/")[2];
        const linksDiv = document.querySelector(".profile-banner div.links");
        if (linksDiv) {
          updateButtonHref(linksDiv);
        } else {
          checkForLinksDiv();
        }
      }
    }
  };

  // Check for URL changes using multiple approaches
  window.addEventListener("popstate", checkForUrlChanges);
  window.addEventListener("hashchange", checkForUrlChanges);

  // Also set up a small interval to periodically check for our buttons
  // This acts as a fallback in case the DOM changes aren't caught by the observer
  const buttonCheckInterval = setInterval(() => {
    if (isProfilePage()) {
      const linksDiv = document.querySelector(".profile-banner div.links");
      if (linksDiv) {
        const button = linksDiv.querySelector(".clutch-button1");
        if (!button) {
          addButtons(linksDiv);
        } else {
          // Always update href in case profile ID changed
          currentPlayerId = window.location.pathname.split("/")[2];
          updateButtonHref(linksDiv);
        }
      }
    }
  }, 1000); // Check every second

  // Clean up interval on page unload
  window.addEventListener("beforeunload", () => {
    clearInterval(buttonCheckInterval);
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  });
}

function checkForLinksDiv(): void {
  if (!isProfilePage()) return;

  const linksDiv = document.querySelector(".profile-banner div.links");
  if (linksDiv) {
    const button = linksDiv.querySelector(".clutch-button1");
    if (button) {
      updateButtonHref(linksDiv);
    } else {
      addButtons(linksDiv);
    }
  }
}

export function initialize(): void {
  if (isProfilePage()) {
    currentPlayerId = window.location.pathname.split("/")[2];
    checkForLinksDiv();
  }

  setupMutationObserver();

  // Check again after load to ensure we don't miss anything
  if (document.readyState !== "complete") {
    window.addEventListener("load", checkForLinksDiv);
  } else {
    // If page is already loaded, check now
    checkForLinksDiv();
  }
}
