// Color mapping configuration for light theme
export interface ColorMapping {
  original: string;
  replacement: string;
}

export interface GradientMapping {
  original: string;
  replacement: string;
}

// Simple hex color mappings
export const colorMappings: ColorMapping[] = [
  { original: "#251515", replacement: "#ffffff" },
  { original: "#332323", replacement: "#f5f5f5" },
  { original: "#382829", replacement: "#ebebeb" },
  { original: "#473737", replacement: "#e0e0e0" },
  { original: "#ff94ab", replacement: "#cc0000" },
  { original: "#ffa576", replacement: "#cc3300" },
  { original: "#ff5252", replacement: "#cc0033" },
  { original: "#52cf6c", replacement: "#007700" },
  { original: "#f8c134", replacement: "#cc9900" },
  { original: "#91b0ff", replacement: "#0033cc" },
  { original: "#3a2224", replacement: "#f0f0f0" },
  { original: "#3b241f", replacement: "#e6e6e6" },
  { original: "#2c1c1c", replacement: "#fafafa" },
  { original: "#200e0e", replacement: "#ffffff" },
  { original: "#ffada0", replacement: "#cc3333" },
  { original: "#3c2c2c", replacement: "#e0e0e0" },
  { original: "#ffbdb2", replacement: "#cc6666" },
  { original: "#ff9385", replacement: "#cc3333" },
  { original: "#ff9c8e", replacement: "#cc6699" },
];

// RGB color mappings
export const rgbMappings: ColorMapping[] = [
  { original: "rgb(37, 21, 21)", replacement: "rgb(255, 255, 255)" },
  { original: "rgb(51, 35, 35)", replacement: "rgb(245, 245, 245)" },
  { original: "rgb(56, 40, 41)", replacement: "rgb(235, 235, 235)" },
  { original: "rgb(71, 55, 55)", replacement: "rgb(224, 224, 224)" },
  { original: "rgb(255, 148, 171)", replacement: "rgb(204, 0, 0)" },
  { original: "rgb(255, 165, 118)", replacement: "rgb(204, 51, 0)" },
  { original: "rgb(255, 82, 82)", replacement: "rgb(204, 0, 51)" },
  { original: "rgb(82, 207, 108)", replacement: "rgb(0, 119, 0)" },
  { original: "rgb(248, 193, 52)", replacement: "rgb(204, 153, 0)" },
  { original: "rgb(145, 176, 255)", replacement: "rgb(0, 51, 204)" },
  { original: "rgb(58, 34, 36)", replacement: "rgb(240, 240, 240)" },
  { original: "rgb(59, 36, 31)", replacement: "rgb(230, 230, 230)" },
  { original: "rgb(44, 28, 28)", replacement: "rgb(250, 250, 250)" },
  { original: "rgb(32, 14, 14)", replacement: "rgb(255, 255, 255)" },
  { original: "rgb(255, 173, 160)", replacement: "rgb(204, 51, 51)" },
  { original: "rgb(60, 44, 44)", replacement: "rgb(224, 224, 224)" },
  { original: "rgb(255, 189, 178)", replacement: "rgb(204, 102, 102)" },
  { original: "rgb(255, 147, 133)", replacement: "rgb(204, 51, 51)" },
  { original: "rgb(255, 156, 142)", replacement: "rgb(204, 102, 153)" },
];

// RGBA color mappings
export const rgbaMappings: ColorMapping[] = [
  {
    original: "rgba(51, 35, 35, 0.8)",
    replacement: "rgba(245, 245, 245, 0.8)",
  },
  {
    original: "rgba(255, 147, 133, 0.1)",
    replacement: "rgba(204, 51, 51, 0.1)",
  },
];

// Gradient mappings
export const gradientMappings: GradientMapping[] = [
  {
    original: "linear-gradient(45deg, rgb(44,28,28), rgb(56,40,41))",
    replacement:
      "linear-gradient(45deg, rgb(250, 250, 250), rgb(235, 235, 235))",
  },
  {
    original:
      "linear-gradient(90deg, rgba(51, 35, 35, 0.8), rgb(44, 28, 28) 300px)",
    replacement:
      "linear-gradient(90deg, rgba(245, 245, 245, 0.8), rgb(250, 250, 250) 300px)",
  },
  {
    original: "linear-gradient(90deg, rgb(255, 148, 171), rgb(255, 165, 118))",
    replacement: "linear-gradient(90deg, rgb(204, 0, 0), rgb(204, 51, 0))",
  },
  {
    original: "linear-gradient(180deg, rgb(51, 35, 35), rgb(37, 21, 21))",
    replacement:
      "linear-gradient(180deg, rgb(245, 245, 245), rgb(255, 255, 255))",
  },
];

// Essential CSS variables
export const cssVariables = `
  --scrollbar-track-color: rgb(245, 245, 245);
  --scrollbar-thumb-color: rgb(224, 224, 224);
`;
