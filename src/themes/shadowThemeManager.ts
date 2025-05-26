// Shadow root theme management
const registeredShadowRoots = new Set<ShadowRoot>();

function registerShadowRoot(shadowRoot: ShadowRoot): void {
  registeredShadowRoots.add(shadowRoot);

  // Apply current theme styles to the new shadow root
  applyThemeToShadowRoot(shadowRoot);
}

function unregisterShadowRoot(shadowRoot: ShadowRoot): void {
  registeredShadowRoots.delete(shadowRoot);
}

function applyThemeToShadowRoot(shadowRoot: ShadowRoot): void {
  const currentTheme =
    localStorage.getItem("clutch-theme-preference") || "default";

  // Apply theme class to shadow root's host element if it exists
  const hostElement = (shadowRoot as any).host;
  if (hostElement && currentTheme !== "default") {
    const themeClass = `theme-${currentTheme}`;
    hostElement.classList.add(themeClass);
  }

  // Inject styles into shadow root
  const cssCache = localStorage.getItem("clutch-css-cache");
  if (cssCache) {
    try {
      const parsedCache = JSON.parse(cssCache);
      if (parsedCache.cache) {
        const cache = parsedCache.cache;

        // Inject unified and features styles
        const stylesToInject = ["unified", "features"];

        // Only inject common styles if theme is not default
        if (currentTheme !== "default") {
          stylesToInject.push("common");
        }

        stylesToInject.forEach((styleType) => {
          if (cache[styleType]) {
            injectStyleIntoShadowRoot(
              shadowRoot,
              cache[styleType],
              `clutch-${styleType}-shadow`
            );
          }
        });
      }
    } catch (error) {
      console.error("Failed to apply cached styles to shadow root:", error);
    }
  }
}

function injectStyleIntoShadowRoot(
  shadowRoot: ShadowRoot,
  css: string,
  id: string
): void {
  // Remove existing style with same id
  const existingStyle = shadowRoot.querySelector(`#${id}`);
  if (existingStyle) {
    existingStyle.remove();
  }

  const styleElement = document.createElement("style");
  styleElement.id = id;
  styleElement.textContent = css;
  shadowRoot.appendChild(styleElement);
}

function applyThemeToAllShadowRoots(): void {
  registeredShadowRoots.forEach((shadowRoot) => {
    applyThemeToShadowRoot(shadowRoot);
  });
}

function updateShadowRootThemeClasses(theme: string): void {
  // Remove existing theme classes from shadow root host elements
  registeredShadowRoots.forEach((shadowRoot) => {
    const hostElement = (shadowRoot as any).host;
    if (hostElement) {
      hostElement.classList.forEach((className: string) => {
        if (className.startsWith("theme-")) {
          hostElement.classList.remove(className);
        }
      });

      // Apply new theme class if not default
      if (theme !== "default") {
        const themeClass = `theme-${theme}`;
        hostElement.classList.add(themeClass);
      }
    }
  });
}

export {
  registerShadowRoot,
  unregisterShadowRoot,
  applyThemeToAllShadowRoots,
  updateShadowRootThemeClasses,
};
