// Content script for Renown.gg style modifier
console.log('Clutch extension content script loaded');

import { defaultColorMappings, createCSSVariableMapping, hexToRgb } from './color-mapping';

// Create style elements
const styleBlocker = document.createElement('style');
styleBlocker.id = 'clutch-style-blocker';
styleBlocker.textContent = `
  /* Block all color-related properties to prevent flash */
  * {
    transition: none !important;
  }
  /* Generate color-specific blockers */
  ${defaultColorMappings.map(mapping => {
    const selectors = [`[style*="${mapping.original}"]`, `[style*="${mapping.original.toLowerCase()}"]`, `[style*="${mapping.original.toUpperCase()}"]`];
    
    if (mapping.rgbOriginal) {
      selectors.push(`[style*="${mapping.rgbOriginal}"]`);
    }
    
    return `${selectors.join(', ')} {
      color: transparent !important;
      background-color: transparent !important;
      border-color: transparent !important;
    }`;
  }).join('\n')}
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
  
  // Add specific CSS variable replacements for scrollbars and other elements
  const additionalVariables = `
    --scrollbar-track-color: rgb(26, 26, 26) !important;
    --scrollbar-thumb-color: rgb(38, 38, 38) !important;
    --color-ff5252: #ff94ab !important;
  `;
  
  colorVariablesStyleElement.textContent = `:root { 
    ${cssVariables}
    ${additionalVariables}
  }`;
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

// Define common rgba patterns for replacement
const rgbaPatterns = [
  // Format: { pattern: regex, colorIndex: rgbIndices, replacement: replacement function/string }
  {
    pattern: /rgba\(\s*255\s*,\s*147\s*,\s*133\s*,\s*([0-9.]+)\s*\)/g,
    replacement: (match: string, alpha: string) => `rgba(255, 102, 102, ${alpha})`
  },
  {
    pattern: /rgba\(\s*255\s*,\s*0\s*,\s*0\s*,\s*([0-9.]+)\s*\)/g,
    replacement: (match: string, alpha: string) => `rgba(255, 0, 0, ${alpha})` // Keep red transparent
  }
];

// Optimized color replacement with caching
function replaceColors(css: string): string {
  // Replace CSS variables for scrollbars
  css = css.replace(/--scrollbar-track-color:\s*rgb\(\s*51\s*,\s*35\s*,\s*35\s*\)/g, 
                    '--scrollbar-track-color: rgb(26, 26, 26)');
  css = css.replace(/--scrollbar-thumb-color:\s*rgb\(\s*56\s*,\s*40\s*,\s*41\s*\)/g, 
                    '--scrollbar-thumb-color: rgb(38, 38, 38)');
  
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
    
    const mapping = defaultColorMappings.find(m => m.original.toLowerCase() === match.toLowerCase());
    const replacement = mapping ? `var(--color-${mapping.original.slice(1)})` : match;
    
    // Cache the result
    colorReplacementCache.set(match, replacement);
    return replacement;
  });
  
  // Also replace RGB colors for linear gradients and other CSS properties
  result = result.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, (match) => {
    // Check cache first
    if (colorReplacementCache.has(match)) {
      return colorReplacementCache.get(match)!;
    }
    
    const mapping = defaultColorMappings.find(m => m.rgbOriginal && m.rgbOriginal.toLowerCase() === match.toLowerCase());
    
    if (mapping) {
      const rgbReplacement = hexToRgb(mapping.replacement) || mapping.replacement;
      // Cache the result
      colorReplacementCache.set(match, rgbReplacement);
      return rgbReplacement;
    }
    
    return match;
  });
  
  // Replace rgba colors
  result = result.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/g, (match, r, g, b, a) => {
    // Check cache first
    if (colorReplacementCache.has(match)) {
      return colorReplacementCache.get(match)!;
    }
    
    const rgbVersion = `rgb(${r}, ${g}, ${b})`;
    const mapping = defaultColorMappings.find(m => m.rgbOriginal && m.rgbOriginal.toLowerCase() === rgbVersion.toLowerCase());
    
    if (mapping) {
      const rgbValues = hexToRgb(mapping.replacement);
      if (rgbValues) {
        // Extract the RGB values and create a new rgba with the original alpha
        const rgbaReplacement = rgbValues.replace('rgb', 'rgba').replace(')', `, ${a})`);
        colorReplacementCache.set(match, rgbaReplacement);
        return rgbaReplacement;
      }
    }
    
    return match;
  });
  
  // Handle specific gradient patterns
  const gradientPatterns = [
    // 45deg gradient pattern
    {
      pattern: /linear-gradient\(\s*45deg\s*,\s*rgb\(\s*44\s*,\s*28\s*,\s*28\s*\)\s*,\s*rgb\(\s*56\s*,\s*40\s*,\s*41\s*\)\s*\)/g,
      replacement: 'linear-gradient(45deg, rgb(18, 18, 18), rgb(38, 38, 38))'
    },
    // 90deg with 300px and var pattern - original colors
    {
      pattern: /linear-gradient\(\s*90deg\s*,\s*rgba\(\s*51\s*,\s*35\s*,\s*35\s*,\s*0?\.8\s*\)\s*,\s*rgb\(\s*44\s*,\s*28\s*,\s*28\s*\)\s*300px\s*\)/g,
      replacement: 'linear-gradient(90deg, rgba(26, 26, 26, 0.8), rgb(18, 18, 18) 300px)'
    },
    // 90deg with 300px and var pattern - partially replaced colors
    {
      pattern: /linear-gradient\(\s*90deg\s*,\s*rgba\(\s*26\s*,\s*26\s*,\s*26\s*,\s*0?\.8\s*\)\s*,\s*rgb\(\s*44\s*,\s*28\s*,\s*28\s*\)\s*300px\s*\)/g,
      replacement: 'linear-gradient(90deg, rgba(26, 26, 26, 0.8), rgb(18, 18, 18) 300px)'
    },
    // Handle any gradient with rgb(44, 28, 28)
    {
      pattern: /rgb\(\s*44\s*,\s*28\s*,\s*28\s*\)/g,
      replacement: 'rgb(18, 18, 18)'
    }
  ];
  
  // Apply gradient pattern replacements
  gradientPatterns.forEach(({ pattern, replacement }) => {
    result = result.replace(pattern, replacement);
  });
  
  return result;
}

// Add direct handling of inline styles for elements with gradients
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

// Add function to process inline color styles
function processInlineColorStyles() {
  // Select all elements with style attribute containing "color:"
  const elements = document.querySelectorAll('[style*="color:"]');
  elements.forEach(element => {
    if (element instanceof HTMLElement) {
      const style = element.getAttribute('style') || '';
      
      // Process hex colors in the style attribute
      let newStyle = style.replace(/#[0-9a-fA-F]{6}/gi, (match) => {
        const mapping = defaultColorMappings.find(m => 
          m.original.toLowerCase() === match.toLowerCase()
        );
        return mapping ? mapping.replacement : match;
      });
      
      // Only update if style has changed
      if (newStyle !== style) {
        element.setAttribute('style', newStyle);
      }
    }
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

// Add specific CSS fixes for certain selectors
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
    
    /* Fix for leaderboard selected button */
    .page.leaderboard .filtering .group .wrapper .leaderboard-mode-switch .button.selected {
      background-color: #ff94ab !important;
    }
    
    /* Fix for input borders */
    .input .input-container input {
      border: 1px solid #333333 !important;
    }
    
    /* Fix for light text buttons */
    .text-button.light {
      color: #ff94ab !important;
    }
    
    /* Fix for pagination */
    .pagination .page-numbers .page.active {
      background: rgba(255, 102, 102, 0.1) !important;
      color: #ff94ab !important;
    }
    
    /* Paler color for hover states */
    .pagination .page-numbers .page:hover:not(:disabled) {
      background: rgba(255, 102, 102, 0.1) !important;
      color: #ffbad0 !important;
    }
    
    /* Hover state colors for various elements */
    a:hover {
      color: #ffbad0 !important;
    }
    
    button:hover:not(.primary-button) {
      color: #ffbad0 !important;
    }
    
    .text-button.light:hover {
      color: #ffbad0 !important;
    }
    
    /* Fix for gradient buttons - all states */
    .primary-button.gradient {
      color: #262626 !important;
      background: linear-gradient(90deg, #ff0000, #ff3333) !important;
    }
    
    /* Paler colors for gradient button hover */
    .primary-button.gradient:hover,
    .primary-button.gradient:focus {
      color: #383838 !important;
      background: linear-gradient(90deg, #ff3333, #ff6666) !important;
    }
    
    /* Fix for dropped skin */
    .dropped-skin {
      background: #121212 !important;
    }
    
    /* Fix for dropped skin winner element */
    .dropped-skin .winner-wrapper .winner {
      background: #1a1a1a !important;
    }
    
    /* Fix for expires permanent */
    .cell.expires .permanent {
      color: #ff94ab !important;
    }
    
    /* Handle all elements with the problematic gradient background */
    [style*="background: linear-gradient(90deg, rgb(255, 148, 171), rgb(255, 165, 118))"],
    [style*="background:linear-gradient(90deg, rgb(255, 148, 171), rgb(255, 165, 118))"] {
      background: linear-gradient(90deg, #ff0000, #ff3333) !important;
    }
    
    /* Fix for other common hover states */
    *:hover[style*="rgb(56, 40, 41)"] {
      color: #262626 !important;
    }
    
    /* Fix for profile-banner gradient */
    .profile-banner {
      background: linear-gradient(180deg, #1a1a1a, #000000) !important;
    }
    
    /* Additional state fixes for other UI elements */
    button:hover, a:hover, .interactive-element:hover {
      color: inherit;
      background-color: inherit;
      border-color: inherit;
    }
  `;
  document.head.appendChild(specificStyles);
  
  // Instead of injecting an inline script, monitor and fix dynamic style changes directly
  // from the content script using a MutationObserver
  const dynamicStyleObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const element = mutation.target as HTMLElement;
        if (element && element.style) {
          // Process dynamically set styles
          fixDynamicStyles(element);
        }
      }
    });
  });
  
  // Start observing for style attribute changes
  dynamicStyleObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['style'],
    subtree: true
  });
  
  // Initial scan for existing elements with inline styles
  document.querySelectorAll('[style]').forEach(element => {
    if (element instanceof HTMLElement) {
      fixDynamicStyles(element);
    }
  });
}

