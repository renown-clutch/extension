import type { ColorMapping, Theme } from './theme-types';

const colors: ColorMapping[] = [
  { original: '#251515', replacement: '#000000', rgbOriginal: 'rgb(37, 21, 21)' }, // Dark background
  { original: '#332323', replacement: '#1a1a1a', rgbOriginal: 'rgb(51, 35, 35)' }, // Slightly lighter background
  { original: '#382829', replacement: '#262626', rgbOriginal: 'rgb(56, 40, 41)' }, // Hover/active states
  { original: '#473737', replacement: '#333333', rgbOriginal: 'rgb(71, 55, 55)' }, // Borders and dividers
  { original: '#ff94ab', replacement: '#ff0000', rgbOriginal: 'rgb(255, 148, 171)' }, // Accent color 1
  { original: '#ffa576', replacement: '#ff3333', rgbOriginal: 'rgb(255, 165, 118)' }, // Accent color 2
  { original: '#ff5252', replacement: '#ff6666', rgbOriginal: 'rgb(255, 82, 82)' }, // Error color
  { original: '#52cf6c', replacement: '#00ff00', rgbOriginal: 'rgb(82, 207, 108)' }, // Success color
  { original: '#f8c134', replacement: '#ffff00', rgbOriginal: 'rgb(248, 193, 52)' }, // Warning color
  { original: '#91b0ff', replacement: '#0000ff', rgbOriginal: 'rgb(145, 176, 255)' }, // Info color
  
  // Additional specific RGB colors from linear gradients
  { original: '#3a2224', replacement: '#1a1a1a', rgbOriginal: 'rgb(58, 34, 36)' }, // Linear gradient start
  { original: '#3b241f', replacement: '#262626', rgbOriginal: 'rgb(59, 36, 31)' }, // Linear gradient end
  
  // New color mappings from additional linear gradients
  { original: '#2c1c1c', replacement: '#121212', rgbOriginal: 'rgb(44, 28, 28)' }, // Linear gradient color
  { original: '#200e0e', replacement: '#0a0a0a', rgbOriginal: 'rgb(32, 14, 14)' }, // Dark background color
  
  // Additional colors from UI elements
  { original: '#ffada0', replacement: '#ff6666', rgbOriginal: 'rgb(255, 173, 160)' }, // Leaderboard selected button
  { original: '#3c2c2c', replacement: '#333333', rgbOriginal: 'rgb(60, 44, 44)' }, // Input border
  { original: '#ffbdb2', replacement: '#ff9999', rgbOriginal: 'rgb(255, 189, 178)' }, // Light text button
  { original: '#ff9385', replacement: '#ff6666', rgbOriginal: 'rgb(255, 147, 133)' }, // Pagination active
  { original: '#ff9c8e', replacement: '#ff94ab', rgbOriginal: 'rgb(255, 156, 142)' }, // Inline link color
];

const defaultTheme: Theme = {
  id: 'default',
  name: 'Black & Red',
  description: 'Replace default colors with black and red theme',
  colors
};

export default defaultTheme; 