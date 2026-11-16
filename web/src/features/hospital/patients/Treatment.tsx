'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { RecoveryCard, usePlanBuilder } from '../discharge/RecoveryCard'
import { EntryLink, Head, Src } from './parts'
import { useRecord, useRowOpen } from './context'

function CourseRow({ when, text, entry }: { when: string; text: string; entry?: string }) {
  const row = useRowOpen(entry)
  return (
    <li {...row}>
      <span className="t" style={{ width: 'auto' }}>{when}</span>
      <span className="d" />
      <span><EntryLink entry={entry}>{text}</EntryLink></span>
    </li>
  )
}

/** Moza: the inpatient course, then the discharge plan the doctor approves and Noa delivers to her app. */
function MozaTreatment() {
  const { t } = useTranslation('patients')
  const { data: { moza: m } } = useRecord()
  const plan = usePlanBuilder()
  return (
    <>
      <GlassCard span={12} tour="chart-treatment">
        <Head title={t('tx.courseTitle')} meta={t('tx.courseMeta')} />
        <ul className="dayline pt-tline">
          {m.course.map((c) => <CourseRow key={c.when + c.text} {...c} />)}
        </ul>
        <Src k="course" />
      </GlassCard>
      <RecoveryCard plan={plan} />
    </>
  )
}

/** Step 5: what was done, in order. */
export function TreatmentStep() {
  const { t } = useTranslation('patients')
  const { patient: p, gender } = useRecord()
  if (p.id === 'moza') return <MozaTreatment />
  return (
    <GlassCard span={12} tour="chart-treatment">
      <Head title={t('tx.title', { context: gender })} meta={t('tx.meta')} />
      <ul className="dayline pt-tline">
        {p.treatment.map((x) => <CourseRow key={x.when + x.text} when={x.when} text={x.text} />)}
      </ul>
      <Src k="tx" />
    </GlassCard>
  )
}
