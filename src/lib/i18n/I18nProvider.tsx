'use client';
import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type SupportedLocale, DEFAULT_LOCALE } from './config';

interface Props {
  children: React.ReactNode;
}

// Ensures i18next is initialised before descendants render and
// keeps the <html lang> attribute in sync with the active language.
// Fixes hydration mismatch by forcing EN on SSR + first client-render,
// then switching to localStorage language after mount.
export default function I18nProvider({ children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // On first mount: switch to the language from localStorage
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (storedLocale && (SUPPORTED_LOCALES as readonly string[]).includes(storedLocale)) {
      i18n.changeLanguage(storedLocale as SupportedLocale);
    } else {
      // Fall back to browser language if available
      const navLang = window.navigator?.language?.slice(0, 2).toLowerCase();
      if (navLang && (SUPPORTED_LOCALES as readonly string[]).includes(navLang)) {
        i18n.changeLanguage(navLang as SupportedLocale);
      }
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const syncHtmlLang = (lng: string) => {
      if (typeof document !== 'undefined') document.documentElement.lang = lng;
    };
    syncHtmlLang(i18n.language);

    // If localStorage value changes in another tab, mirror it here
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOCALE_STORAGE_KEY || !e.newValue) return;
      if ((SUPPORTED_LOCALES as readonly string[]).includes(e.newValue) && e.newValue !== i18n.language) {
        i18n.changeLanguage(e.newValue as SupportedLocale);
      }
    };
    i18n.on('languageChanged', syncHtmlLang);
    window.addEventListener('storage', onStorage);
    return () => {
      i18n.off('languageChanged', syncHtmlLang);
      window.removeEventListener('storage', onStorage);
    };
  }, [mounted]);

  // Before mount, ensure i18n is on DEFAULT_LOCALE (EN) to match SSR
  if (!mounted && i18n.language !== DEFAULT_LOCALE) {
    i18n.changeLanguage(DEFAULT_LOCALE);
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
