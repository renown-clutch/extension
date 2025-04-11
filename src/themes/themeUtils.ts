// Color mapping configuration
export interface ColorMapping {
  original: string;
  replacement: string;
  rgbOriginal?: string; // Optional RGB representation of original
}

// Convert hex to RGB format
export function hexToRgb(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )})`
    : null;
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

export function createCSSVariableMapping(mappings: ColorMapping[]): string {
  return mappings
    .map(({ original, replacement }) => {
      const varName = original.replace("#", "color-");
      return `--${varName}: ${replacement};`;
    })
    .join("\n");
}

// Function to create a CSS rule for color replacement
export function createColorReplacementRule(mappings: ColorMapping[]): string {
  return mappings
    .map(({ original, replacement, rgbOriginal }) => {
      const rules = [
        `[style*="${original}"], [style*="${original.toLowerCase()}"], [style*="${original.toUpperCase()}"]`,
      ];

      if (rgbOriginal) {
        rules.push(`[style*="${rgbOriginal}"]`);
      }

      return `
            ${rules.join(",\n        ")} {
              background-color: ${replacement} !important;
              color: ${replacement} !important;
              border-color: ${replacement} !important;
            }
          `;
    })
    .join("\n");
}

// Function to replace colors in a CSS string
export function replaceColorsInCSS(
  css: string,
  mappings: ColorMapping[]
): string {
  let result = css;

  mappings.forEach(({ original, replacement, rgbOriginal }) => {
    // Replace hex colors
    const hexRegex = new RegExp(original, "gi");
    result = result.replace(hexRegex, replacement);

    // Replace RGB colors if they exist
    if (rgbOriginal) {
      const rgbRegex = new RegExp(rgbOriginal.replace(/[()]/g, "\\$&"), "gi");
      const rgbReplacement = hexToRgb(replacement) || replacement;
      result = result.replace(rgbRegex, rgbReplacement);
    }
  });

  return result;
}
