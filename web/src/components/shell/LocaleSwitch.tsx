'use client'

import { useTranslation } from 'react-i18next'
import { currentLanguage, type Language } from '@/i18n'

const NAMES: Record<Language, string> = { en: 'English', vi: 'Tiếng Việt' }
const style = { fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' } as const

/**
 * EN / VI toggle, a sibling of the view switcher (not inside `.tn-right`): on a phone it shares the views row at the
 * same height, so adding it does not re-wrap the top bar.
 * `i18n.changeLanguage` re-renders the app and reloads its data in that language (stored by the detector). */
export function LocaleSwitch() {
  const { i18n } = useTranslation()
  void i18n.resolvedLanguage // re-render on change
  const next: Language = currentLanguage() === 'en' ? 'vi' : 'en'
  return (
    <button
      type="button"
      className="rb locale"
      id="localeSwitch"
      lang={next}
      aria-label={next === 'vi' ? `Chuyển sang ${NAMES.vi}` : `Switch to ${NAMES.en}`}
      title={NAMES[next]}
      onClick={() => void i18n.changeLanguage(next)}
      style={style}
    >
      {next.toUpperCase()}
    </button>
  )
}
