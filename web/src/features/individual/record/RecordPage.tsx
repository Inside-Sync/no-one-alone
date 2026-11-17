'use client'

import { useEffect } from 'react'
import { useRouter } from '@/app/navigation'
import { getCareRecord } from '@/data/repo'
import type { CareRecord } from '@/data/types'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { StepNav, useStepParam } from '@/features/shared/careRecord'
import { useRepo } from '@/features/shared/useRepo'
import { FollowUpStep } from './FollowUpStep'
import { HistoryStep } from './HistoryStep'
import { ResultsStep } from './ResultsStep'
import { ScreeningStep } from './ScreeningStep'
import { RecordHeader } from './shell'
import { STEP_IDS, useRecordShell, type StepId } from './useRecordShell'
import { SummaryStep } from './SummaryStep'

/** Where the Treatment step lives: it is its own page, reached through the stepper. */
const TREATMENT_PATH = '/individual/treatment'

/**
 * Individual view · Care record (`<main data-page="record">`): six steps in one stepper. The step is in `?step=`
 * (`sum`, `his`, `scr`, `res`, `tx`, `fu`); `tx` opens the Treatment page. Moza's own app speaks to her as "you", family in the third person.
 */
export function RecordPage() {
  const res = useRepo(() => getCareRecord('margaret'))
  if (res.status === 'error') return <PageError page="record" onRetry={res.retry} />
  if (!res.data) return <PageSkeleton page="record" />
  return <RecordBody record={res.data} />
}

function RecordBody({ record }: { record: CareRecord }) {
  const router = useRouter()
  const shell = useRecordShell(record)
  const [step, setStep] = useStepParam(STEP_IDS, 'sum')
  useEffect(() => { if (step === 'tx') router.replace(TREATMENT_PATH) }, [step, router])
  const go = (id: string) => { if (id === 'tx') router.push(TREATMENT_PATH); else setStep(id) }
  const current = step as StepId
  return (
    <main className="grid" data-page="record">
      <RecordHeader shell={shell} record={record} current={current} onSelect={go} />
      {current === 'sum' && <SummaryStep record={record} shell={shell} go={go} />}
      {current === 'his' && <HistoryStep record={record} shell={shell} />}
      {current === 'scr' && <ScreeningStep record={record} shell={shell} />}
      {current === 'res' && <ResultsStep record={record} shell={shell} />}
      {current === 'fu' && <FollowUpStep record={record} shell={shell} />}
      <StepNav steps={shell.steps} current={current} onSelect={go} labels={shell.labels} />
    </main>
  )
}
