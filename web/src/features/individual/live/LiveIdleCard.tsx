'use client'

import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { apiErrorCode } from '@/data/repo'
import type { DemoScenario } from '@/data/contract'
import type { IconName } from '@/data/types'

const bubble: CSSProperties = { width: 56, height: 56, fontSize: 26 }
const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }

/** No open incident (live mode): start one of the contract's scenarios, or reset the demo. */
export function LiveIdleCard({ title, start, onReset }: { title: string; start: (s: DemoScenario) => Promise<void>; onReset: () => void }) {
  const toast = useToast()
  const { t } = useTranslation('live')
  const [busy, setBusy] = useState(false)
  const run = (s: DemoScenario) => {
    setBusy(true)
    toast(t('live.starting'))
    start(s).catch((e: unknown) => toast(apiErrorCode(e) === 'INVALID_STATE' ? t('live.busy') : t('live.failed'))).finally(() => setBusy(false))
  }
  return (
    <article className="glass card idle c12" id="liveIdle">
      <span className="li" style={bubble}><span className="ic"><Icon name="check" /></span></span>
      <h2>{title}</h2>
      <p>{t('live.idleBody')}</p>
      <div style={row}>
        {t('live.scenarios', { returnObjects: true }).map((s) => (
          <button key={s.id} type="button" className={s.id === 'stroke' ? 'btn sos' : 'btn soft'} disabled={busy} onClick={() => run(s.id as DemoScenario)}>
            <span className="ic"><Icon name={s.icon as IconName} /></span>{s.label}
          </button>
        ))}
        <button type="button" className="btn soft" disabled={busy} onClick={onReset}>{t('live.reset')}</button>
      </div>
    </article>
  )
}
