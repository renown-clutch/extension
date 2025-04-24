/**
 * Creates a shadow root and injects necessary styles
 */
export function createShadowRoot(element: HTMLElement): ShadowRoot {
  // Create shadow DOM
  const shadowRoot = element.attachShadow({ mode: "open" });

  // Inject default styles
  const style = document.createElement("style");
  style.textContent = `
    * {
      box-sizing: border-box;
      font-family: 'Poppins', sans-serif;
    }
    
    /* Base styles for light/dark mode */
    :host {
      --background: #0f172a;
      --foreground: #f8fafc;
      --muted: #334155;
      --muted-foreground: #cbd5e1;
      --primary: #f8fafc;
      --secondary: #334155;
      --accent: #334155;
      --accent-foreground: #f8fafc;
      --border: #334155;
    }
    
    /* Scrollbar styles */
    ::-webkit-scrollbar {
      width: 8px;
      background: var(--background);
    }
    
    ::-webkit-scrollbar-thumb {
      background: var(--accent);
      border-radius: 8px;
      border: 2px solid var(--background);
    }
    
    ::-webkit-scrollbar-corner {
      background: var(--background);
    }
    
    /* Panel styles */
    #clutch-panel {
      color: var(--foreground);
    }
  `;

  shadowRoot.appendChild(style);
  return shadowRoot;
}

/**
 * Injects web fonts into the document head if they don't already exist
 */
export function injectFonts(): void {
  if (!document.getElementById("clutch-fonts")) {
    const link = document.createElement("link");
    link.id = "clutch-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }
}

/**
 * Safely gets an element by ID from a shadow root
 */
export function getElementFromShadow(
  shadowRoot: ShadowRoot,
  id: string
): HTMLElement | null {
  return shadowRoot.getElementById(id);
}
