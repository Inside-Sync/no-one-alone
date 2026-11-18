import type { IconName } from '@/data/types'

/**
 * Data model of the Test case module. Everything the user can read is an i18n KEY (`TKey`) in the `testcase` namespace;
 * the data files hold keys, numbers, thresholds and ids only. Text with parameters is a `Txt` ({ k, p }).
 */

/** A key in the `testcase` i18n namespace (`locales/{en,ar}/testcase.json`). */
export type TKey = string

/**
 * A parameter of a `Txt`: strings and numbers are literals, a `Txt` is resolved first (nested), a `TxtList` is resolved and
 * joined with its separator. Placeholders in the locale strings are written `{{name}}` and are filled from the Txt's own params first,
 * then from the engine's token context (`engine.ctx()`): the person, pronouns, readings, the chosen slot...
 */
export type ParamValue = string | number | boolean | null | undefined | Txt | TxtList
/** Several texts joined with `sep` when resolved. */
export interface TxtList { list: readonly Txt[]; sep: string }
export type Params = Record<string, ParamValue>
/** Text to show: an i18n key with optional params. Resolve with `resolveText(txt, t, engine.ctx())`. */
export interface Txt { k: TKey; p?: Params }
export const tx = (k: TKey, p?: Params): Txt => (p ? { k, p } : { k })

export type Mode = 'ind' | 'hosp' | 'gov'
export type Tone = 'red' | 'amber' | 'green' | 'info'
export type PersonId = 'moza' | 'hessa' | 'saeed' | 'mariam' | 'hind' | 'khalid' | 'arjun' | 'hamad' | 'amna'
export type CaseId = 'family' | 'wellchild' | 'ifhas' | 'expat' | 'bone' | 'stroke' | 'fall' | 'hypo' | 'hf' | 'own'
export type PvId = 'wellchild' | 'ifhas' | 'expat' | 'bone'
export type AgentId = 'guardian' | 'voice' | 'responder' | 'courier' | 'insight' | 'forecast' | 'coach' | 'navigator' | 'analyst'
export type JourneyId = 'stroke_em' | 'fall_em' | 'fall_minor' | 'hypo_home' | 'hypo_em' | 'hf_clinic' | 'hf_em'
export type TeachId = 'stroke' | 'fall' | 'hypo' | 'hf' | 'child_speech' | 'dm' | 'bone' | 'prev_ok' | 'prev_ref'
export type SampleKey = 'usual' | 'slurred' | 'none'

/** Every kind of step the UI must render (a step's `kind`). Speech checks live inside `home` (step 0 of the safety cases) and `daily`. */
export type StepKind = 'home' | 'passport' | 'famhub' | 'tl' | 'btn' | 'teach' | 'recheck' | 'daily' | 'accept' | 'result' | 'famresult' | 'refer' | 'report'

export interface Person {
  id: PersonId
  /** Years for adults, months for children. */
  age: number
  sex: 'F' | 'M'
  child: boolean
  anticoag: boolean
  htn: boolean
  dm: boolean
  hf: boolean
  cgm: boolean
  /** i18n keys: n, nar, nen, full, call, home, f1s, f1ar, f1, f2s, f2, f2d, meds, hist, usual, hosp, age (children only). */
  t: Partial<Record<'n' | 'nar' | 'nen' | 'full' | 'call' | 'home' | 'f1s' | 'f1ar' | 'f1' | 'f2s' | 'f2' | 'f2d' | 'meds' | 'hist' | 'usual' | 'hosp' | 'age', TKey>>
}

/** Sensor inputs of the safety cases. */
export interface SafetyInputs {
  /** Heart rate (bpm) from 10 minutes in. */
  hr: number
  /** How long (min) it stays up. */
  dur: number
  still: boolean
  fall: boolean
  /** Minutes on the floor. */
  floor: number
  /** mmol/L, or null when the sensor is off. */
  glu: number | null
  spo2: number
  /** kg change in 3 days. */
  wt: number
}
export interface PrevInputs { age: number; nat: 'Emirati' | 'Expatriate'; overdue: number; rem: number }

export interface CaseDef {
  id: CaseId
  type: 'safety' | 'prev' | 'fam'
  person: PersonId
  icon: IconName
  title: TKey
  teaser: TKey
  /** Minutes since 15 Oct 2026 00:00. */
  start: number
  night: boolean
  pv?: PvId
  inp?: SafetyInputs
  speech?: SampleKey | null
  ans?: string | null
}

