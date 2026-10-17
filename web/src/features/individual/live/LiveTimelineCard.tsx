import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { LiveView } from '@/domain/incident'

const medium = { fontWeight: 500 } as const
const STEP_MS = 1500

/** Entries that arrive after mount appear one per STEP_MS, so viewers can follow them. */
function useReveal(count: number): number {
  const [shown, setShown] = useState(count)
  // A reset shrinks the timeline: follow it down at once.
  if (shown > count) setShown(count)
  useEffect(() => {
    if (shown >= count) return
    const t = setTimeout(() => setShown((n) => n + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [shown, count])
  return Math.min(shown, count)
}

/** `Live timeline` (c4) for a live incident: the incident's own timeline, newest last, and the response times so far. */
export function LiveTimelineCard({ view }: { view: LiveView }) {
  const { t } = useTranslation('live')
  const shown = useReveal(view.timeline.length)
  const rows = view.timeline.slice(0, shown)
  const last = rows.length - 1
  return (
    <GlassCard span={4} id="liveB">
      <div className="ch"><h2>{t('timeline.title')}</h2><span className="meta">{t('timeline.meta')}</span></div>
      {view.timeline.length === 0 ? (
        <p className="fine">{t('live.noLog')}</p>
      ) : (
        <ol className="tl" id="tl" aria-live="polite">
          {rows.map((x, k) => (
            <li key={k} className={'done' + (k === last ? ' cur' : '')}>
              <span className="tm">{x.t}</span>
              <span className="dot"></span>
              <span><b style={medium}>{x.ph}.</b> {x.d}<small>{x.s}</small></span>
            </li>
          ))}
        </ol>
      )}
      <div className="sla" id="sla">
        {view.sla.map(([label, value]) => (
          <div key={label}><small>{label}</small><b style={{ color: value ? '#9ff0de' : 'var(--muted-text)' }}>{value ?? '—'}</b></div>
        ))}
      </div>
    </GlassCard>
  )
}
