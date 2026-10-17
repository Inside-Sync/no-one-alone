'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { followUpCalls } from '@/domain/recovery'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import { RecoveryCard } from './RecoveryCard'

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