export interface Question { id: string; q: TKey; a: { id: string; label: TKey }[] }
export interface RuleRow { id: string; when: TKey; then: TKey }
export interface TeachBlock { explain: TKey; q: TKey; opts: TKey[]; simpler: TKey; wrong: TKey[] }
export interface TeachSet { facts: TKey; en: TeachBlock; ar: TeachBlock }
export interface DailyDef {
  id: string; label: TKey; unit: string; def: number; min: number; max: number; step: number; target: TKey
  /** On target when `value op limit`. */
  ok: { op: 'lt' | 'gte' | 'lte'; limit: number }
  /** Takes `{{v}}`. */
  finding: TKey; team: TKey; act: TKey
}
export interface ReportDef { id: string; title: TKey; kpi: { label: TKey; value: TKey; note?: TKey }[] }
export interface AgentDef { id: AgentId; icon: IconName; n: TKey; role: TKey; can: TKey; cannot: TKey; story: TKey }
export interface PipeNode { kind: 'ind' | 'gate' | 'agent' | 'hosp' | 'gov'; who: TKey; name: TKey }

/** A timeline row (`items`) or packet row. `at` is minutes after the step time (items only). `anticoag` overrides fields for people on a blood thinner. */
export interface Row {
  at?: number
  title: TKey
  /** Params of the title ({{visit}} in Hind’s visit row of the family trip). */
  p?: Params
  detail: TKey
  anticoag?: { at?: number; title?: TKey; detail?: TKey }
}
export type FlowNode = { agent: AgentId } | { label: TKey }
export interface StepDef {
  mode: Mode
  kind: StepKind
  label: TKey
  title: TKey
  /** When the step happens: `m` minutes after the decision, or day `d` after it at `h` ("HH:MM"). Absent on step 0. */
  at?: { m: number } | { d: number; h: string }
  hold?: TKey
  btn?: TKey
  text?: TKey
  /** Second variant of `text` (prevention referral step when nothing was referred). */
  textOk?: TKey
  done?: TKey
  decides: TKey
  agents: { agent: AgentId; lines: TKey[] }[]
  flow: FlowNode[]
  items?: Row[]
  packet?: Row[]
  phone?: { tone: Tone; title: TKey; text?: TKey }
  pipe?: { node: number; text: TKey }[]
  fam?: { who: TKey; text: TKey }
  famOnDone?: boolean
  /** The agents step back (hospital notes flow back into the record). */
  back?: boolean
}
export interface JourneyDef {
  id: JourneyId; name: TKey
  /** The safety rule (R1 to R11) this path answers to. */
  rule: string
  report: string
  teach: TeachId | null
  daily: 'stroke' | 'fall' | 'hypo' | 'hf'
  /** Last step index (inclusive) that still shows the night theme; -1 never. */
  nightUntil: number
  steps: StepDef[]
}

export interface BarrierDef { id: string; label: TKey }
export interface EnablerDef { rule: string; name: TKey; tag: TKey }
export interface PvCase {
  kind: 'child' | 'adult'
  inp: PrevInputs
  barrier: string
  teachRefer: TeachId
  report: string
  family: { name: TKey; what: TKey; state: TKey; cls: 'ok' | 'due' | 'na' }[]
  slot: Record<string, TKey>
  why?: TKey
  visit: Row[]
  result: { label: TKey; unit: TKey | null; def: number; min: number; max: number; step: number; rule: TKey }
  refer: TKey
  follow: { refer: Row[]; ok: Row[] }
}

/** Eight members over four generations: sub is the short description (Khalid’s mother), dev the home devices, fh the family history. Ages live in the editable profile. */
export interface FamilyMember {
  id: string; name: TKey; rel: TKey; relLower: TKey; sub: TKey; gen: 1 | 2 | 3 | 4; icon: IconName; stage: 'older' | 'adult' | 'child'; src: TKey[]; how: TKey; dev: TKey; fh: TKey
}
/** Editable profile of an adult (prototype FMP). Cholesterol in mmol/L, null = not measured yet. sbpTrend is mmHg a year, bmiTrend BMI units a year. */
export interface AdultProfile {
  child?: false
  age: number; sex: 'M' | 'F'; sbp: number; bpTx: boolean; smoker: boolean; dm: boolean
  tc: number | null; hdl: number | null; bmi: number; cvd: boolean; sbpTrend: number; bmiTrend: number; emirati: boolean
}
/** Editable profile of a child: age in months and weeks the next well-child visit is overdue. */
export interface ChildProfile { child: true; ageM: number; overdueW: number }
export type FamilyProfile = AdultProfile | ChildProfile
export interface FamilySource { name: TKey; note: TKey }
export interface FamilyConnection { id: string; icon: IconName; from: TKey; to: string[]; title: TKey; action: TKey }
/** A result the family enters at the results step; who is the member it belongs to. */
export interface FamilyResultDef { id: string; who: string; label: TKey; unit: TKey | null; def: number; min: number; max: number; step: number }
export interface FamilyBadge { id: string; icon: IconName; label: TKey }
export interface FamilyAlertDef {
  id: string; who: string; lvl: 'red' | 'amber' | 'yellow' | 'green'; title: TKey; why: TKey; agent: AgentId
  acts: { label: TKey; id: string }[]; state: 'open' | 'done'; conn?: string[]
}
