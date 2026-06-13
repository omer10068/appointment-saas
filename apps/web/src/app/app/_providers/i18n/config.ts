import type { Locale } from './types';

export const LOCALES: Locale[] = ['he', 'en'];
export const DEFAULT_LOCALE: Locale = 'he';
export const COOKIE_NAME = 'dashboard_locale';

export function isValidLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as string[]).includes(value);
}

export function getDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr';
}

export function getLang(locale: Locale): string {
  return locale === 'he' ? 'he' : 'en';
}
