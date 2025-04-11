// Color mapping configuration for dark theme
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
  { original: "#251515", replacement: "#000000" },
  { original: "#332323", replacement: "#1a1a1a" },
  { original: "#382829", replacement: "#262626" },
  { original: "#473737", replacement: "#333333" },
  { original: "#ff94ab", replacement: "#ff0000" },
  { original: "#ffa576", replacement: "#ff3333" },
  { original: "#ff5252", replacement: "#ff6666" },
  { original: "#52cf6c", replacement: "#00ff00" },
  { original: "#f8c134", replacement: "#ffff00" },
  { original: "#91b0ff", replacement: "#0000ff" },
  { original: "#3a2224", replacement: "#1a1a1a" },
  { original: "#3b241f", replacement: "#262626" },
  { original: "#2c1c1c", replacement: "#121212" },
  { original: "#200e0e", replacement: "#0a0a0a" },
  { original: "#ffada0", replacement: "#ff6666" },
  { original: "#3c2c2c", replacement: "#333333" },
  { original: "#ffbdb2", replacement: "#ff9999" },
  { original: "#ff9385", replacement: "#ff6666" },
  { original: "#ff9c8e", replacement: "#ff94ab" },
];

// RGB color mappings
export const rgbMappings: ColorMapping[] = [
  { original: "rgb(37, 21, 21)", replacement: "rgb(0, 0, 0)" },
  { original: "rgb(51, 35, 35)", replacement: "rgb(26, 26, 26)" },
  { original: "rgb(56, 40, 41)", replacement: "rgb(38, 38, 38)" },
  { original: "rgb(71, 55, 55)", replacement: "rgb(51, 51, 51)" },
  { original: "rgb(255, 148, 171)", replacement: "rgb(255, 0, 0)" },
  { original: "rgb(255, 165, 118)", replacement: "rgb(255, 51, 51)" },
  { original: "rgb(255, 82, 82)", replacement: "rgb(255, 102, 102)" },
  { original: "rgb(82, 207, 108)", replacement: "rgb(0, 255, 0)" },
  { original: "rgb(248, 193, 52)", replacement: "rgb(255, 255, 0)" },
  { original: "rgb(145, 176, 255)", replacement: "rgb(0, 0, 255)" },
  { original: "rgb(58, 34, 36)", replacement: "rgb(26, 26, 26)" },
  { original: "rgb(59, 36, 31)", replacement: "rgb(38, 38, 38)" },
  { original: "rgb(44, 28, 28)", replacement: "rgb(18, 18, 18)" },
  { original: "rgb(32, 14, 14)", replacement: "rgb(10, 10, 10)" },
  { original: "rgb(255, 173, 160)", replacement: "rgb(255, 102, 102)" },
  { original: "rgb(60, 44, 44)", replacement: "rgb(51, 51, 51)" },
  { original: "rgb(255, 189, 178)", replacement: "rgb(255, 153, 153)" },
  { original: "rgb(255, 147, 133)", replacement: "rgb(255, 102, 102)" },
  { original: "rgb(255, 156, 142)", replacement: "rgb(255, 148, 171)" },
];

// RGBA color mappings
export const rgbaMappings: ColorMapping[] = [
  { original: "rgba(51, 35, 35, 0.8)", replacement: "rgba(26, 26, 26, 0.8)" },
  {
    original: "rgba(255, 147, 133, 0.1)",
    replacement: "rgba(255, 102, 102, 0.1)",
  },
];

// Gradient mappings
export const gradientMappings: GradientMapping[] = [
  {
    original: "linear-gradient(45deg, rgb(44,28,28), rgb(56,40,41))",
    replacement: "linear-gradient(45deg, rgb(18, 18, 18), rgb(38, 38, 38))",
  },
  {
    original:
      "linear-gradient(90deg, rgba(51, 35, 35, 0.8), rgb(44, 28, 28) 300px)",
    replacement:
      "linear-gradient(90deg, rgba(26, 26, 26, 0.8), rgb(18, 18, 18) 300px)",
  },
  {
    original: "linear-gradient(90deg, rgb(255, 148, 171), rgb(255, 165, 118))",
    replacement: "linear-gradient(90deg, rgb(255, 0, 0), rgb(255, 51, 51))",
  },
  {
    original: "linear-gradient(180deg, rgb(51, 35, 35), rgb(37, 21, 21))",
    replacement: "linear-gradient(180deg, rgb(26, 26, 26), rgb(0, 0, 0))",
  },
];

// Essential CSS variables
export const cssVariables = `
  --scrollbar-track-color: rgb(26, 26, 26);
  --scrollbar-thumb-color: rgb(38, 38, 38);
`;
