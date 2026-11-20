import type { AdultId, AdultProfile, ChildProfile, FhIcon, PersonId, Profile, ProgId, ScrProg, ScrStatus, Sex, Tone } from './types'

/**
 * The family (fictional, 3 generations). Texts (names, history, record lines) are in the locale under `people.<id>.*`;
 * this file keeps ids, relations, numbers and the record structure. Ported from the prototype FAM / REL / PROF0 / REC.
 */
export interface Person {
  id: PersonId
  gen: 1 | 2 | 3
  icon: FhIcon
  child: boolean
  /** The parent who answers for a child (the prototype `parent`). */
  parent?: AdultId
  /** The prototype relation label id (`rel`): grandma, grandpa, dad, mum, son, daughter. */
  role: 'grandma' | 'grandpa' | 'dad' | 'mum' | 'son' | 'daughter'
  /** Own resting-heart band (bpm) from the watch, or null for children. */
  usual: [number, number] | null
  /** Sex for record display (children have no adult profile). */
  sex: Sex
}

export const PEOPLE: Record<PersonId, Person> = {
  moza: { id: 'moza', gen: 1, icon: 'grandma', child: false, role: 'grandma', usual: [60, 68], sex: 'F' },
  saeed: { id: 'saeed', gen: 1, icon: 'grandpa', child: false, role: 'grandpa', usual: [66, 76], sex: 'M' },
  khalid: { id: 'khalid', gen: 2, icon: 'dad', child: false, role: 'dad', usual: [62, 74], sex: 'M' },
  amna: { id: 'amna', gen: 2, icon: 'mum', child: false, role: 'mum', usual: [64, 78], sex: 'F' },
  hamdan: { id: 'hamdan', gen: 3, icon: 'son', child: true, parent: 'amna', role: 'son', usual: null, sex: 'M' },
  hind: { id: 'hind', gen: 3, icon: 'daughter', child: true, parent: 'amna', role: 'daughter', usual: null, sex: 'F' },
}

/** Family links (prototype REL). */
export interface Relations { parents?: PersonId[]; kids?: PersonId[]; spouse?: PersonId; sib?: PersonId[] }
export const REL: Record<PersonId, Relations> = {
  moza: { kids: ['khalid'] },
  saeed: { kids: ['amna'] },
  khalid: { parents: ['moza'], kids: ['hamdan', 'hind'], spouse: 'amna' },
  amna: { parents: ['saeed'], kids: ['hamdan', 'hind'], spouse: 'khalid' },
  hamdan: { parents: ['khalid', 'amna'], sib: ['hind'] },
  hind: { parents: ['khalid', 'amna'], sib: ['hamdan'] },
}

/** BMI from weight (kg) and height (cm), one decimal (prototype bmiOf). */
export const bmiOf = (p: { wt: number; ht: number }): number => Math.round((p.wt / ((p.ht / 100) * (p.ht / 100))) * 10) / 10

const adult = (p: Omit<AdultProfile, 'bmi'>): AdultProfile => ({ ...p, bmi: bmiOf(p) })
/** Wearable and record metrics at the start (prototype PROF0). */
export const PROFILES0: Record<PersonId, Profile> = {
  saeed: adult({ age: 64, sex: 'M', sbp: 138, dbp: 82, bpTx: true, smoker: false, dm: true, tc: 4.6, hdl: 1.0, wt: 88, ht: 172, spo2: 97, steps: 5200, irrAlerts: 0, cvd: false, emirati: true, sbpTrend: 1, bmiTrend: 0, hr: 72, mins: 0, rest: true, irr: false, glu: 6.8 }),
  moza: adult({ age: 78, sex: 'F', sbp: 146, dbp: 84, bpTx: true, smoker: false, dm: false, tc: 4.2, hdl: 1.4, wt: 66, ht: 158, spo2: 96, steps: 3240, irrAlerts: 0, cvd: true, emirati: true, sbpTrend: 2, bmiTrend: 0, hr: 68, mins: 0, rest: true, irr: false }),
  khalid: adult({ age: 38, sex: 'M', sbp: 134, dbp: 86, bpTx: false, smoker: true, dm: false, tc: null, hdl: null, wt: 90, ht: 176, spo2: 98, steps: 4200, irrAlerts: 0, cvd: false, emirati: true, sbpTrend: 3, bmiTrend: 0.5, hr: 70, mins: 0, rest: true, irr: false }),
  amna: adult({ age: 35, sex: 'F', sbp: 118, dbp: 74, bpTx: false, smoker: false, dm: false, tc: 4.9, hdl: 1.5, wt: 74, ht: 162, spo2: 98, steps: 6500, irrAlerts: 0, cvd: false, emirati: true, sbpTrend: 0, bmiTrend: 0.4, hr: 72, mins: 0, rest: true, irr: false, gdm: true, a1c: 5.9 }),
  hamdan: { child: true, ageM: 60, overdueW: 0 },
  hind: { child: true, ageM: 18, overdueW: 3 },
}
export const cloneProfiles = (src: Record<PersonId, Profile> = PROFILES0): Record<PersonId, Profile> => structuredClone(src)

