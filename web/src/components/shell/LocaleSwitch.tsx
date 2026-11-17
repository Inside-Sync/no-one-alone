'use client'

import { useTranslation } from 'react-i18next'
import { currentLanguage, LANGUAGE_INFO, LANGUAGES, type Language } from '@/i18n'
import s from './shell.module.css'

/**
 * Language switch, a sibling of the view switcher: a two-state control, `EN` and `ع`. Each state is a real button with
 * `aria-pressed`, so Tab, Enter and Space work and a screen reader hears the language by its own name.
 * `i18n.changeLanguage` re-renders the app, reloads its data in that language, and sets `<html lang dir>`.
 */
export function LocaleSwitch() {
  const { t, i18n } = useTranslation()
  void i18n.resolvedLanguage // re-render on change
  const cur = currentLanguage()
  const pick = (l: Language) => {
    if (l !== cur) void i18n.changeLanguage(l)
  }

  return (
    <span className={`${s.localeWrap} locale seg`} role="group" id="localeSwitch" aria-label={t('nav.language')}>
      {LANGUAGES.map((l) => (
        <button
          key={l}
          type="button"
          id={`locale-${l}`}
          lang={LANGUAGE_INFO[l].html}
          aria-pressed={l === cur}
          aria-label={t(l === 'en' ? 'nav.languageEn' : 'nav.languageAr')}
          title={LANGUAGE_INFO[l].name}
          onClick={() => pick(l)}
        >
          {LANGUAGE_INFO[l].short}
        </button>
      ))}
    </span>
  )
}
