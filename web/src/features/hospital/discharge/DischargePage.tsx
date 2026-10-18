'use client'

import { useTranslation } from 'react-i18next'
import { intlLocale } from '@/i18n'
import type { DischargeRow } from '@/data/types'
import { useLiveIncident } from '@/state/LiveIncident'
import { HospitalKpis, ReadyBanner } from '../shared'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useHospital } from '../useHospital'
import { BoardCard } from './BoardCard'

/** Hospital view · Discharge follow-up (`<main data-page="discharge">`). */
export function DischargePage() {
  const res = useHospital()
  const h = res.data
  const { t, i18n } = useTranslation('hospital')
  const { people, recovery } = useLiveIncident()
  if (res.status === 'error') return <PageError page="discharge" onRetry={res.retry} />
  if (!h) return <PageSkeleton page="discharge" />
  const vi = i18n.language.startsWith('vi')
  const margaret: DischargeRow[] = recovery ? [{
    patient: 'Margaret C., 78',
    discharged: new Intl.DateTimeFormat(intlLocale(i18n.language), { day: 'numeric', month: vi ? 'numeric' : 'short', timeZone: people.person?.timezone ?? 'Australia/Sydney' }).format(new Date(recovery.createdAt)),
    diagnosis: recovery.diagnosis,
    days: ['up', 'up', 'up', 'up', 'up'],
    risk: t('discharge.board.new'),
    tone: 'plain',
  }] : []
  return (
    <main className="grid" data-page="discharge">
      <ReadyBanner />
      <HospitalKpis id="disKpis" kpis={h.discharge.kpis} />
      <BoardCard board={[...margaret, ...h.discharge.board]} />
    </main>
  )
}
