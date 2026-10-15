import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import enCommon from '../locales/en/common.json' with { type: 'json' }
import enHome from '../locales/en/home.json' with { type: 'json' }
import enHealth from '../locales/en/health.json' with { type: 'json' }
import enAround from '../locales/en/around.json' with { type: 'json' }
import enForecast from '../locales/en/forecast.json' with { type: 'json' }
import enLive from '../locales/en/live.json' with { type: 'json' }
import enMe from '../locales/en/me.json' with { type: 'json' }
import enPrivacy from '../locales/en/privacy.json' with { type: 'json' }
import enLineage from '../locales/en/lineage.json' with { type: 'json' }
import enRecord from '../locales/en/record.json' with { type: 'json' }
import enHospital from '../locales/en/hospital.json' with { type: 'json' }
import enCommunity from '../locales/en/community.json' with { type: 'json' }
import enOverlay from '../locales/en/overlay.json' with { type: 'json' }
import viCommon from '../locales/vi/common.json' with { type: 'json' }
import viHome from '../locales/vi/home.json' with { type: 'json' }
import viHealth from '../locales/vi/health.json' with { type: 'json' }
import viAround from '../locales/vi/around.json' with { type: 'json' }
import viForecast from '../locales/vi/forecast.json' with { type: 'json' }
import viLive from '../locales/vi/live.json' with { type: 'json' }
import viMe from '../locales/vi/me.json' with { type: 'json' }
import viPrivacy from '../locales/vi/privacy.json' with { type: 'json' }
import viLineage from '../locales/vi/lineage.json' with { type: 'json' }
import viRecord from '../locales/vi/record.json' with { type: 'json' }
import viHospital from '../locales/vi/hospital.json' with { type: 'json' }
import viCommunity from '../locales/vi/community.json' with { type: 'json' }
import viOverlay from '../locales/vi/overlay.json' with { type: 'json' }

/**
 * i18next with one JSON file per namespace and language: `src/locales/{lng}/{ns}.json`. The mock's data lives next to
 * it in `src/locales/{lng}/data/*.json` and is read by the data layer, not by i18next.
 *
 * The language is detected from the stored choice, then the browser (vi → Vietnamese, anything else → English), and
 * switching (`i18n.changeLanguage`) re-renders every `useTranslation()` user and re-runs every `useRepo` load.
 */
export const LANGUAGES = ['en', 'vi'] as const
export type Language = (typeof LANGUAGES)[number]

export const NAMESPACES = [
  'common', 'home', 'health', 'around', 'forecast', 'live', 'me', 'privacy', 'lineage', 'record', 'hospital', 'community', 'overlay',
] as const

// Explicit imports (not import.meta.glob) so this module also loads outside Vite, e.g. in Playwright's e2e helpers.
const resources = {
  en: { common: enCommon, home: enHome, health: enHealth, around: enAround, forecast: enForecast, live: enLive, me: enMe, privacy: enPrivacy, lineage: enLineage, record: enRecord, hospital: enHospital, community: enCommunity, overlay: enOverlay },
  vi: { common: viCommon, home: viHome, health: viHealth, around: viAround, forecast: viForecast, live: viLive, me: viMe, privacy: viPrivacy, lineage: viLineage, record: viRecord, hospital: viHospital, community: viCommunity, overlay: viOverlay },
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
    detection: { order: ['localStorage', 'navigator'], lookupLocalStorage: 'noa-locale', caches: ['localStorage'] },
    react: { useSuspense: false },
  })

const syncLang = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng
}
syncLang(i18n.resolvedLanguage ?? 'en')
i18n.on('languageChanged', syncLang)

/** The language in use (`en` or `vi`). */
export const currentLanguage = (): Language => (i18n.resolvedLanguage === 'vi' ? 'vi' : 'en')

export default i18n
