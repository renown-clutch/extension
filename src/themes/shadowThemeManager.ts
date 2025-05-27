const registeredShadowRoots = new Set<ShadowRoot>();

function registerShadowRoot(shadowRoot: ShadowRoot): void {
  registeredShadowRoots.add(shadowRoot);
  applyThemeToShadowRoot(shadowRoot);
}

function unregisterShadowRoot(shadowRoot: ShadowRoot): void {
  registeredShadowRoots.delete(shadowRoot);
}

function applyThemeToShadowRoot(shadowRoot: ShadowRoot): void {
  const currentTheme =
    localStorage.getItem("clutch-theme-preference") || "default";

  const hostElement = (shadowRoot as any).host;
  if (hostElement) {
    const themeClass =
      currentTheme === "default" ? "theme-dark" : `theme-${currentTheme}`;
    hostElement.classList.add(themeClass);
  }

  const cssCache = localStorage.getItem("clutch-css-cache");
  if (cssCache) {
    try {
      const parsedCache = JSON.parse(cssCache);
      if (parsedCache.cache) {
        const cache = parsedCache.cache;
        const stylesToInject = ["unified", "features"];
        if (currentTheme !== "default") {
          stylesToInject.push("common");
        }

        stylesToInject.forEach((styleType) => {
          if (cache[styleType]) {
            const cssContent =
              typeof cache[styleType] === "string"
                ? cache[styleType]
                : cache[styleType].css || cache[styleType].content || "";

            if (cssContent) {
              injectStyleIntoShadowRoot(
                shadowRoot,
                cssContent,
                `clutch-${styleType}-shadow`
              );
            }
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
  if (typeof css !== "string") {
    console.error(`Expected CSS string for ${id}, but got:`, typeof css, css);
    return;
  }

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
  registeredShadowRoots.forEach((shadowRoot) => {
    const hostElement = (shadowRoot as any).host;
    if (hostElement) {
      hostElement.classList.forEach((className: string) => {
        if (className.startsWith("theme-")) {
          hostElement.classList.remove(className);
        }
      });

      const themeClass = theme === "default" ? "theme-dark" : `theme-${theme}`;
      hostElement.classList.add(themeClass);
    }
  });
}

export {
  registerShadowRoot,
  unregisterShadowRoot,
  applyThemeToAllShadowRoots,
  updateShadowRootThemeClasses,
};
