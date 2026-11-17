'use client'

import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { getPatients } from '@/data/repo'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useRepo } from '@/features/shared/useRepo'
import { PatientList } from './PatientList'
import { PatientRecord } from './PatientRecord'
import { toStep, type StepId } from './context'
import { useSession } from './session'
import './patients.css'

/**
 * Hospital view · Patient records. The open patient and the step live in the URL query (`?patient=moza&step=res`),
 * so a link, the browser's Back button and the walkthrough all reach the same screen.
 */
export function PatientsPage() {
  const res = useRepo(getPatients)
  const { t } = useTranslation('patients')
  const [params, setParams] = useSearchParams()
  const session = useSession()
  const data = res.data

  // A patient the team marked as reviewed no longer needs action.
  const patients = useMemo(() => (data?.patients ?? []).map((p) => (
    session.reviewed.has(p.id) ? { ...p, action: false, status: { label: t('reviewed'), tone: 'good' as const } } : p
  )), [data, session.reviewed, t])

  const id = params.get('patient')
  const step = toStep(params.get('step'))
  const open = useCallback((patient: string, to: StepId = 'sum') => setParams({ patient, step: to }), [setParams])
  const back = useCallback(() => setParams({}), [setParams])

  if (res.status === 'error') return <PageError page="patients" onRetry={res.retry} />
  if (!data) return <PageSkeleton page="patients" />
  const patient = patients.find((p) => p.id === id)
  if (patient) {
    return <PatientRecord data={data} patient={patient} step={step} session={session} onStep={(s) => open(patient.id, s)} onBack={back} />
  }
  return <PatientList data={data} patients={patients} onOpen={open} />
}