// Helper function to fix dynamic styles that would otherwise be handled by the inline script
function fixDynamicStyles(element: HTMLElement) {
  // Fix color property
  if (element.style.color) {
    let color = element.style.color;
    if (color.includes('rgb(56, 40, 41)')) {
      element.style.setProperty('color', 'rgb(38, 38, 38)', element.style.getPropertyPriority('color'));
    } else if (color.includes('rgb(255, 148, 171)')) {
      element.style.setProperty('color', 'rgb(255, 0, 0)', element.style.getPropertyPriority('color'));
    } else if (color.includes('rgb(255, 165, 118)')) {
      element.style.setProperty('color', 'rgb(255, 51, 51)', element.style.getPropertyPriority('color'));
    }
  }
  
  // Fix background-color property
  if (element.style.backgroundColor) {
    let bgColor = element.style.backgroundColor;
    if (bgColor.includes('rgb(56, 40, 41)')) {
      element.style.setProperty('background-color', 'rgb(38, 38, 38)', element.style.getPropertyPriority('background-color'));
    } else if (bgColor.includes('rgb(255, 148, 171)')) {
      element.style.setProperty('background-color', 'rgb(255, 0, 0)', element.style.getPropertyPriority('background-color'));
    } else if (bgColor.includes('rgb(255, 165, 118)')) {
      element.style.setProperty('background-color', 'rgb(255, 51, 51)', element.style.getPropertyPriority('background-color'));
    }
  }
  
  // Fix background property (which might contain gradients)
  if (element.style.background) {
    let bg = element.style.background;
    if (bg.includes('rgb(56, 40, 41)')) {
      element.style.setProperty('background', bg.replace('rgb(56, 40, 41)', 'rgb(38, 38, 38)'), element.style.getPropertyPriority('background'));
    } else if (bg.includes('rgb(255, 148, 171)')) {
      element.style.setProperty('background', bg.replace('rgb(255, 148, 171)', 'rgb(255, 0, 0)'), element.style.getPropertyPriority('background'));
    } else if (bg.includes('rgb(255, 165, 118)')) {
      element.style.setProperty('background', bg.replace('rgb(255, 165, 118)', 'rgb(255, 51, 51)'), element.style.getPropertyPriority('background'));
    }
  }
}

// Initialize on page load
async function initialize() {
  applyColorVariables();
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

// Start observing for style changes
styleObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style']
});

// Optimized mutation observer for new stylesheets
const stylesheetObserver = new MutationObserver((mutations) => {
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
stylesheetObserver.observe(document.documentElement, {
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
