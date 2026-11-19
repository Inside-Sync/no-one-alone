import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en'
import ar from '../locales/ar'

/**
 * i18next with one JSON file per namespace and language: `src/locales/{lng}/{ns}.json`, gathered per language by
 * `src/locales/{lng}/index.ts`. The mock's data lives next to it in `src/locales/{lng}/data/*.json` and is read by the
 * data layer, not by i18next.
 *
 * The language is detected from the stored choice, then the browser (unsupported -> English), and switching
 * (`i18n.changeLanguage`) re-renders every `useTranslation()` user and re-runs every `useRepo` load.
 * Arabic is right to left: `<html lang dir>` follows the language.
 */
export const LANGUAGES = ['en', 'ar'] as const
export type Language = (typeof LANGUAGES)[number]

/** Per language: its own name, the short badge on the switcher, the `Intl` locale, the `<html lang>` tag and the text direction. */
export const LANGUAGE_INFO: Record<Language, { name: string; short: string; intl: string; html: string; dir: 'ltr' | 'rtl' }> = {
  en: { name: 'English', short: 'EN', intl: 'en-GB', html: 'en', dir: 'ltr' },
  ar: { name: 'العربية', short: 'ع', intl: 'ar-AE-u-nu-latn', html: 'ar', dir: 'rtl' },
}

export const NAMESPACES = [
  'common', 'home', 'health', 'around', 'live', 'me', 'privacy', 'lineage', 'record', 'hospital', 'screening', 'government', 'overlay', 'chat', 'treatment', 'patients', 'overview', 'guide', 'testcase', 'testcaseShell', 'tcSafety', 'tcPrevention', 'tcApp', 'tcBench', 'tcGates', 'familyHealth', 'familyHealthUi',
] as const

// Explicit imports (not import.meta.glob) so this module also loads outside Vite, e.g. in Playwright's e2e helpers.
const resources = { en, ar }

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: LANGUAGES,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'en',
    ns: NAMESPACES,
    defaultNS: 'common',
    interpolation: { escapeValue: false }, // React escapes
    detection: { order: ['localStorage', 'navigator'], lookupLocalStorage: 'noa-locale', caches: ['localStorage'] },
    react: { useSuspense: false },
  })

/** The language in use (one of `LANGUAGES`, English when the resolved one is not ours). */
export const currentLanguage = (): Language => {
  const lng = i18n.resolvedLanguage
  return (LANGUAGES as readonly string[]).includes(lng ?? '') ? (lng as Language) : 'en'
}

/** The `Intl` locale for dates, numbers and lists in the language in use (or in `lng`, an i18next language). */
export const intlLocale = (lng?: string): string => {
  const l = lng ? lng.split('-')[0] : currentLanguage()
  return (LANGUAGE_INFO as Record<string, { intl: string }>)[l]?.intl ?? LANGUAGE_INFO.en.intl
}

const syncLang = () => {
  if (typeof document === 'undefined') return
  const info = LANGUAGE_INFO[currentLanguage()]
  document.documentElement.lang = info.html
  document.documentElement.dir = info.dir
}
syncLang()
i18n.on('languageChanged', syncLang)

export default i18n
