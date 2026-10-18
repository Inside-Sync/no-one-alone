'use client'

import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { PageError } from '@/features/shared/PageError'
import { FitBanner, RecoveryCard, usePlanBuilder } from '../discharge/RecoveryCard'
import { HospitalKpis } from '../shared'
import { useHospital } from '../useHospital'

/** Hospital view · Patient record & discharge (`<main data-page="patient">`): Margaret's stay, then the plan sent home. */
export function PatientPage() {
  const res = useHospital()
  const h = res.data
  const { t } = useTranslation('hospital')
  const plan = usePlanBuilder()
  if (res.status === 'error') return <PageError page="patient" onRetry={res.retry} />
  if (!h) return null
  return (
    <main className="grid" data-page="patient">
      <FitBanner plan={plan} />
      <HospitalKpis id="ptKpis" kpis={h.patient.kpis} />
      <GlassCard span={5}>
        <div className="ch"><h2>{t('patient.summary.title')}</h2><span className="tag">{t('patient.summary.tag')}</span></div>
        <div className="kv2" style={{ background: 'var(--glass-2)' }}>
          {h.patient.summary.map(([k, v]) => <Fragment key={k}><span>{k}</span><b style={{ fontWeight: 500 }}>{v}</b></Fragment>)}
        </div>
      </GlassCard>
      <GlassCard span={7}>
        <div className="ch"><h2>{t('patient.course.title')}</h2><span className="meta">{t('patient.course.meta')}</span></div>
        <ul className="dayline pt-course">
          {h.patient.course.map(([time, text]) => (
            <li key={time + text}><span className="t" style={{ width: 'auto' }}>{time}</span><span className="d"></span><span>{text}</span></li>
          ))}
        </ul>
      </GlassCard>
      <RecoveryCard plan={plan} />
    </main>
  )
}
