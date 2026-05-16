export type Theme = 'light' | 'dark';

export const THEMES: Theme[] = ['light', 'dark'];
export const DEFAULT_THEME: Theme = 'light';
export const THEME_COOKIE = 'dashboard_theme';

export function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as string[]).includes(value);
}
