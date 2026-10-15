'use client'

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'

const bubble: CSSProperties = { width: 56, height: 56, fontSize: 26 }

/** `No active alert` (c12, `#liveIdle`): shown until the demo runs. */
export function IdleCard({ onRun }: { onRun: () => void }) {
  const { t } = useTranslation('live')
  return (
    <article className="glass card idle c12" id="liveIdle">
      <span className="li" style={bubble}><span className="ic"><Icon name="check" /></span></span>
      <h2>{t('idle.title')}</h2>
      <p>{t('idle.body')}</p>
      <button type="button" className="btn sos" onClick={onRun}>
        <span className="ic"><Icon name="bolt" /></span>{t('idle.run')}
      </button>
    </article>
  )
}
