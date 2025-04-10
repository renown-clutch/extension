import type { Theme } from './theme-types';
import defaultTheme from './default';
import blueTheme from './blue';

// Export all themes
export { defaultTheme, blueTheme };

// Export theme types
export type { Theme, ColorMapping } from './theme-types';

// List of all available themes
const themes: Theme[] = [
  defaultTheme,
  blueTheme
];

// Get a theme by ID
export function getThemeById(id: string): Theme | undefined {
  return themes.find(theme => theme.id === id);
}

// Get all available themes
export function getAllThemes(): Theme[] {
  return [...themes];
} 