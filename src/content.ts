// Content script for Renown.gg style modifier
console.log('Clutch extension content script loaded');

import { defaultColorMappings, createCSSVariableMapping } from './color-mapping';

// Create a style element for our color variables
const colorVariablesStyleElement = document.createElement('style');
colorVariablesStyleElement.id = 'clutch-custom-colors';
document.head.appendChild(colorVariablesStyleElement);

// Create a style element for our custom styles
const styleElement = document.createElement('style');
styleElement.id = 'clutch-custom-styles';
document.head.appendChild(styleElement);

// Cache for processed stylesheets
const processedStylesheets = new Set<string>();

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
      const modifiedCSS = css.replace(/#[0-9a-fA-F]{6}/g, (match) => {
        const mapping = defaultColorMappings.find(m => m.original.toLowerCase() === match.toLowerCase());
        return mapping ? `var(--color-${mapping.original.slice(1)})` : match;
      });
      element.textContent = modifiedCSS;
      processedStylesheets.add(element.id || element.textContent || '');
    }
  } else if (element instanceof HTMLLinkElement && !processedStylesheets.has(element.href)) {
    try {
      const response = await fetch(element.href);
      const css = await response.text();
      const modifiedCSS = css.replace(/#[0-9a-fA-F]{6}/g, (match) => {
        const mapping = defaultColorMappings.find(m => m.original.toLowerCase() === match.toLowerCase());
        return mapping ? `var(--color-${mapping.original.slice(1)})` : match;
      });
      const newStyle = document.createElement('style');
      newStyle.textContent = modifiedCSS;
      document.head.appendChild(newStyle);
      processedStylesheets.add(element.href);
    } catch (error) {
      console.error('Error processing external stylesheet:', error);
    }
  }
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
initialize();
