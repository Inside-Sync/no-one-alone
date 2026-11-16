import type { Kpi } from './types'

/**
 * The hospital "Patient records" page, served by `getPatients()` from `locales/{en,ar}/data/patients.json`.
 * Every string is display text in the active language; ids, tones, kinds and numbers are the same in both languages.
 */

export type PatientTone = 'good' | 'warn' | 'bad' | 'plain'

/** Where a record lives: this hospital, Malaffi (a planned link), Malaffi summary only, or a clinic that is not connected. */
export type EpisodeAccess = 'own' | 'hie' | 'notes' | 'request'

export interface PatientVital {
  label: string
  /** The last 12 days; the last value is the headline. */
  values: number[]
  unit: string
  /** Target for the headline value, or null when there is none. */
  target: number | null
  /** 1: higher is better, -1: lower is better, 0: no judgement. */
  dir: -1 | 0 | 1
  note: string
}

export interface PatientFlag { tone: PatientTone; title: string; detail: string; entry?: string }
export interface PatientTask { title: string; detail: string; done: boolean; entry?: string }
export interface PatientTimelineItem { when: string; text: string; entry?: string }
export interface PatientEpisode { when: string; where: string; kind: string; title: string; access: EpisodeAccess; note: string; entry?: string }
export interface PatientRelative { who: string; conditions: string; consent: string; state: 'shared' | 'ask' }
export interface PatientScreening { when: string; what: string; result: string; happened: string; entry?: string }
export interface PatientResult { test: string; result: string; when: string; tone: 'good' | 'warn' | 'bad'; entry?: string }
export interface PatientTreatment { when: string; text: string }

export interface PatientData {
  /** Stable id used in the `?patient=` query (`moza`). */
  id: string
  name: string
  age: number
  sex: 'f' | 'm'
  area: string
  lang: string
  /** False when the patient speaks English: the call button then names no language. */
  callIn: boolean
  /** `dis`: after discharge; `scr`: outpatient. */
  kind: 'dis' | 'scr'
  why: string
  day: string
  status: { label: string; tone: PatientTone }
  /** Flagged as needing action today. */
  action: boolean
  last: string
  owner: string
  mrn: string
  setting: { label: string; tone: PatientTone }
  dept: string
  doc: string
  shares: string[]
  vitals: PatientVital[]
  flags: PatientFlag[]
  tasks: PatientTask[]
  timeline: PatientTimelineItem[]
  episodes: PatientEpisode[]
  family: PatientRelative[]
  noaUse: string[]
  screening: PatientScreening[]
  results: PatientResult[]
  treatment: PatientTreatment[]
}

export interface CaseItem { tone: string; title: string; detail?: string; entry?: string }

/** A chart entry of Moza's case, in time order (23 in all). */
export interface CaseEntry {
  id: string
  when: string
  /** `his`, `bef`, `sym`, `res`, `tx` or `rec`: a key of `patients:stages`. */
  stage: 'his' | 'bef' | 'sym' | 'res' | 'tx' | 'rec'
  kind: string
  title: string
  where: string
  who: string
  findings: [string, string][]
  /** The plain sentence told to the patient. */
  summary: string
  source: string
  related: string[]
}

/** What only Moza's record has: the clinical summary, the case so far, the admission and the inpatient course. */
export interface MozaCase {
  oneLine: string
  stats: { label: string; value: string; note: string }[]
  diagnoses: CaseItem[]
  past: CaseItem[]
  allergy: string
  treatment: CaseItem[]
  recovery: CaseItem[]
  todo: CaseItem[]
  risks: { tone: string; risk: string; why: string; inPlace: string; entry?: string }[]
  journey: { title: string; when: string; lines: string[]; entry: string }[]
  admission: { label: string; value: string }[]
  screening: PatientScreening[]
  loop: { tone: 'good' | 'bad'; title: string; detail: string; entry?: string }[]
  results: PatientResult[]
  course: { when: string; text: string; entry?: string }[]
  entries: CaseEntry[]
}

/** The "results waiting for doctor review" block that Khalid's Results step shows. */
export interface ReviewBlock {
  /** The patient whose record shows the full summary. */
  patient: string
  items: { id: string; name: string; age: number; result: string; tag: string; tone: PatientTone; color: string }[]
  rows: { label: string; value: string }[]
  suggests: { text: string; note: string }[]
  why: string[]
}

export interface PatientsData {
  kpis: Kpi[]
  patients: PatientData[]
  moza: MozaCase
  review: ReviewBlock
}
