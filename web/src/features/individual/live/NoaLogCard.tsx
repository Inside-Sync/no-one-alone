import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { TimelineKind } from '@/data/contract'
import type { LiveView } from '@/domain/incident'

const STEP_MS = 1500

const ICON: Record<TimelineKind, string> = {
  ALERT: '🔎', VERIFIED: '✅', FALSE_ALARM: '💚', ASKED: '💬', ANSWERED: '👂', NO_REPLY: '🔇', TRIAGED: '🧭', ALERTED: '🔔',
  NOTIFIED: '📞', ACCEPTED: '✅', DECLINED: '🚫', EXPIRED: '📵', NO_NEARBY: '📍', ARRIVED: '🏠', CALLED_115: '🚑',
  HANDOFF_SENT: '🏥', HANDOFF_RECEIVED: '🏥', HANDOFF_FAILED: '⚠️', FAMILY_UPDATE: '👪', AGENT_FALLBACK: '⚙️', CLOSED: '✔️', DISCHARGED: '🌱',
}
const TONE: Partial<Record<TimelineKind, 'bad' | 'good'>> = {
  ALERT: 'bad', ALERTED: 'bad', CALLED_115: 'bad', NO_NEARBY: 'bad', HANDOFF_FAILED: 'bad',
  ACCEPTED: 'good', ARRIVED: 'good', HANDOFF_RECEIVED: 'good', FALSE_ALARM: 'good', CLOSED: 'good',
}

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

/** `Noa's log` (c12): every step of the incident, newest first, then the response times so far. */
export function NoaLogCard({ view, time }: { view: LiveView | null; time: string }) {
  const { t } = useTranslation('live')
  const all = view?.timeline ?? []
  const shown = useReveal(all.length)
  const rows = all.slice(0, shown).reverse()
  return (
    <GlassCard span={12} id="liveB">
      <div className="ch"><h2>{t('agent.log.title')}</h2><span className="meta">{t('agent.log.meta')}</span></div>
      <ol className="alog" id="tl" aria-live="polite">
        {rows.length === 0 ? (
          <li><span className="t">{time}</span><span aria-hidden="true">👀</span><span>{t('agent.log.idle')}</span></li>
        ) : rows.map((x, k) => (
          <li key={all.length - k} className={TONE[x.kind] ?? ''}>
            <span className="t">{x.t}</span><span aria-hidden="true">{ICON[x.kind]}</span>
            <span>{x.d} <small>· {x.s}</small></span>
          </li>
        ))}
      </ol>
      {view && (
        <div className="sla" id="sla">
          {view.sla.map(([label, value]) => (
            <div key={label}><small>{label}</small><b style={{ color: value ? 'var(--good)' : 'var(--muted-text)' }}>{value ?? '—'}</b></div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
