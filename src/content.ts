// Content script for Renown.gg style modifier
console.log('Clutch extension content script loaded');

const customStyles = `
    html, body {
      background-color: #121212 !important;
    }
    
    /* Target common container elements */
    div, main, section, article, aside, nav, header, footer {
      background-color: #121212 !important;
    }
    
    /* Target text elements for better readability */
    p, h1, h2, h3, h4, h5, h6, span, a {
      color: #ffffff !important;
    }
    
    /* For elements with background images */
    [style*="background-image"] {
      background-color: #121212 !important;
    }
  `;

  
const styleElement = document.createElement('style');
styleElement.id = 'clutch-custom-styles';
document.head.appendChild(styleElement);

  // Check storage for saved state on page load
chrome.storage.sync.get(['styleEnabled'], (result) => {
  if (result.styleEnabled) {
      applyStyles();
    }
});

  // Function to apply styles
  function applyStyles() {
    styleElement.textContent = customStyles;
    console.log('Custom styles applied to renown.gg');
  }

  
  function removeStyles() {
    styleElement.textContent = '';
    console.log('Custom styles removed from renown.gg');
  }

  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    if (message.type === 'toggleStyle') {
      if (message.enabled) {
        applyStyles();
      } else {
        removeStyles();
      }
      sendResponse({ status: 'style updated' });
    }
    
    return true; 
  });
