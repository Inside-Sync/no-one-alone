'use client'

import { useState, type CSSProperties } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { apiErrorCode, LIVE_COPY } from '@/data/repo'
import type { DemoScenario } from '@/data/contract'

const bubble: CSSProperties = { width: 56, height: 56, fontSize: 26 }
const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }

/** No open incident (live mode): start one of the contract's scenarios, or reset the demo. */
export function LiveIdleCard({ title, start, onReset }: { title: string; start: (s: DemoScenario) => Promise<void>; onReset: () => void }) {
  const toast = useToast()
  const c = LIVE_COPY.live
  const [busy, setBusy] = useState(false)
  const run = (s: DemoScenario) => {
    setBusy(true)
    toast(c.starting)
    start(s).catch((e: unknown) => toast(apiErrorCode(e) === 'INVALID_STATE' ? c.busy : c.failed)).finally(() => setBusy(false))
  }
  return (
    <article className="glass card idle c12" id="liveIdle">
      <span className="li" style={bubble}><span className="ic"><Icon name="check" /></span></span>
      <h2>{title}</h2>
      <p>{c.idleBody}</p>
      <div style={row}>
        {c.scenarios.map((s) => (
          <button key={s.id} type="button" className={s.id === 'stroke' ? 'btn sos' : 'btn soft'} disabled={busy} onClick={() => run(s.id)}>
            <span className="ic"><Icon name={s.icon} /></span>{s.label}
          </button>
        ))}
        <button type="button" className="btn soft" disabled={busy} onClick={onReset}>{c.reset}</button>
      </div>
    </article>
  )
}
