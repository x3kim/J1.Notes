'use client';
import { useTranslation } from 'react-i18next';
import { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type SupportedLocale } from './config';

/**
 * Small convenience hook: returns the active locale and a setter
 * that persists to localStorage so the choice survives reloads.
 */
export function useLocale() {
  const { i18n } = useTranslation();
  const locale = (i18n.language?.slice(0, 2) || 'en') as SupportedLocale;

  const setLocale = (next: SupportedLocale) => {
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(next)) return;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore — best effort
    }
    i18n.changeLanguage(next);
  };

  return { locale, setLocale, supportedLocales: SUPPORTED_LOCALES };
}
