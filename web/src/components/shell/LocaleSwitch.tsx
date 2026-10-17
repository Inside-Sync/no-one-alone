'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { currentLanguage, LANGUAGE_INFO, LANGUAGES, type Language } from '@/i18n'
import cn from 'flag-icons/flags/1x1/cn.svg'
import gb from 'flag-icons/flags/1x1/gb.svg'
import hk from 'flag-icons/flags/1x1/hk.svg'
import india from 'flag-icons/flags/1x1/in.svg'
import jp from 'flag-icons/flags/1x1/jp.svg'
import kr from 'flag-icons/flags/1x1/kr.svg'
import vn from 'flag-icons/flags/1x1/vn.svg'
import s from './shell.module.css'

/** Square flags (cropped round): SVG, not emoji, because Windows has no flag emoji. */
const FLAG: Record<Language, string> = { en: gb, vi: vn, hi: india, zh: cn, yue: hk, ja: jp, ko: kr }

/** What each language is called in English, under its own name (a reader who can't read the script still finds theirs). */
const GLOSS: Record<Language, string> = {
  en: 'English', vi: 'Vietnamese', hi: 'Hindi', zh: 'Mandarin · Simplified', yue: 'Cantonese · Hong Kong', ja: 'Japanese', ko: 'Korean',
}

/**
 * Language picker, a sibling of the view switcher (not inside `.tn-right`): on a phone it shares the views row at the
 * same height, so adding it does not re-wrap the top bar. The round badge shows the flag of the language in use and opens a
 * listbox (flag, the language in its own script, its English name), driven by mouse or keyboard.
 * `i18n.changeLanguage` re-renders the app and reloads its data in that language (stored by the detector). */
export function LocaleSwitch() {
  const { t, i18n } = useTranslation()
  void i18n.resolvedLanguage // re-render on change
  const cur = currentLanguage()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrap = useRef<HTMLSpanElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    list.current?.focus()
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  const show = () => { setActive(LANGUAGES.indexOf(cur)); setOpen(true) }
  const close = () => { setOpen(false); button.current?.focus() }
  const pick = (l: Language) => {
    close()
    if (l !== cur) void i18n.changeLanguage(l)
  }

  return (
    <span className={`${s.localeWrap} locale`} ref={wrap}>
      <button
        ref={button}
        type="button"
        className="rb"
        id="localeSwitch"
        aria-label={`${t('nav.language')}: ${LANGUAGE_INFO[cur].name}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="localeList"
        title={LANGUAGE_INFO[cur].name}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); show() } }}
      >
        <img className={s.localeFlag} src={FLAG[cur]} alt="" />
      </button>
      {open && (
        <ul
          ref={list}
          id="localeList"
          role="listbox"
          tabIndex={-1}
          className={s.localeList}
          aria-label={t('nav.language')}
          aria-activedescendant={`locale-${LANGUAGES[active]}`}
          onKeyDown={(e) => {
            const n = LANGUAGES.length
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % n) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + n) % n) }
            else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
            else if (e.key === 'End') { e.preventDefault(); setActive(n - 1) }
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(LANGUAGES[active]) }
            else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); close() }
          }}
        >
          {LANGUAGES.map((l, i) => (
            <li
              key={l}
              id={`locale-${l}`}
              role="option"
              aria-selected={l === cur}
              data-active={i === active || undefined}
              className={s.localeItem}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(l)}
            >
              <img className={s.localeBadge} src={FLAG[l]} alt="" />
              <span className={s.localeText}>
                <b lang={LANGUAGE_INFO[l].html}>{LANGUAGE_INFO[l].name}</b>
                {GLOSS[l] !== LANGUAGE_INFO[l].name && <small>{GLOSS[l]}</small>}
              </span>
              {l === cur && <span className={s.localeCheck} aria-hidden="true"><Icon name="check" /></span>}
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
