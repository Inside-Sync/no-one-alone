'use client'

import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Glyph } from '@/components/ui/Icon'
import { useContextOverride, useTipKey } from '@/components/shell/ShellOverrides'
import type { PatientData, PatientsData } from '@/data/patients.types'
import { CareStepper, StepNav, useCareRecordDrawer, type CareEntry, type CareLabels, type CareStep } from '@/features/shared/careRecord'
import { FollowUpStep } from './FollowUp'
import { HistoryStep } from './History'
import { ResultsStep } from './Results'
import { ScreeningStep } from './Screening'
import { SummaryStep } from './Summary'
import { TreatmentStep } from './Treatment'
import { RecordContext, STEP_IDS, initialsOf, type RecordValue, type StepId } from './context'
import type { SessionApi } from './session'

interface Props {
  data: PatientsData
  patient: PatientData
  step: StepId
  session: SessionApi
  onStep: (step: StepId) => void
  onBack: () => void
}

const BODY: Record<StepId, () => React.JSX.Element> = {
  sum: SummaryStep, his: HistoryStep, scr: ScreeningStep, res: ResultsStep, tx: TreatmentStep, fu: FollowUpStep,
}

/** One patient's clinical record: the header with the six-step stepper, the step's cards, back and next. */
export function PatientRecord({ data, patient, step, session, onStep, onBack }: Props) {
  const { t } = useTranslation('patients')
  const gender = patient.sex
  const steps: CareStep[] = useMemo(() => STEP_IDS.map((id) => ({ id, label: t(`nav.steps.${id}`) })), [t])
  const labels: CareLabels = useMemo(() => ({
    stepsAria: t('nav.stepsAria'),
    backTo: (s: string) => t('nav.prev', { step: s }),
    nextTo: (s: string) => t('nav.next', { step: s }),
    related: t('entry.related'),
    position: (n: number, total: number) => t('entry.position', { n, total }),
    last: t('entry.last'),
    entryNavAria: t('entry.navAria'),
    startCase: t('nav.whole'),
    caseTitle: t('entry.caseTitle'),
    close: t('entry.close'),
    summaryLabel: t('entry.forPatient'),
  }), [t])
  const entries: CareEntry[] = useMemo(() => data.moza.entries.map((e) => ({
    id: e.id, title: e.title, stage: t(`stages.${e.stage}`), kind: e.kind, when: e.when,
    where: [e.where, e.who].filter(Boolean).join(' · '), summary: e.summary, findings: e.findings, related: e.related, source: e.source,
  })), [data.moza.entries, t])
  const drawer = useCareRecordDrawer(entries, labels)
  const hasCase = patient.id === 'moza'

  const ctx = useMemo(() => ({
    title: t('list.nameAge', { name: patient.name, age: patient.age }),
    initials: initialsOf(patient.name),
    color: '#2563a8',
    sub: t('ctx.sub', { mrn: patient.mrn, sex: t(`ctx.${patient.sex}`), lang: patient.lang, area: patient.area }),
    facts: [
      { live: true, label: t('ctx.setting'), value: patient.setting.label },
      { live: false, label: t('ctx.dept'), value: patient.dept },
      { live: false, label: t('ctx.doc'), value: patient.doc },
    ],
  }), [patient, t])
  useContextOverride(ctx)
  useTipKey(`chart.${step}`)
  useEffect(() => { window.scrollTo({ top: 0 }) }, [step, patient.id])

  const value: RecordValue = useMemo(() => ({
    data, patient, session, gender, setStep: onStep, openEntry: drawer.openEntry,
  }), [data, patient, session, gender, onStep, drawer.openEntry])

  const Body = BODY[step]
  return (
    <RecordContext.Provider value={value}>
      <main className="grid" data-page="patients" data-patient={patient.id} data-step={step}>
        <CareStepper
          steps={steps}
          current={step}
          onSelect={(id) => onStep(id as StepId)}
          ariaLabel={t('nav.stepsAria')}
          title={t(`nav.record_${gender}`)}
          status={patient.setting.label}
          detail={t('nav.doc', { dept: patient.dept, doc: patient.doc })}
          tourId="chart-steps"
          actions={
            <>
              <button type="button" className="chip pt-back" onClick={onBack}><Glyph name="left" />{t('nav.back')}</button>
              <span className="pt-tag">{t('nav.view')}</span>
              {hasCase && <button type="button" className="btn sm" onClick={() => drawer.startCase()}><Glyph name="play" />{t('nav.whole')}</button>}
            </>
          }
        />
        <Body />
        <StepNav steps={steps} current={step} onSelect={(id) => onStep(id as StepId)} labels={labels} />
      </main>
    </RecordContext.Provider>
  )
}
