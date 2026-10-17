import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en'
import vi from '../locales/vi'
import hi from '../locales/hi'
import zh from '../locales/zh'
import yue from '../locales/yue'
import ja from '../locales/ja'
import ko from '../locales/ko'

/**
 * i18next with one JSON file per namespace and language: `src/locales/{lng}/{ns}.json`, gathered per language by
 * `src/locales/{lng}/index.ts`. The mock's data lives next to it in `src/locales/{lng}/data/*.json` and is read by the
 * data layer, not by i18next.
 *
 * The language is detected from the stored choice, then the browser (zh-HK / zh-MO → Cantonese, other zh → Mandarin,
 * unsupported → English), and switching (`i18n.changeLanguage`) re-renders every `useTranslation()` user and re-runs
 * every `useRepo` load.
 */
export const LANGUAGES = ['en', 'vi', 'hi', 'zh', 'yue', 'ja', 'ko'] as const
export type Language = (typeof LANGUAGES)[number]

/** Per language: its own name, the short badge on the switcher, the `Intl` locale and the `<html lang>` tag. */
export const LANGUAGE_INFO: Record<Language, { name: string; short: string; intl: string; html: string }> = {
  en: { name: 'English', short: 'EN', intl: 'en-GB', html: 'en' },
  vi: { name: 'Tiếng Việt', short: 'VI', intl: 'vi-VN', html: 'vi' },
  hi: { name: 'हिन्दी', short: 'हि', intl: 'hi-IN', html: 'hi' },
  zh: { name: '普通话', short: '中', intl: 'zh-CN', html: 'zh-Hans' },
  yue: { name: '廣東話', short: '粵', intl: 'zh-HK', html: 'zh-HK' },
  ja: { name: '日本語', short: '日', intl: 'ja-JP', html: 'ja' },
  ko: { name: '한국어', short: '한', intl: 'ko-KR', html: 'ko' },
}

export const NAMESPACES = [
  'common', 'home', 'health', 'around', 'forecast', 'live', 'me', 'privacy', 'lineage', 'record', 'hospital', 'community', 'overlay', 'chat',
] as const

// Explicit imports (not import.meta.glob) so this module also loads outside Vite, e.g. in Playwright's e2e helpers.
const resources = { en, vi, hi, zh, yue, ja, ko }

/** Browser tags to ours: Hong Kong / Macau Chinese is Cantonese, any other Chinese is Mandarin. */
const toLanguage = (tag: string) => {
  if (/^(yue|zh-(hk|mo|hant-hk|hant-mo))\b/i.test(tag)) return 'yue'
  if (/^zh\b/i.test(tag)) return 'zh'
  return tag
}

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
    detection: { order: ['localStorage', 'navigator'], lookupLocalStorage: 'noa-locale', caches: ['localStorage'], convertDetectedLanguage: toLanguage },
    react: { useSuspense: false },
  })

/** The language in use (one of `LANGUAGES`, English when the resolved one is not ours). */
export const currentLanguage = (): Language => {
  const lng = i18n.resolvedLanguage
  return (LANGUAGES as readonly string[]).includes(lng ?? '') ? (lng as Language) : 'en'
}

/** The `Intl` locale for dates, numbers and lists in the language in use (or in `lng`, an i18next language). */
export const intlLocale = (lng?: string): string => {
  const l = lng ? toLanguage(lng).split('-')[0] : currentLanguage()
  return (LANGUAGE_INFO as Record<string, { intl: string }>)[l]?.intl ?? LANGUAGE_INFO.en.intl
}

const syncLang = () => {
  if (typeof document !== 'undefined') document.documentElement.lang = LANGUAGE_INFO[currentLanguage()].html
}
syncLang()
i18n.on('languageChanged', syncLang)

export default i18n
