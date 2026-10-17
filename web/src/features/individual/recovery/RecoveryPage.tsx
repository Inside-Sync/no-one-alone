'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { intlLocale } from '@/i18n'
import type { RecoveryDoc } from '@/data/contract'
import { dayLabel, followUpCalls, handoffFacts } from '@/domain/recovery'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import { MOCK_RECOVERY } from './mockRecovery'
import { RecoveryCard } from './RecoveryCard'
import { SelfRecovery } from './SelfRecovery'


/** `From Noa` (c12): what Noa told Margaret at hand-off, built from the approved plan. */
function NoaHandoffCard({ recovery, who }: { recovery: RecoveryDoc; who: 'self' | 'family' }) {
  const { t, i18n } = useTranslation('me')
  const list = (names: string[]) => new Intl.ListFormat(intlLocale(i18n.language), { type: 'conjunction' }).format(names)
  const f = handoffFacts(recovery)
  const meds = [
    f.newMeds.length ? t('recovery.noa.newMeds', { count: f.newMeds.length, names: list(f.newMeds) }) : '',
    f.stopMeds.length ? t('recovery.noa.stopMeds', { names: list(f.stopMeds) }) : '',
    f.newMeds.length || f.stopMeds.length ? t('recovery.noa.pharmacy') : '',
  ]
  const date = f.followUp && dayLabel(f.followUp.date, i18n.language)
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

/** Individual view · My recovery / Recovery: Margaret gets her own layouts; the family sees the plan, Noa's hand-off and the planned calls. */
export function RecoveryPage() {
  const { who } = useAppState()
  const { t, i18n } = useTranslation('me')
  const { live, incident, people } = useLiveIncident()
  // Dev only: a dummy plan stands in until a live incident has one, so the page can be checked.
  const recovery = (live ? incident?.recovery : undefined) ?? (import.meta.env.DEV && import.meta.env.MODE !== 'test' ? MOCK_RECOVERY : undefined)
  if (!recovery) {
    return (
      <main className="grid" data-page="recovery">
        <GlassCard span={12}><p>{t('recovery.idle', { context: who })}</p></GlassCard>
      </main>
    )
  }
  const tz = people.person?.timezone ?? 'Australia/Sydney'
  if (who === 'self') return <SelfRecovery recovery={recovery} tz={tz} />
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
                <small style={{ display: 'block' }}>{t('recovery.calls.when', { day: c.day, date: dayLabel(c.date, i18n.language) })}</small>
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
