// Content script for Renown.gg style modifier
console.log('Clutch extension content script loaded');

import { defaultColorMappings, createCSSVariableMapping } from './color-mapping';

// Create style elements
const styleBlocker = document.createElement('style');
styleBlocker.id = 'clutch-style-blocker';
styleBlocker.textContent = `
  /* Block all color-related properties to prevent flash */
  * {
    transition: none !important;
  }
  /* Generate color-specific blockers */
  ${defaultColorMappings.map(mapping => 
    `[style*="${mapping.original}"], [style*="${mapping.original.toLowerCase()}"], [style*="${mapping.original.toUpperCase()}"] {
      color: transparent !important;
      background-color: transparent !important;
      border-color: transparent !important;
    }`
  ).join('\n')}
`;

const colorVariablesStyleElement = document.createElement('style');
colorVariablesStyleElement.id = 'clutch-custom-colors';

const styleElement = document.createElement('style');
styleElement.id = 'clutch-custom-styles';

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

// Function to apply color variables
function applyColorVariables() {
  const cssVariables = createCSSVariableMapping(defaultColorMappings);
  colorVariablesStyleElement.textContent = `:root { ${cssVariables} }`;
}

// Function to process a single stylesheet
async function processStylesheet(element: HTMLStyleElement | HTMLLinkElement): Promise<void> {
  if (element instanceof HTMLStyleElement) {
    if (!processedStylesheets.has(element.id || element.textContent || '')) {
      const css = element.textContent || '';
      const modifiedCSS = replaceColors(css);
      element.textContent = modifiedCSS;
      processedStylesheets.add(element.id || element.textContent || '');
    }
  } else if (element instanceof HTMLLinkElement && !processedStylesheets.has(element.href)) {
    try {
      const response = await fetch(element.href);
      const css = await response.text();
      const modifiedCSS = replaceColors(css);
      const newStyle = document.createElement('style');
      newStyle.textContent = modifiedCSS;
      document.head.appendChild(newStyle);
      processedStylesheets.add(element.href);
    } catch (error) {
      console.error('Error processing external stylesheet:', error);
    }
  }
}

// Optimized color replacement with caching
function replaceColors(css: string): string {
  return css.replace(/#[0-9a-fA-F]{6}/g, (match) => {
    // Check cache first
    if (colorReplacementCache.has(match)) {
      return colorReplacementCache.get(match)!;
    }
    
    const mapping = defaultColorMappings.find(m => m.original.toLowerCase() === match.toLowerCase());
    const replacement = mapping ? `var(--color-${mapping.original.slice(1)})` : match;
    
    // Cache the result
    colorReplacementCache.set(match, replacement);
    return replacement;
  });
}

// Function to process all stylesheets
async function processAllStylesheets() {
  const stylesheets = document.querySelectorAll('style, link[rel="stylesheet"]');
  await Promise.all(Array.from(stylesheets).map((element) => {
    if (element instanceof HTMLStyleElement || element instanceof HTMLLinkElement) {
      return processStylesheet(element);
    }
    return Promise.resolve();
  }));
}

// Initialize on page load
async function initialize() {
  applyColorVariables();
  await processAllStylesheets();
  
  // Remove the style blocker after our styles are applied
  setTimeout(() => {
    if (styleBlocker.parentNode) {
      styleBlocker.parentNode.removeChild(styleBlocker);
    }
  }, 100); // Small delay to ensure our styles apply first
}

// Optimized mutation observer for new stylesheets
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLStyleElement || 
            (node instanceof HTMLLinkElement && node.rel === 'stylesheet')) {
          processStylesheet(node);
        }
      });
    }
  });
});

// Start observing only for new stylesheet additions
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateColors') {
    applyColorVariables();
    sendResponse({ status: 'colors updated' });
  }
  return true;
});

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
