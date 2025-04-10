import { getThemeById, defaultTheme } from './themes';
import type { Theme, ColorMapping } from './themes/theme-types';

// Default chrome storage keys
const STORAGE_KEY_THEME_ID = 'clutch_theme_id';
const STORAGE_KEY_ENABLED = 'clutch_theme_enabled';

interface ThemeState {
  currentTheme: Theme;
  enabled: boolean;
}

class ThemeManager {
  private state: ThemeState = {
    currentTheme: defaultTheme,
    enabled: true
  };
  
  // DOM Elements for applying styles
  private colorVariablesStyleElement: HTMLStyleElement | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private styleBlocker: HTMLStyleElement | null = null;
  
  // Cache for processed stylesheets
  private processedStylesheets = new Set<string>();
  
  // Cache for color replacements
  private colorReplacementCache = new Map<string, string>();
  
  // Event listeners for theme changes
  private listeners: (() => void)[] = [];
  
  constructor() {
    this.createStyleElements();
  }
  
  // Initialize the theme manager
  async init(): Promise<void> {
    await this.loadSavedTheme();
    this.applyCurrentTheme();
  }
  
  // Load saved theme from Chrome storage
  private async loadSavedTheme(): Promise<void> {
    try {
      const items = await chrome.storage.sync.get([
        STORAGE_KEY_THEME_ID, 
        STORAGE_KEY_ENABLED
      ]);
      
      // Set enabled state
      this.state.enabled = items[STORAGE_KEY_ENABLED] !== false; // Default to true if not set
      
      // Set theme
      const themeId = items[STORAGE_KEY_THEME_ID];
      if (themeId) {
        const theme = getThemeById(themeId);
        if (theme) {
          this.state.currentTheme = theme;
        }
      }
    } catch (error) {
      console.error('Error loading saved theme:', error);
    }
  }
  
