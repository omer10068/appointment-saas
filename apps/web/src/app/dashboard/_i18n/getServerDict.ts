import { cookies } from 'next/headers';
import { COOKIE_NAME, DEFAULT_LOCALE, isValidLocale } from './config';
import { getDictionary } from './dictionaries';
import type { DashboardDictionary } from './types';

export async function getServerDict(): Promise<DashboardDictionary> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  const locale = isValidLocale(raw) ? raw : DEFAULT_LOCALE;
  return getDictionary(locale);
}
