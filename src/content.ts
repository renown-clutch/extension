console.log("Clutch extension content script loaded");

import { defaultColorMappings } from "./themes/Dark";
import { hexToRgb } from "./themes/themeUtils";
import {
  applyColorVariables,
  processAllStylesheets,
  processInlineStyles,
  processInlineColorStyles,
  applySpecificCSSFixes,
} from "./themes/themeApplication";

// Create style elements
const styleBlocker = document.createElement("style");
styleBlocker.id = "clutch-style-blocker";
styleBlocker.textContent = `
  /* Block all color-related properties to prevent flash */
  * {
    transition: none !important;
  }
  /* Generate color-specific blockers */
  ${defaultColorMappings
    .map((mapping) => {
      const selectors = [
        `[style*="${mapping.original}"]`,
        `[style*="${mapping.original.toLowerCase()}"]`,
        `[style*="${mapping.original.toUpperCase()}"]`,
      ];

      if (mapping.rgbOriginal) {
        selectors.push(`[style*="${mapping.rgbOriginal}"]`);
      }

      return `${selectors.join(", ")} {
      color: transparent !important;
      background-color: transparent !important;
      border-color: transparent !important;
    }`;
    })
    .join("\n")}
`;

const colorVariablesStyleElement = document.createElement("style");
colorVariablesStyleElement.id = "clutch-custom-colors";

const styleElement = document.createElement("style");
styleElement.id = "clutch-custom-styles";

// Safe append function that waits for document to be ready
function safeAppendStyles() {
  // Try to insert styles as soon as possible
  const insertStyles = () => {
    const target = document.head || document.documentElement;
    if (target) {
      // Append our styles in order
      target.appendChild(styleBlocker);
      target.appendChild(colorVariablesStyleElement);
      target.appendChild(styleElement);
      return true;
    }
    return false;
  };

  // First attempt
  if (insertStyles()) return;

  // If first attempt fails, use a MutationObserver as fallback
  const observer = new MutationObserver(() => {
    if (insertStyles()) {
      observer.disconnect();
    }
  });

  // Start observing document for when head becomes available
  observer.observe(document, { childList: true, subtree: true });
}

// Call this immediately
safeAppendStyles();

// Cache for processed stylesheets
const processedStylesheets = new Set<string>();

// Cache for color replacements
const colorReplacementCache = new Map<string, string>();

// Function to process a single stylesheet
async function processStylesheet(
  element: HTMLStyleElement | HTMLLinkElement
): Promise<void> {
  if (element instanceof HTMLStyleElement) {
    if (!processedStylesheets.has(element.id || element.textContent || "")) {
      const css = element.textContent || "";
      const modifiedCSS = replaceColors(css);
      element.textContent = modifiedCSS;
      processedStylesheets.add(element.id || element.textContent || "");
    }
  } else if (
    element instanceof HTMLLinkElement &&
    !processedStylesheets.has(element.href)
  ) {
    try {
      const response = await fetch(element.href);
      const css = await response.text();
      const modifiedCSS = replaceColors(css);
      const newStyle = document.createElement("style");
      newStyle.textContent = modifiedCSS;
      document.head.appendChild(newStyle);
      processedStylesheets.add(element.href);
    } catch (error) {
      console.error("Error processing external stylesheet:", error);
    }
  }
}

// Define common rgba patterns for replacement
const rgbaPatterns = [
  // Format: { pattern: regex, colorIndex: rgbIndices, replacement: replacement function/string }
  {
    pattern: /rgba\(\s*255\s*,\s*147\s*,\s*133\s*,\s*([0-9.]+)\s*\)/g,
    replacement: (match: string, alpha: string) =>
      `rgba(255, 102, 102, ${alpha})`,
  },
  {
    pattern: /rgba\(\s*255\s*,\s*0\s*,\s*0\s*,\s*([0-9.]+)\s*\)/g,
    replacement: (match: string, alpha: string) => `rgba(255, 0, 0, ${alpha})`, // Keep red transparent
  },
];

