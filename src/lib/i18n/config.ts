// Central i18n runtime configuration for gNotes
// Loads translation resources from public/locales/{lng}/{ns}.json at build time
// via Next.js JSON import so there is no runtime HTTP fetch needed (self-hosted).
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// EN
import enCommon from '../../../public/locales/en/common.json';
import enAuth from '../../../public/locales/en/auth.json';
import enNotes from '../../../public/locales/en/notes.json';
import enSettings from '../../../public/locales/en/settings.json';
import enErrors from '../../../public/locales/en/errors.json';

// DE
import deCommon from '../../../public/locales/de/common.json';
import deAuth from '../../../public/locales/de/auth.json';
import deNotes from '../../../public/locales/de/notes.json';
import deSettings from '../../../public/locales/de/settings.json';
import deErrors from '../../../public/locales/de/errors.json';

// FR
import frCommon from '../../../public/locales/fr/common.json';
import frAuth from '../../../public/locales/fr/auth.json';
import frNotes from '../../../public/locales/fr/notes.json';
import frSettings from '../../../public/locales/fr/settings.json';
import frErrors from '../../../public/locales/fr/errors.json';

export const SUPPORTED_LOCALES = ['en', 'de', 'fr'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const LOCALE_STORAGE_KEY = 'gnotes-locale';

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    notes: enNotes,
    settings: enSettings,
    errors: enErrors,
  },
  de: {
    common: deCommon,
    auth: deAuth,
    notes: deNotes,
    settings: deSettings,
    errors: deErrors,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    notes: frNotes,
    settings: frSettings,
    errors: frErrors,
  },
} as const;

export const I18N_NAMESPACES = ['common', 'auth', 'notes', 'settings', 'errors'] as const;

function readInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
      return stored as SupportedLocale;
    }
    const navLang = window.navigator?.language?.slice(0, 2).toLowerCase();
    if (navLang && (SUPPORTED_LOCALES as readonly string[]).includes(navLang)) {
      return navLang as SupportedLocale;
    }
  } catch {
    // localStorage unavailable — fall through
  }
  return DEFAULT_LOCALE;
}

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: readInitialLocale(),
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: 'common',
      ns: [...I18N_NAMESPACES],
      supportedLngs: [...SUPPORTED_LOCALES],
      interpolation: {
        escapeValue: false, // React already escapes
      },
      react: {
        useSuspense: false,
      },
    });
}

export default i18n;