  // Save current theme to Chrome storage
  private async saveThemeSettings(): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [STORAGE_KEY_THEME_ID]: this.state.currentTheme.id,
        [STORAGE_KEY_ENABLED]: this.state.enabled
      });
    } catch (error) {
      console.error('Error saving theme settings:', error);
    }
  }
  
  // Create necessary style elements
  private createStyleElements(): void {
    // Create style blocker
    this.styleBlocker = document.createElement('style');
    this.styleBlocker.id = 'clutch-style-blocker';
    
    // Create CSS variables style element
    this.colorVariablesStyleElement = document.createElement('style');
    this.colorVariablesStyleElement.id = 'clutch-custom-colors';
    
    // Create custom styles element
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'clutch-custom-styles';
    
    // Append elements to document
    this.safeAppendStyles();
  }
  
  // Safe append function that waits for document to be ready
  private safeAppendStyles(): void {
    // Try to insert styles as soon as possible
    const insertStyles = () => {
      const target = document.head || document.documentElement;
      if (target) {
        if (this.styleBlocker) target.appendChild(this.styleBlocker);
        if (this.colorVariablesStyleElement) target.appendChild(this.colorVariablesStyleElement);
        if (this.styleElement) target.appendChild(this.styleElement);
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
  
  // Apply the current theme
  public applyCurrentTheme(): void {
    if (!this.state.enabled) {
      this.removeThemeStyles();
      return;
    }
    
    this.applyColorVariables();
    this.updateStyleBlocker();
    
    // Notify listeners
    this.notifyListeners();
  }
  
  // Apply color variables for the current theme
  private applyColorVariables(): void {
    if (!this.colorVariablesStyleElement || !this.state.enabled) return;
    
    const cssVariables = this.createCSSVariableMapping(this.state.currentTheme.colors);
    
    // Add specific CSS variable replacements for scrollbars and other elements
    const additionalVariables = `
      --scrollbar-track-color: rgb(26, 26, 26) !important;
      --scrollbar-thumb-color: rgb(38, 38, 38) !important;
      --color-ff5252: #ff94ab !important;
    `;
    
    this.colorVariablesStyleElement.textContent = `:root { 
      ${cssVariables}
      ${additionalVariables}
    }`;
  }
  
  // Create CSS variable mapping
  private createCSSVariableMapping(mappings: ColorMapping[]): string {
    return mappings
      .map(({ original, replacement }) => {
        const varName = original.replace('#', 'color-');
        return `--${varName}: ${replacement};`;
      })
      .join('\n');
  }
  
  // Update style blocker based on current theme
  private updateStyleBlocker(): void {
    if (!this.styleBlocker || !this.state.enabled) return;
    
    this.styleBlocker.textContent = `
      /* Block all color-related properties to prevent flash */
      * {
        transition: none !important;
      }
      /* Generate color-specific blockers */
      ${this.state.currentTheme.colors.map(mapping => {
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
  }
  
  // Process a single stylesheet
  public async processStylesheet(element: HTMLStyleElement | HTMLLinkElement): Promise<void> {
    if (!this.state.enabled) return;
    
    if (element instanceof HTMLStyleElement) {
      if (!this.processedStylesheets.has(element.id || element.textContent || '')) {
        const css = element.textContent || '';
        const modifiedCSS = this.replaceColors(css);
        element.textContent = modifiedCSS;
        this.processedStylesheets.add(element.id || element.textContent || '');
      }
    } else if (element instanceof HTMLLinkElement && !this.processedStylesheets.has(element.href)) {
      try {
        const response = await fetch(element.href);
        const css = await response.text();
        const modifiedCSS = this.replaceColors(css);
        const newStyle = document.createElement('style');
        newStyle.textContent = modifiedCSS;
        document.head.appendChild(newStyle);
        this.processedStylesheets.add(element.href);
      } catch (error) {
        console.error('Error processing external stylesheet:', error);
      }
    }
  }
  
  // Replace colors in CSS string
  public replaceColors(css: string): string {
    if (!this.state.enabled) return css;
    
    // Replace CSS variables for scrollbars
    css = css.replace(/--scrollbar-track-color:\s*rgb\(\s*51\s*,\s*35\s*,\s*35\s*\)/g, 
                      '--scrollbar-track-color: rgb(26, 26, 26)');
    css = css.replace(/--scrollbar-thumb-color:\s*rgb\(\s*56\s*,\s*40\s*,\s*41\s*\)/g, 
                      '--scrollbar-thumb-color: rgb(38, 38, 38)');
    
    // Replace rgba patterns
    const rgbaPatterns = [
      {
        pattern: /rgba\(\s*255\s*,\s*147\s*,\s*133\s*,\s*([0-9.]+)\s*\)/g,
        replacement: (match: string, alpha: string) => `rgba(255, 102, 102, ${alpha})`
      },
      {
        pattern: /rgba\(\s*255\s*,\s*0\s*,\s*0\s*,\s*([0-9.]+)\s*\)/g,
        replacement: (match: string, alpha: string) => `rgba(255, 0, 0, ${alpha})` // Keep red transparent
      }
    ];
    
    rgbaPatterns.forEach(({ pattern, replacement }) => {
      css = css.replace(pattern, replacement);
    });
    
    const { colors } = this.state.currentTheme;
    
    // Replace hex colors
    let result = css.replace(/#[0-9a-fA-F]{6}/g, (match) => {
      // Check cache first
      if (this.colorReplacementCache.has(match)) {
        return this.colorReplacementCache.get(match)!;
      }
      
      const mapping = colors.find(m => m.original.toLowerCase() === match.toLowerCase());
      const replacement = mapping ? `var(--color-${mapping.original.slice(1)})` : match;
      
      // Cache the result
      this.colorReplacementCache.set(match, replacement);
      return replacement;
    });
    
    // Also replace RGB colors for linear gradients and other CSS properties
    result = result.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, (match) => {
      // Check cache first
      if (this.colorReplacementCache.has(match)) {
        return this.colorReplacementCache.get(match)!;
      }
      
      const mapping = colors.find(m => m.rgbOriginal && m.rgbOriginal.toLowerCase() === match.toLowerCase());
      
      if (mapping) {
        const hexToRgb = (hex: string): string | null => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? 
            `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : 
            null;
        };
        
        const rgbReplacement = hexToRgb(mapping.replacement) || mapping.replacement;
        // Cache the result
        this.colorReplacementCache.set(match, rgbReplacement);
        return rgbReplacement;
      }
      
      return match;
    });
    
    // Replace rgba colors
    result = result.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/g, (match, r, g, b, a) => {
      // Check cache first
      if (this.colorReplacementCache.has(match)) {
        return this.colorReplacementCache.get(match)!;
      }
      
      const rgbVersion = `rgb(${r}, ${g}, ${b})`;
      const mapping = colors.find(m => m.rgbOriginal && m.rgbOriginal.toLowerCase() === rgbVersion.toLowerCase());
      
      if (mapping) {
        const hexToRgb = (hex: string): string | null => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? 
            `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : 
            null;
        };
        
        const rgbValues = hexToRgb(mapping.replacement);
        if (rgbValues) {
          // Extract the RGB values and create a new rgba with the original alpha
          const rgbaReplacement = rgbValues.replace('rgb', 'rgba').replace(')', `, ${a})`);
          this.colorReplacementCache.set(match, rgbaReplacement);
          return rgbaReplacement;
        }
      }
      
      return match;
    });
    
    return result;
  }
  
  // Set a new current theme
  public async setTheme(themeId: string): Promise<boolean> {
    const theme = getThemeById(themeId);
    if (!theme) return false;
    
    this.state.currentTheme = theme;
    this.colorReplacementCache.clear();
    this.processedStylesheets.clear();
    await this.saveThemeSettings();
    this.applyCurrentTheme();
    return true;
  }
  
  // Enable or disable the theme
  public async setEnabled(enabled: boolean): Promise<void> {
    if (this.state.enabled === enabled) return;
    
    this.state.enabled = enabled;
    await this.saveThemeSettings();
    
    if (enabled) {
      this.applyCurrentTheme();
    } else {
      this.removeThemeStyles();
    }
    
    // Notify listeners
    this.notifyListeners();
  }
  
  // Remove theme styles when disabled
  private removeThemeStyles(): void {
    if (this.styleBlocker) {
      this.styleBlocker.textContent = '';
    }
    
    if (this.colorVariablesStyleElement) {
      this.colorVariablesStyleElement.textContent = '';
    }
    
    if (this.styleElement) {
      this.styleElement.textContent = '';
    }
  }
  
  // Get current theme
  public getCurrentTheme(): Theme {
    return this.state.currentTheme;
  }
  
  // Check if theme is enabled
  public isEnabled(): boolean {
    return this.state.enabled;
  }
  
  // Add event listener for theme changes
  public addEventListener(callback: () => void): void {
    this.listeners.push(callback);
  }
  
  // Remove event listener
  public removeEventListener(callback: () => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }
  
  // Notify all listeners of theme changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Export a singleton instance
export const themeManager = new ThemeManager();