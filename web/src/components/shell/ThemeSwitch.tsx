'use client'

import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useAppState } from '@/state/AppState'

/** Light/dark switch (`noa-theme`): an icon button that shows the mode it will switch to. Dark reuses the night variables. */
export function ThemeSwitch() {
  const { t } = useTranslation()
  const { theme, setTheme } = useAppState()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className="rb"
      id="themeBtn"
      aria-label={t(dark ? 'nav.themeLight' : 'nav.themeDark')}
      title={t(dark ? 'nav.themeLight' : 'nav.themeDark')}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <span className="ic"><Icon name={dark ? 'sun' : 'moon'} /></span>
    </button>
  )
}
