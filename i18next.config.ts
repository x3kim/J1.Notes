// Project-level i18n configuration.
// The actual runtime (`src/lib/i18n/config.ts`) consumes these values so the
// lists stay in one place and translations live under `public/locales/`.
export const SUPPORTED_LOCALES = ['en', 'de'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const I18N_NAMESPACES = [
  'common',
  'auth',
  'notes',
  'settings',
  'errors',
] as const;

// Where translation JSON files live on disk.
// Structure: public/locales/<lng>/<ns>.json
export const LOCALES_PATH = 'public/locales';