/**
 * One screening-history line. Texts are `records.<person>.scr.<key>.{name,last,every}`; `prog` is the programme it belongs to;
 * `dated` says the "last" text carries a year (the prototype regex /\d{4}/, used when a check ends by age); `never`: never done.
 */
export interface ScrLine { key: string; prog: ScrProg; st: ScrStatus; dated: boolean; never?: boolean }
export interface PersonRecord {
  scr: ScrLine[]
  /** Has a genomic line in the record (Khalid). */
  genomic: boolean
  /** Has a clinician preference line (Moza). */
  pref: boolean
}
export const RECORDS: Record<PersonId, PersonRecord> = {
  saeed: {
    genomic: false, pref: false,
    scr: [
      { key: 'eye', prog: 'dmeye', st: 'overdue', dated: true }, { key: 'kidney', prog: 'dmkid', st: 'overdue', dated: true },
      { key: 'foot', prog: 'dmfoot', st: 'done', dated: true }, { key: 'bowel', prog: 'bowel', st: 'due', dated: false, never: true },
      { key: 'ifhas', prog: 'ifhas', st: 'due', dated: true }, { key: 'flu', prog: 'flu', st: 'due', dated: true },
    ],
  },
  moza: {
    genomic: false, pref: true,
    scr: [
      { key: 'dxa', prog: 'dxa', st: 'overdue', dated: false, never: true }, { key: 'flu', prog: 'flu', st: 'due', dated: true },
      { key: 'breast', prog: 'breast', st: 'ended', dated: true }, { key: 'bowel', prog: 'bowel', st: 'ended', dated: true },
      { key: 'cervix', prog: 'cervix', st: 'ended', dated: true }, { key: 'ifhas', prog: 'ifhas', st: 'ended', dated: true },
    ],
  },
  khalid: {
    genomic: true, pref: false,
    scr: [
      { key: 'ifhas', prog: 'ifhas', st: 'overdue', dated: false, never: true }, { key: 'lipid', prog: 'lipid', st: 'overdue', dated: false, never: true },
      { key: 'bowel', prog: 'bowel', st: 'not yet', dated: false }, { key: 'flu', prog: 'flu', st: 'due', dated: false, never: true },
    ],
  },
  amna: {
    genomic: false, pref: false,
    scr: [
      { key: 'a1c', prog: 'a1c', st: 'overdue', dated: true }, { key: 'cervix', prog: 'cervix', st: 'overdue', dated: true },
      { key: 'breast', prog: 'breast', st: 'not yet', dated: false }, { key: 'ifhas', prog: 'ifhas', st: 'done', dated: true },
    ],
  },
  hamdan: {
    genomic: false, pref: false,
    scr: [
      { key: 'visit5', prog: 'well', st: 'due', dated: false }, { key: 'vision', prog: 'school', st: 'due', dated: false },
      { key: 'hearing', prog: 'school', st: 'due', dated: false }, { key: 'dental', prog: 'dental', st: 'due', dated: true },
    ],
  },
  hind: {
    genomic: false, pref: false,
    scr: [
      { key: 'visit18', prog: 'well', st: 'overdue', dated: false }, { key: 'mchat', prog: 'mchat', st: 'overdue', dated: false },
      { key: 'hearing', prog: 'other', st: 'done', dated: false }, { key: 'vaccines', prog: 'well', st: 'overdue', dated: false },
    ],
  },
}

/** The person's own conditions as relatives see them in the family record (prototype CONDS): condition code and onset age. */
export type CondCode = 'htn' | 'stroke' | 'dm' | 'fh' | 'gdm' | 'osteo' | 'cvd' | 'brca'
export const CONDS: Record<PersonId, { cond: CondCode; onset: number | null }[]> = {
  moza: [{ cond: 'htn', onset: 61 }, { cond: 'stroke', onset: 78 }],
  saeed: [{ cond: 'dm', onset: 52 }, { cond: 'htn', onset: 58 }],
  khalid: [{ cond: 'fh', onset: null }],
  amna: [{ cond: 'gdm', onset: 30 }],
  hamdan: [],
  hind: [],
}
/**
 * Relatives outside this passport, reported by the person (prototype EXTFH). `who` is `famExt.<person>` in the locale
 * ("Father (late Abdullah)"); `rel` is the relation used by the rules.
 */
