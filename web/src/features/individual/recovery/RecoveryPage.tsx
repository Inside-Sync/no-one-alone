'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { RecoveryDoc } from '@/data/contract'
import { followUpCalls, handoffFacts } from '@/domain/recovery'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import { RecoveryCard } from './RecoveryCard'

/** `From Noa` (c12): what Noa told Margaret at hand-off, built from the approved plan. */
function NoaHandoffCard({ recovery, who }: { recovery: RecoveryDoc; who: 'self' | 'family' }) {
  const { t, i18n } = useTranslation('me')
  const lang = i18n.language.startsWith('vi') ? 'vi' : 'en-GB'
  const list = (names: string[]) => new Intl.ListFormat(lang, { type: 'conjunction' }).format(names)
  const f = handoffFacts(recovery)
  const meds = [
    f.newMeds.length ? t('recovery.noa.newMeds', { count: f.newMeds.length, names: list(f.newMeds) }) : '',
    f.stopMeds.length ? t('recovery.noa.stopMeds', { names: list(f.stopMeds) }) : '',
    f.newMeds.length || f.stopMeds.length ? t('recovery.noa.pharmacy') : '',
  ]
  const date = f.followUp && new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(Date.parse(f.followUp.date))
  const lines: [noa: boolean, text: string][] = [
    [true, t('recovery.noa.welcome')],
    [true, meds.filter(Boolean).join(' ')],
    [false, t('recovery.noa.thanks')],
    [true, f.next ? t('recovery.noa.next', { time: f.next.time, items: f.next.items.join(' + ') }) : ''],
    [true, [t('recovery.noa.also'), f.followUp ? t('recovery.noa.followUp', { text: f.followUp.text, date }) : ''].filter(Boolean).join(' ')],
    [true, t('recovery.noa.call')],
    [false, t('recovery.noa.bye')],
  ]
  return (
    <GlassCard span={12}>
      <div className="ch"><h2>{t('recovery.noa.title', { context: who })}</h2><span className="meta">{t('recovery.noa.meta')}</span></div>
      <ol className="list">
        {lines.filter(([, text]) => text).map(([noa, text], i) => (
          <li key={i} style={{ display: 'block' }}><b>{t(noa ? 'recovery.noa.noa' : 'recovery.noa.margaret')}</b><span>{text}</span></li>
        ))}
      </ol>
    </GlassCard>
  )
}

/** Individual view · My recovery / Recovery: the plan the hospital sent home, and the planned check-in calls. */
export function RecoveryPage() {
  const { who } = useAppState()
  const { t } = useTranslation('me')
  const { live, incident, people } = useLiveIncident()
  const recovery = live ? incident?.recovery : undefined
  if (!recovery) {
    return (
      <main className="grid" data-page="recovery">
        <GlassCard span={12}><p>{t('recovery.idle', { context: who })}</p></GlassCard>
      </main>
    )
  }
  const tz = people.person?.timezone ?? 'Australia/Sydney'
  return (
    <main className="grid" data-page="recovery">
      <RecoveryCard recovery={recovery} tz={tz} who={who} />
      <NoaHandoffCard recovery={recovery} who={who} />
      <GlassCard span={12}>
        <div className="ch"><h2>{t('recovery.calls.title', { context: who })}</h2><span className="meta">{t('recovery.calls.meta')}</span></div>
        <ul className="list">
          {followUpCalls(recovery.createdAt, tz).map((c) => (
            <li key={c.day}>
              <b>{c.day}</b>
              <span>
                <small style={{ display: 'block' }}>{t('recovery.calls.when', { day: c.day, date: c.date })}</small>
                {t(`recovery.calls.topics.${c.day}` as 'recovery.calls.topics.1')}
              </span>
              <span className="pill plain">{t('recovery.calls.planned')}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </main>
  )
}
