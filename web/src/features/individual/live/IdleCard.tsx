'use client'

import type { CSSProperties } from 'react'
import { Icon } from '@/components/ui/Icon'
import { LIVE_COPY } from '@/data/repo'

const bubble: CSSProperties = { width: 56, height: 56, fontSize: 26 }

/** `No active alert` (c12, `#liveIdle`): shown until the demo runs. */
export function IdleCard({ onRun }: { onRun: () => void }) {
  const c = LIVE_COPY.idle
  return (
    <article className="glass card idle c12" id="liveIdle">
      <span className="li" style={bubble}><span className="ic"><Icon name="check" /></span></span>
      <h2>{c.title}</h2>
      <p>{c.body}</p>
      <button type="button" className="btn sos" onClick={onRun}>
        <span className="ic"><Icon name="bolt" /></span>{c.run}
      </button>
    </article>
  )
}
