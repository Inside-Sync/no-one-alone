import { GlassCard } from '@/components/ui/GlassCard'
import { LIVE_COPY } from '@/data/repo'
import type { LiveView } from '@/domain/incident'

const medium = { fontWeight: 500 } as const

/** `Live timeline` (c4) for a live incident: the incident's own timeline, newest last, and the response times so far. */
export function LiveTimelineCard({ view }: { view: LiveView }) {
  const c = LIVE_COPY
  const last = view.timeline.length - 1
  return (
    <GlassCard span={4} id="liveB">
      <div className="ch"><h2>{c.timeline.title}</h2><span className="meta">{c.timeline.meta}</span></div>
      {view.timeline.length === 0 ? (
        <p className="fine">{c.live.noLog}</p>
      ) : (
        <ol className="tl" id="tl" aria-live="polite">
          {view.timeline.map((x, k) => (
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
