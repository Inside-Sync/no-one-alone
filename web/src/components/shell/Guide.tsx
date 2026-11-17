'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePathname } from '@/app/navigation'
import { Icon } from '@/components/ui/Icon'
import { parsePath } from '@/domain/views'
import { useAppState } from '@/state/AppState'
import { useShellOverrides } from './ShellOverrides'

/** Where the Hide/Show choice is remembered (`off` hides the tips on every page). */
const TIPS_KEY = 'noa-tips'

function readOff(): boolean {
  try {
    return localStorage.getItem(TIPS_KEY) === 'off'
  } catch {
    return false
  }
}

/**
 * The "On this screen" card under the context bar, with a "Try" line and Hide tips; once hidden, a "Show tips" chip
 * takes its place. Text per page id is `guide:tips.pages.<page>`; the family role has its own for the pages in
 * `guide:tips.family`; a page can pick another through `useTipKey`.
 */
export function Guide() {
  const { t, i18n } = useTranslation('guide')
  const { view, page } = parsePath(usePathname())
  const { who } = useAppState()
  const { tip: tipKey } = useShellOverrides()
  const [off, setOff] = useState(readOff)

  const candidates = [
    ...(tipKey ? [`tips.${tipKey}`] : []),
    ...(view === 'individual' && who === 'family' && page ? [`tips.family.${page}`] : []),
    ...(page ? [`tips.pages.${page}`] : []),
  ]
  const base = candidates.find((k) => i18n.exists(`guide:${k}.text`))
  if (!base) return null

  const choose = (hide: boolean) => {
    setOff(hide)
    try {
      localStorage.setItem(TIPS_KEY, hide ? 'off' : 'on')
    } catch {
      /* storage unavailable: the choice lasts until reload */
    }
  }

  if (off) {
    return (
      <button type="button" className="chip guide-show" id="guideShow" onClick={() => choose(false)}>
        <span className="ic"><Icon name="info" /></span>{t('tips.show')}
      </button>
    )
  }
  return (
    <aside className="glass guide" id="guide" aria-label={t('tips.heading')}>
      <span className="g-i ic" aria-hidden="true"><Icon name="info" tint /></span>
      <div className="g-b">
        <b className="g-h">{t('tips.heading')}</b>
        <span>{t(`${base}.text` as 'tips.heading')}</span>
        <span className="g-try"><b>{t('tips.try')}</b> {t(`${base}.try` as 'tips.heading')}</span>
      </div>
      <button type="button" className="chip" id="gHide" onClick={() => choose(true)}>{t('tips.hide')}</button>
    </aside>
  )
}