export const EXT_FAMILY: Partial<Record<PersonId, { rel: 'father' | 'mother' | 'brother'; cond: CondCode; onset: number | null }[]>> = {
  saeed: [{ rel: 'father', cond: 'dm', onset: 60 }],
  moza: [{ rel: 'brother', cond: 'osteo', onset: null }],
  khalid: [{ rel: 'father', cond: 'cvd', onset: 62 }],
  amna: [{ rel: 'mother', cond: 'brca', onset: 48 }],
}

/** Wearables per adult (prototype DEV): icon, kind (texts `devices.<kind>`) and the value it shows in the live box. */
export type DeviceKind = 'cgm' | 'cuff' | 'watch' | 'scale'
export type DeviceValue = 'glu' | 'bp' | 'hr' | 'wt'
export interface Device { icon: FhIcon; kind: DeviceKind; what: string; value: DeviceValue }
export const DEVICES: Partial<Record<PersonId, Device[]>> = {
  saeed: [{ icon: 'droplet', kind: 'cgm', what: 'glu', value: 'glu' }, { icon: 'stethoscope', kind: 'cuff', what: 'bp', value: 'bp' }, { icon: 'watch', kind: 'watch', what: 'hrSteps', value: 'hr' }],
  moza: [{ icon: 'watch', kind: 'watch', what: 'hrIrrFalls', value: 'hr' }, { icon: 'stethoscope', kind: 'cuff', what: 'bp', value: 'bp' }],
  khalid: [{ icon: 'watch', kind: 'watch', what: 'hrFull', value: 'hr' }, { icon: 'stethoscope', kind: 'cuff', what: 'bp', value: 'bp' }, { icon: 'scale', kind: 'scale', what: 'wt', value: 'wt' }],
  amna: [{ icon: 'watch', kind: 'watch', what: 'hrSleep', value: 'hr' }, { icon: 'scale', kind: 'scale', what: 'wt', value: 'wt' }],
}

/** Optional genomic result (consented, demo). Texts `genomic.<person>.{title,source,effect}`. */
export const GENOMIC: Partial<Record<PersonId, true>> = { khalid: true }
/** Personal circumstances line (T2) exists for everyone: `people.<id>.ctx`. */

/** Status pill at the start (prototype ST0): label key `status0.<id>` and tone. */
export const STATUS0: Record<PersonId, Tone> = { saeed: 'warn', moza: 'warn', khalid: 'warn', amna: 'warn', hamdan: 'info', hind: 'bad' }

/** Speech baseline (prototype SBASE): clarity, words per minute, pause between words (s) and morning chats learnt from. */
export const SPEECH_BASE: Partial<Record<PersonId, { clar: number; wpm: number; pause: number; chats: number }>> = {
  saeed: { clar: 0.92, wpm: 142, pause: 0.26, chats: 38 },
  moza: { clar: 0.94, wpm: 152, pause: 0.22, chats: 41 },
  khalid: { clar: 0.95, wpm: 164, pause: 0.18, chats: 27 },
  amna: { clar: 0.96, wpm: 171, pause: 0.17, chats: 33 },
}
export const SPEECH_BASE_DEFAULT = { clar: 0.94, wpm: 150, pause: 0.22, chats: 30 }

/** Programme ids of the record lines, for the pathway (the "other" lines have no programme). */
export const isProg = (x: ScrProg): x is ProgId => x !== 'dental' && x !== 'dmfoot' && x !== 'other'

/** Ranges of the drawer's "Try different data" fields (prototype drawer inputs). */
export const EDIT_RANGES = {
  hr: { min: 30, max: 200, step: 1, unit: 'bpm' },
  sbp: { min: 80, max: 240, step: 1, unit: 'mmHg' },
  dbp: { min: 40, max: 140, step: 1, unit: 'mmHg' },
  age: { min: 18, max: 95, step: 1, unit: 'yrs' },
  wt: { min: 30, max: 200, step: 0.5, unit: 'kg' },
  steps: { min: 0, max: 30000, step: 100, unit: '' },
  spo2: { min: 80, max: 100, step: 1, unit: '%' },
  glu: { min: 2, max: 20, step: 0.1, unit: 'mmol/L' },
  irrAlerts: { min: 0, max: 10, step: 1, unit: '' },
  ageM: { min: 1, max: 72, step: 1, unit: 'months' },
  overdueW: { min: 0, max: 26, step: 1, unit: 'weeks' },
} as const
export type EditField = keyof typeof EDIT_RANGES
export const ADULT_EDIT_FIELDS: readonly EditField[] = ['hr', 'sbp', 'dbp', 'age', 'wt', 'steps']
export const CHILD_EDIT_FIELDS: readonly EditField[] = ['ageM', 'overdueW']
export type ToggleField = 'smoker' | 'bpTx' | 'dm' | 'cvd'
/** The drawer's switches (the "Try it" panel adds `cvd`). */
export const TOGGLE_FIELDS: readonly ToggleField[] = ['smoker', 'bpTx', 'dm']

export type { ChildProfile }
