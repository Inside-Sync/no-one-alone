'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { CareRecord, Voiced } from '@/data/types'
import { useCareRecordDrawer, type CareEntry, type CareLabels, type CareRecordDrawer, type CareStep } from '@/features/shared/careRecord'
import { useAppState } from '@/state/AppState'

export const STEP_IDS = ['sum', 'his', 'scr', 'res', 'tx', 'fu'] as const
export type StepId = (typeof STEP_IDS)[number]

export interface RecordShell {
  who: 'self' | 'family'
  steps: CareStep[]
  labels: CareLabels
  entries: CareEntry[]
  drawer: CareRecordDrawer
  /** The text of a voiced pair for the current role. */
  say: (v: Voiced) => string
}

/** Steps, drawer wording, entries and the drawer opener of the care record, in the role and language in use. */
export function useRecordShell(record: CareRecord): RecordShell {
  const { t } = useTranslation('record')
  const { who } = useAppState()
  const steps = useMemo(() => STEP_IDS.map((id) => ({ id, label: t(`stepper.steps.${id}`) })), [t])
  const labels = useMemo<CareLabels>(() => ({
    stepsAria: t('stepper.aria'),
    backTo: (label) => t('nav.back', { label }),
    nextTo: (label) => t('nav.next', { label }),
    related: t('entry.related'),
    position: (n, total) => t('entry.position', { n, total }),
    last: t('entry.last'),
    entryNavAria: t('entry.navAria'),
    startCase: t('entry.startCase'),
    caseTitle: t('entry.caseTitle'),
    close: t('entry.close'),
  }), [t])
  const entries = useMemo<CareEntry[]>(() => record.entries.map((e) => ({
    id: e.id, title: e.title, stage: t(`stages.${e.stage}`), kind: e.kind, when: e.when, where: e.where,
    summary: e.summary, findings: e.findings, related: e.related, source: e.source,
  })), [record, t])
  const drawer = useCareRecordDrawer(entries, labels)
  const say = (v: Voiced) => v[who]
  return { who, steps, labels, entries, drawer, say }
}

