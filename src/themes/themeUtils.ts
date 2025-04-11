// Color mapping configuration
export interface ColorMapping {
    original: string;
    replacement: string;
    rgbOriginal?: string; // Optional RGB representation of original
  }
  
  // Convert hex to RGB format
  export function hexToRgb(hex: string): string | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : 
      null;
  }
  
  // Convert RGB to hex format
  export function rgbToHex(rgb: string): string | null {
    const rgbMatch = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (!rgbMatch) return null;
    
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }