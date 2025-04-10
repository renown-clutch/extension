// Color mapping configuration
export interface ColorMapping {
  original: string;
  replacement: string;
}


export const defaultColorMappings: ColorMapping[] = [
  { original: '#251515', replacement: '#000000' }, // Dark background
  { original: '#332323', replacement: '#1a1a1a' }, // Slightly lighter background
  { original: '#382829', replacement: '#262626' }, // Hover/active states
  { original: '#473737', replacement: '#333333' }, // Borders and dividers
  { original: '#ff94ab', replacement: '#ff0000' }, // Accent color 1
  { original: '#ffa576', replacement: '#ff3333' }, // Accent color 2
  { original: '#ff5252', replacement: '#ff6666' }, // Error color
  { original: '#52cf6c', replacement: '#00ff00' }, // Success color
  { original: '#f8c134', replacement: '#ffff00' }, // Warning color
  { original: '#91b0ff', replacement: '#0000ff' }, // Info color
];

// Function to create a CSS variable mapping
export function createCSSVariableMapping(mappings: ColorMapping[]): string {
  return mappings
    .map(({ original, replacement }) => {
      const varName = original.replace('#', 'color-');
      return `--${varName}: ${replacement};`;
    })
    .join('\n');
}

// Function to create a CSS rule for color replacement
export function createColorReplacementRule(mappings: ColorMapping[]): string {
  return mappings
    .map(({ original, replacement }) => {
      return `
        [style*="${original}"],
        [style*="${original.toLowerCase()}"],
        [style*="${original.toUpperCase()}"] {
          background-color: ${replacement} !important;
          color: ${replacement} !important;
          border-color: ${replacement} !important;
        }
      `;
    })
    .join('\n');
}

// Function to replace colors in a CSS string
export function replaceColorsInCSS(css: string, mappings: ColorMapping[]): string {
  let result = css;
  mappings.forEach(({ original, replacement }) => {
    const regex = new RegExp(original, 'gi');
    result = result.replace(regex, replacement);
  });
  return result;
} 