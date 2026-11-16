'use client'

import { createContext, useContext } from 'react'
import type { PatientData, PatientsData } from '@/data/patients.types'
import type { SessionApi } from './session'

export type StepId = 'sum' | 'his' | 'scr' | 'res' | 'tx' | 'fu'
export const STEP_IDS: readonly StepId[] = ['sum', 'his', 'scr', 'res', 'tx', 'fu']

export const toStep = (v: string | null): StepId => (STEP_IDS as readonly string[]).includes(v ?? '') ? (v as StepId) : 'sum'

/** What every card of the open record needs. */
export interface RecordValue {
  data: PatientsData
  patient: PatientData
  session: SessionApi
  /** Opens a chart entry of Moza's case in the drawer. */
  openEntry: (id: string) => void
  /** `f` or `m`: picks "her" or "his" wording. */
  gender: 'f' | 'm'
  setStep: (step: StepId) => void
}

export const RecordContext = createContext<RecordValue | null>(null)

export function useRecord(): RecordValue {
  const v = useContext(RecordContext)
  if (!v) throw new Error('useRecord outside a patient record')
  return v
}

/** First letter of the first and of the last word of a name. */
export function initialsOf(name: string): string {
  const w = name.trim().split(/\s+/)
  const first = (s: string) => Array.from(s)[0] ?? ''
  return w.length > 1 ? first(w[0]) + first(w[w.length - 1]) : first(w[0])
}

/** Props that make a whole row open its entry on click (the title inside is the keyboard target). */
export function useRowOpen(entry?: string): { className?: string; onClick?: () => void } {
  const { openEntry } = useRecord()
  return entry ? { className: 'pt-open', onClick: () => openEntry(entry) } : {}
}