// Optimized color replacement with caching
function replaceColors(css: string): string {
  // Replace CSS variables for scrollbars
  css = css.replace(
    /--scrollbar-track-color:\s*rgb\(\s*51\s*,\s*35\s*,\s*35\s*\)/g,
    "--scrollbar-track-color: rgb(26, 26, 26)"
  );
  css = css.replace(
    /--scrollbar-thumb-color:\s*rgb\(\s*56\s*,\s*40\s*,\s*41\s*\)/g,
    "--scrollbar-thumb-color: rgb(38, 38, 38)"
  );

  // Replace rgba patterns
  rgbaPatterns.forEach(({ pattern, replacement }) => {
    css = css.replace(pattern, replacement);
  });

  // Replace hex colors
  let result = css.replace(/#[0-9a-fA-F]{6}/g, (match) => {
    // Check cache first
    if (colorReplacementCache.has(match)) {
      return colorReplacementCache.get(match)!;
    }

    const mapping = defaultColorMappings.find(
      (m) => m.original.toLowerCase() === match.toLowerCase()
    );
    const replacement = mapping
      ? `var(--color-${mapping.original.slice(1)})`
      : match;

    // Cache the result
    colorReplacementCache.set(match, replacement);
    return replacement;
  });

  // Also replace RGB colors for linear gradients and other CSS properties
  result = result.replace(
    /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
    (match) => {
      // Check cache first
      if (colorReplacementCache.has(match)) {
        return colorReplacementCache.get(match)!;
      }

      const mapping = defaultColorMappings.find(
        (m) =>
          m.rgbOriginal && m.rgbOriginal.toLowerCase() === match.toLowerCase()
      );

      if (mapping) {
        const rgbReplacement =
          hexToRgb(mapping.replacement) || mapping.replacement;
        // Cache the result
        colorReplacementCache.set(match, rgbReplacement);
        return rgbReplacement;
      }

      return match;
    }
  );

  // Replace rgba colors
  result = result.replace(
    /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/g,
    (match, r, g, b, a) => {
      // Check cache first
      if (colorReplacementCache.has(match)) {
        return colorReplacementCache.get(match)!;
      }

      const rgbVersion = `rgb(${r}, ${g}, ${b})`;
      const mapping = defaultColorMappings.find(
        (m) =>
          m.rgbOriginal &&
          m.rgbOriginal.toLowerCase() === rgbVersion.toLowerCase()
      );

      if (mapping) {
        const rgbValues = hexToRgb(mapping.replacement);
        if (rgbValues) {
          // Extract the RGB values and create a new rgba with the original alpha
          const rgbaReplacement = rgbValues
            .replace("rgb", "rgba")
            .replace(")", `, ${a})`);
          colorReplacementCache.set(match, rgbaReplacement);
          return rgbaReplacement;
        }
      }

      return match;
    }
  );

  // Handle specific gradient patterns
  const gradientPatterns = [
    // 45deg gradient pattern
    {
      pattern:
        /linear-gradient\(\s*45deg\s*,\s*rgb\(\s*44\s*,\s*28\s*,\s*28\s*\)\s*,\s*rgb\(\s*56\s*,\s*40\s*,\s*41\s*\)\s*\)/g,
      replacement: "linear-gradient(45deg, rgb(18, 18, 18), rgb(38, 38, 38))",
    },
    // 90deg with 300px and var pattern - original colors
    {
      pattern:
        /linear-gradient\(\s*90deg\s*,\s*rgba\(\s*51\s*,\s*35\s*,\s*35\s*,\s*0?\.8\s*\)\s*,\s*rgb\(\s*44\s*,\s*28\s*,\s*28\s*\)\s*300px\s*\)/g,
      replacement:
        "linear-gradient(90deg, rgba(26, 26, 26, 0.8), rgb(18, 18, 18) 300px)",
    },
    // 90deg with 300px and var pattern - partially replaced colors
    {
      pattern:
        /linear-gradient\(\s*90deg\s*,\s*rgba\(\s*26\s*,\s*26\s*,\s*26\s*,\s*0?\.8\s*\)\s*,\s*rgb\(\s*44\s*,\s*28\s*,\s*28\s*\)\s*300px\s*\)/g,
      replacement:
        "linear-gradient(90deg, rgba(26, 26, 26, 0.8), rgb(18, 18, 18) 300px)",
    },
    // Handle any gradient with rgb(44, 28, 28)
    {
      pattern: /rgb\(\s*44\s*,\s*28\s*,\s*28\s*\)/g,
      replacement: "rgb(18, 18, 18)",
    },
  ];

  // Apply gradient pattern replacements
  gradientPatterns.forEach(({ pattern, replacement }) => {
    result = result.replace(pattern, replacement);
  });

  return result;
}

// Initialize on page load
async function initialize() {
  applyColorVariables(colorVariablesStyleElement);
  applySpecificCSSFixes();
  await processAllStylesheets();
  processInlineStyles();
  processInlineColorStyles();

  // Remove the style blocker after our styles are applied
  setTimeout(() => {
    if (styleBlocker.parentNode) {
      styleBlocker.parentNode.removeChild(styleBlocker);
    }
  }, 100); // Small delay to ensure our styles apply first
}

// Modify the gradient observer to also watch for inline color style changes
const styleObserver = new MutationObserver((mutations) => {
  let shouldProcessGradients = false;
  let shouldProcessColors = false;

  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          const style = node.getAttribute("style");
          if (style) {
            if (style.includes("linear-gradient")) {
              shouldProcessGradients = true;
            }
            if (style.includes("color:")) {
              shouldProcessColors = true;
            }
          }
        }
      });
    } else if (
      mutation.type === "attributes" &&
      mutation.attributeName === "style"
    ) {
      const element = mutation.target as HTMLElement;
      const style = element.getAttribute("style");
      if (style) {
        if (style.includes("linear-gradient")) {
          shouldProcessGradients = true;
        }
        if (style.includes("color:")) {
          shouldProcessColors = true;
        }
      }
    }
  });

  if (shouldProcessGradients) {
    processInlineStyles();
  }

  if (shouldProcessColors) {
    processInlineColorStyles();
  }
});

// Start observing for style changes
styleObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["style"],
});

// Optimized mutation observer for new stylesheets
const stylesheetObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (
          node instanceof HTMLStyleElement ||
          (node instanceof HTMLLinkElement && node.rel === "stylesheet")
        ) {
          processStylesheet(node);
        }
      });
    }
  });
});

// Start observing only for new stylesheet additions
stylesheetObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "updateColors") {
    applyColorVariables(colorVariablesStyleElement);
    sendResponse({ status: "colors updated" });
  }
  return true;
});

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
