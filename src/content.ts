// Content script for Renown.gg style modifier
console.log('Clutch extension content script loaded');

import {themeManager} from './theme-manager';

// Function to process all stylesheets
async function processAllStylesheets() {
  const stylesheets = document.querySelectorAll('style, link[rel="stylesheet"]');
  await Promise.all(Array.from(stylesheets).map((element) => {
    if (element instanceof HTMLStyleElement || element instanceof HTMLLinkElement) {
      return themeManager.processStylesheet(element);
    }
    return Promise.resolve();
  }));
}

// Process inline styles for elements with gradients
function processInlineStyles() {
  const elements = document.querySelectorAll('[style*="linear-gradient"]');
  elements.forEach(element => {
    if (element instanceof HTMLElement) {
      // Store the original style
      const originalStyle = element.getAttribute('style') || '';
      
      // Process the specific gradient patterns
      let newStyle = originalStyle;
      
      // Replace 45deg gradient
      newStyle = newStyle.replace(
        /linear-gradient\(\s*45deg\s*,\s*rgb\(\s*44\s*,\s*28\s*,\s*28\s*\)\s*,\s*rgb\(\s*56\s*,\s*40\s*,\s*41\s*\)\s*\)/g,
        'linear-gradient(45deg, rgb(18, 18, 18), rgb(38, 38, 38))'
      );
      
      // Replace 90deg gradient with 300px
      newStyle = newStyle.replace(
        /linear-gradient\(\s*90deg\s*,\s*rgba\(\s*51\s*,\s*35\s*,\s*35\s*,\s*0?\.8\s*\)\s*,\s*rgb\(\s*44\s*,\s*28\s*,\s*28\s*\)\s*300px\s*\)/g,
        'linear-gradient(90deg, rgba(26, 26, 26, 0.8), rgb(18, 18, 18) 300px)'
      );
      
      // Apply the new style if changed
      if (newStyle !== originalStyle) {
        element.setAttribute('style', newStyle);
      }
    }
  });
}

// Process inline color styles
function processInlineColorStyles() {
  // Select all elements with style attribute containing "color:"
  const elements = document.querySelectorAll('[style*="color:"]');
  elements.forEach(element => {
    if (element instanceof HTMLElement) {
      const style = element.getAttribute('style') || '';
      
      // Process the style using theme manager
      const newStyle = themeManager.replaceColors(style);
      
      // Only update if style has changed
      if (newStyle !== style) {
        element.setAttribute('style', newStyle);
      }
    }
  });
}

// Add specific CSS fixes
function applySpecificCSSFixes() {
  const specificStyles = document.createElement('style');
  specificStyles.id = 'clutch-specific-fixes';
  specificStyles.textContent = `
    /* Fix for live-match-list .match */
    live-match-list .match {
      background: linear-gradient(90deg, rgba(26, 26, 26, 0.8), rgb(18, 18, 18) 300px), var(--match-bg) no-repeat left center / auto 100% !important;
      background-color: #1a1a1a !important;
    }
    
    /* Fix for live-match-list .match hover and focus states */
    .live-match-list .match:focus, .live-match-list .match:hover {
      background: linear-gradient(90deg, rgba(38, 38, 38, 0.8) 0, rgb(30, 30, 30) 300px), var(--match-bg) no-repeat left center / auto 100% !important;
    }
    
    /* Fix for elements using 90deg gradient with rgba and rgb */
    [style*="linear-gradient(90deg, rgba(51, 35, 35, .8), rgb(44, 28, 28) 300px)"],
    [style*="linear-gradient(90deg, rgba(51, 35, 35, 0.8), rgb(44, 28, 28) 300px)"] {
      background: linear-gradient(90deg, rgba(26, 26, 26, 0.8), rgb(18, 18, 18) 300px), var(--match-bg) no-repeat left center / auto 100% !important;
      background-color: #1a1a1a !important;
    }
  `;
  document.head.appendChild(specificStyles);
}

// Initialize on page load
async function initialize() {
  // Initialize the theme manager
  await themeManager.init();
  
  // Apply CSS fixes
  applySpecificCSSFixes();
  
  // Process stylesheets and inline styles
  await processAllStylesheets();
  processInlineStyles();
  processInlineColorStyles();
}

// Watch for dynamic style changes
const styleObserver = new MutationObserver((mutations) => {
  let shouldProcessGradients = false;
  let shouldProcessColors = false;
  
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          const style = node.getAttribute('style');
          if (style) {
            if (style.includes('linear-gradient')) {
              shouldProcessGradients = true;
            }
            if (style.includes('color:')) {
              shouldProcessColors = true;
            }
          }
        }
      });
    } else if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
      const element = mutation.target as HTMLElement;
      const style = element.getAttribute('style');
      if (style) {
        if (style.includes('linear-gradient')) {
          shouldProcessGradients = true;
        }
        if (style.includes('color:')) {
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

// Watch for new stylesheets
const stylesheetObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLStyleElement || 
            (node instanceof HTMLLinkElement && node.rel === 'stylesheet')) {
          themeManager.processStylesheet(node as HTMLStyleElement | HTMLLinkElement);
        }
      });
    }
  });
});

// Start observing for style changes
function startObservers() {
  styleObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style']
  });
  
  stylesheetObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateTheme') {
    if (message.themeId) {
      themeManager.setTheme(message.themeId);
    }
    sendResponse({ status: 'theme updated' });
  } else if (message.type === 'toggleTheme') {
    themeManager.setEnabled(message.enabled);
    sendResponse({ status: 'theme toggled', enabled: themeManager.isEnabled() });
  } else if (message.type === 'getThemeInfo') {
    sendResponse({ 
      currentTheme: themeManager.getCurrentTheme().id,
      enabled: themeManager.isEnabled()
    });
  }
  return true;
});

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initialize();
    startObservers();
  });
} else {
  initialize();
  startObservers();
}
