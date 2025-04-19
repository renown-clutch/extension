const getExtensionUrl = (path: string): string => {
  const extensionId =
    chrome.runtime.id ||
    document.currentScript?.getAttribute("src")?.split("/")[2] ||
    window.location.href.match(/chrome-extension:\/\/([^\/]+)/)?.[1];

  return `chrome-extension://${extensionId}/${path}`;
};

interface FaceitApiResponse {
  success: boolean;
  data?:
    | string
    | {
        faceit_url?: string;
        [key: string]: any;
      };
  error?: string;
}

const isProfilePageRegex = /\/profile\/\d+/;
let currentPlayerId = "";
let observer: MutationObserver | null = null;
let faceitUrl: string = ""; // Store Faceit URL

function isProfilePage(): boolean {
  return isProfilePageRegex.test(window.location.pathname);
}

async function fetchFaceitUrl(steamId: string): Promise<unknown> {
  try {
    // Send a message to the background script to make the fetch request
    const response = await new Promise<FaceitApiResponse>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "fetchFaceitUrl", steamId },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response as FaceitApiResponse);
          }
        }
      );
    });

    console.log("Faceit URL response from background:", response);
    console.log("Response data type:", typeof response.data);

    // Update faceitUrl if available
    if (response.success && response.data) {
      // Check if data is a string (direct URL) or an object with faceit_url property
      if (typeof response.data === "string") {
        faceitUrl = response.data;
        console.log("Setting faceitUrl from string:", faceitUrl);
      } else if (
        typeof response.data === "object" &&
        response.data.faceit_url
      ) {
        faceitUrl = response.data.faceit_url;
        console.log("Setting faceitUrl from object:", faceitUrl);
      }

      // Force update all buttons immediately
      updateAllButtons();
    }

    return response;
  } catch (error) {
    console.error("Error fetching Faceit URL:", error);
  }
}

function removeFaceitButtons(): void {
  document.querySelectorAll(".clutch-button2").forEach((btn) => btn.remove());
}

function updateAllButtons(): void {
  // Remove all Faceit buttons first
  removeFaceitButtons();
  if (!faceitUrl) return;

  console.log("Updating all Faceit buttons with URL:", faceitUrl);

  // Find all linksDivs and add the Faceit button
  const linksDivs = document.querySelectorAll(".profile-banner div.links");
  linksDivs.forEach((linksDiv) => {
    // Only add if not already present
    if (!linksDiv.querySelector(".clutch-button2")) {
      const button2 = createButton("clutch-button2", faceitUrl, "#ff9800");
      button2.setAttribute("data-clutch-extension", "true");
      linksDiv.appendChild(button2);
      console.log("Added Faceit button to:", linksDiv);
    }
  });
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
  button.style.backgroundColor = bgColor;
  button.addEventListener("mouseover", () => {
    // Lighten the background color on hover
    const lighterColor = bgColor === "#292c34" ? "#333640" : "#ff9800";
    button.style.backgroundColor =
      bgColor === "#292c34" ? "#333640" : "#ffb74d";
  });
  button.addEventListener("mouseout", () => {
    // Restore original color
    button.style.backgroundColor = bgColor;
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
    "#292c34"
  );
  button1.setAttribute("data-clutch-extension", "true");

  const fragment = document.createDocumentFragment();
  fragment.appendChild(button1);

  // Only add Faceit button if faceitUrl is set
  if (faceitUrl) {
    const button2 = createButton("clutch-button2", faceitUrl, "#ff9800");
    button2.setAttribute("data-clutch-extension", "true");
    fragment.appendChild(button2);
    console.log("Set Faceit button href during creation:", faceitUrl);
  }

  linksDiv.appendChild(fragment);

  console.log("Clutch extension: Added buttons to profile page");
}

function updateButtonHref(linksDiv: Element): void {
  const button1 = linksDiv.querySelector(
    ".clutch-button1"
  ) as HTMLAnchorElement;
  if (button1) {
    const newHref = `https://csstats.gg/player/${currentPlayerId}`;
    if (button1.href !== newHref) {
      button1.href = newHref;
      console.log(
        "Clutch extension: Updated button href for player ID:",
        currentPlayerId
      );
    }
  } else {
    addButtons(linksDiv);
  }

  // Update Faceit button if it exists and we have a URL
  const button2 = linksDiv.querySelector(
    ".clutch-button2"
  ) as HTMLAnchorElement;
  if (button2 && faceitUrl) {
    if (button2.href !== faceitUrl) {
      button2.href = faceitUrl;
      console.log("Clutch extension: Updated Faceit button href:", faceitUrl);
    }
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
        // Reset faceitUrl when profile changes
        faceitUrl = "";
        // Remove Faceit button until we get a new response
        removeFaceitButtons();
        // Fetch new faceitUrl for the current profile
        fetchFaceitUrl(currentPlayerId);

        const linksDiv = document.querySelector(".profile-banner div.links");
        if (linksDiv) {
          updateButtonHref(linksDiv);
        } else {
          checkForLinksDiv();
        }
      } else {
        // Not on profile page, remove Faceit button
        removeFaceitButtons();
        faceitUrl = "";
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
      // Always update currentPlayerId to match the current profile page
      const newPlayerId = window.location.pathname.split("/")[2];
      if (newPlayerId !== currentPlayerId) {
        currentPlayerId = newPlayerId;
      }
      if (linksDiv) {
        const button1 = linksDiv.querySelector(".clutch-button1");
        // Only add Faceit button if faceitUrl is set and not already present
        if (!button1) {
          addButtons(linksDiv);
        } else if (faceitUrl && !linksDiv.querySelector(".clutch-button2")) {
          const button2 = createButton("clutch-button2", faceitUrl, "#ff9800");
          button2.setAttribute("data-clutch-extension", "true");
          linksDiv.appendChild(button2);
        }
        updateButtonHref(linksDiv);
      }
    } else {
      // Not on profile page, remove Faceit button
      removeFaceitButtons();
      faceitUrl = "";
    }
  }, 1000);

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

    fetchFaceitUrl(currentPlayerId);
  }

  setupMutationObserver();

  if (document.readyState !== "complete") {
    window.addEventListener("load", () => {
      checkForLinksDiv();
      if (isProfilePage() && currentPlayerId) {
        fetchFaceitUrl(currentPlayerId);
      }
    });
  } else {
    checkForLinksDiv();
    if (isProfilePage() && currentPlayerId) {
      fetchFaceitUrl(currentPlayerId);
    }
  }
}
