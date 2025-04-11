import {
  colorMappings,
  rgbMappings,
  rgbaMappings,
  cssVariables,
} from "./Light";

// Create main style element for the theme
const styleElement = document.createElement("style");
styleElement.id = "clutch-theme";

// Track processed elements to avoid duplicates
const processedElements = new Set<string>();

// Initialize the theme
export function initialize(): void {
  console.log("Clutch theme initializing");

  // First apply CSS variables
  injectCSSVariables();

  // Process all stylesheets
  processAllStylesheets();

  // Process all existing inline styles
  processAllInlineStyles();

  // Set up observer for dynamically added elements and stylesheets
  observeDOMChanges();

  console.log("Clutch theme initialized");
}

// Inject CSS variables
function injectCSSVariables(): void {
  let css = `:root {
    ${cssVariables}
  }\n`;

  // Add style blocker to prevent flash of original colors
  css += `* {
    transition: none !important;
  }\n`;

  styleElement.textContent = css;

  // Add the style element to the document
  if (document.head) {
    document.head.appendChild(styleElement);
  } else {
    // If head doesn't exist yet, wait for it
    const observer = new MutationObserver(() => {
      if (document.head) {
        document.head.appendChild(styleElement);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true });
  }
}

// Apply color replacements to any CSS text
function replaceCSSColors(css: string): { result: string; modified: boolean } {
  let result = css;
  let modified = false;

  // Find and replace hex colors
  const hexColorRegex = /#[0-9a-fA-F]{6}\b/g;
  result = result.replace(hexColorRegex, (match) => {
    const lowerMatch = match.toLowerCase();
    const mapping = colorMappings.find(
      (m) => m.original.toLowerCase() === lowerMatch
    );

    if (mapping) {
      modified = true;
      return mapping.replacement;
    }

    return match;
  });

  // Find and replace rgb colors
  const rgbColorRegex = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
  result = result.replace(rgbColorRegex, (match) => {
    const mapping = rgbMappings.find((m) => {
      // Normalize by removing whitespace
      const normalizedMatch = match.replace(/\s+/g, "");
      const normalizedOriginal = m.original.replace(/\s+/g, "");
      return normalizedMatch === normalizedOriginal;
    });

    if (mapping) {
      modified = true;
      return mapping.replacement;
    }

    return match;
  });

  // Find and replace rgba colors
  const rgbaColorRegex =
    /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/g;
  result = result.replace(rgbaColorRegex, (match) => {
    const mapping = rgbaMappings.find((m) => {
      // Normalize by removing whitespace
      const normalizedMatch = match.replace(/\s+/g, "");
      const normalizedOriginal = m.original.replace(/\s+/g, "");
      return normalizedMatch === normalizedOriginal;
    });

    if (mapping) {
      modified = true;
      return mapping.replacement;
    }

    return match;
  });

  return { result, modified };
}

// Process all existing inline styles
function processAllInlineStyles(): void {
  console.log("Processing all inline styles");
  const elements = document.querySelectorAll("[style]");
  console.log(`Found ${elements.length} elements with inline styles`);

  elements.forEach((element) => {
    if (element instanceof HTMLElement) {
      replaceInlineStyles(element);
    }
  });
}

// Replace colors in an element's inline styles
function replaceInlineStyles(element: HTMLElement): void {
  const style = element.getAttribute("style");
  if (!style) return;

  const { result: newStyle, modified } = replaceCSSColors(style);

  // Only update if changes were made
  if (modified) {
    element.setAttribute("style", newStyle);
  }
}

// Process all stylesheets in the document
function processAllStylesheets(): void {
  // Handle <style> elements
  processStyleElements();

  // Handle <link> stylesheet elements
  processLinkStylesheets();
}

// Process all <style> elements
function processStyleElements(): void {
  const styleElements = document.querySelectorAll("style");
  styleElements.forEach((element) => {
    if (element.id === styleElement.id) return; // Skip our own styles
    if (processedElements.has(element.outerHTML)) return; // Skip if already processed

    processedElements.add(element.outerHTML);

    const css = element.textContent || "";
    const { result, modified } = replaceCSSColors(css);

    if (modified) {
      element.textContent = result;
      console.log("Modified <style> element");
    }
  });
}

// Process all <link> stylesheet elements
function processLinkStylesheets(): void {
  const linkElements = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  );
  linkElements.forEach(async (link) => {
    if (processedElements.has(link.href)) return; // Skip if already processed

    processedElements.add(link.href);

    try {
      console.log(`Fetching external stylesheet: ${link.href}`);
      const response = await fetch(link.href);
      const css = await response.text();

      const { result, modified } = replaceCSSColors(css);

      if (modified) {
        // Create a new style element with the modified CSS
        const newStyle = document.createElement("style");
        newStyle.textContent = result;
        newStyle.setAttribute("data-processed-href", link.href);
        document.head.appendChild(newStyle);
        console.log(`Injected modified styles for: ${link.href}`);
      }
    } catch (error) {
      console.error("Error processing external stylesheet:", error);
    }
  });
}

// Set up observer to handle dynamically added elements
function observeDOMChanges(): void {
  const observer = new MutationObserver((mutations) => {
    // Process all additions to the DOM
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          // Process added style elements
          if (
            node instanceof HTMLStyleElement &&
            !processedElements.has(node.outerHTML)
          ) {
            processedElements.add(node.outerHTML);
            if (node.id !== styleElement.id) {
              const css = node.textContent || "";
              const { result, modified } = replaceCSSColors(css);

              if (modified) {
                node.textContent = result;
              }
            }
          }

          // Process added link stylesheet elements
          if (
            node instanceof HTMLLinkElement &&
            node.rel === "stylesheet" &&
            !processedElements.has(node.href)
          ) {
            processLinkStylesheets();
          }

          // Process added elements with inline styles
          if (node instanceof HTMLElement) {
            if (node.hasAttribute("style")) {
              replaceInlineStyles(node);
            }

            // Process children with inline styles
            node.querySelectorAll("[style]").forEach((child) => {
              if (child instanceof HTMLElement) {
                replaceInlineStyles(child);
              }
            });
          }
        });
      }
      // Also handle attribute changes for style attributes
      else if (
        mutation.type === "attributes" &&
        mutation.attributeName === "style" &&
        mutation.target instanceof HTMLElement
      ) {
        replaceInlineStyles(mutation.target as HTMLElement);
      }
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style"],
  });
}
