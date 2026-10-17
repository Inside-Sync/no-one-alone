import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph, Icon, type IconName } from '@/components/ui/Icon'
import type { TimelineKind } from '@/data/contract'
import type { LiveView } from '@/domain/incident'

const STEP_MS = 1500

const ICON: Record<TimelineKind, IconName> = {
  ALERT: 'search', VERIFIED: 'circle-check', FALSE_ALARM: 'heart', ASKED: 'message-circle', ANSWERED: 'ear', NO_REPLY: 'volume-x',
  TRIAGED: 'compass', ALERTED: 'bell', NOTIFIED: 'phone', ACCEPTED: 'circle-check', DECLINED: 'ban', EXPIRED: 'phone-off',
  NO_NEARBY: 'map-pin', ARRIVED: 'home', CALLED_115: 'ambulance', HANDOFF_SENT: 'hospital', HANDOFF_RECEIVED: 'hospital',
  HANDOFF_FAILED: 'triangle-alert', FAMILY_UPDATE: 'users', AGENT_FALLBACK: 'settings', CLOSED: 'check', DISCHARGED: 'sprout',
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
      <div className="ch"><h2><Glyph name="notebook-text" />{t('agent.log.title')}</h2><span className="meta">{t('agent.log.meta')}</span></div>
      <div className="loggrid">
        <ol className="alog" id="tl" aria-live="polite">
          {rows.length === 0 ? (
            <li><span className="t">{time}</span><span className="ic"><Icon name="eye" /></span><span>{t('agent.log.idle')}</span></li>
          ) : rows.map((x, k) => (
            <li key={all.length - k} className={TONE[x.kind] ?? ''}>
              <span className="t">{x.t}</span><span className="ic"><Icon name={ICON[x.kind]} /></span>
              <span>{x.d} <small>· {x.s}</small></span>
            </li>
          ))}
        </ol>
        {view && (
          <div className="sla-col">
            <div className="eyebrow">{t('agent.log.sla')}</div>
            <div className="sla" id="sla">
              {view.sla.map(([label, value]) => (
                <div key={label}><small>{label}</small><b style={{ color: value ? 'var(--good)' : 'var(--muted-text)' }}>{value ?? '—'}</b></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
