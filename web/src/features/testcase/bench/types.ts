import type { CaseId, Lang, PersonId, PvId, SampleKey } from '../engine'

/** The agent (or engine part) that acts at a step of a scenario. `guardrail` is the engine's input check. */
export type BenchAgent = 'guardrail' | 'guardian' | 'voice' | 'noa' | 'navigator' | 'forecast'

/**
 * What the scenario's decision is, in words a judge can read.
 * Safety: call-998 (R5 to R8), home-plan (R9, R11), same-day-clinic (R10), stand-down (check cleared), no-action (R12).
 * Prevention: stay-silent (P2), ask-barrier (P1), barrier-help (P3 to P7), respect-choice (P8), refer / passport-ok (P9).
 * Family heart score: doctor-review (F1), measure-cholesterol (F2), not-scored, no-action.
 * refused: the input guardrail kept a missing or implausible value out and no decision was taken.
 */
export type DecisionClass =
  | 'call-998' | 'home-plan' | 'same-day-clinic' | 'stand-down' | 'no-action'
  | 'stay-silent' | 'ask-barrier' | 'barrier-help' | 'respect-choice' | 'refer' | 'passport-ok'
  | 'doctor-review' | 'measure-cholesterol' | 'not-scored'
  | 'refused' | 'no-decision'

export type BenchGroup =
  | 'safety-rules' | 'boundary' | 'tough-input' | 'contradictory' | 'night-day' | 'arabic' | 'people'
  | 'prevention-rules' | 'prevention-results' | 'family-results' | 'family-forecast'

export const BENCH_GROUPS: readonly BenchGroup[] = [
  'safety-rules', 'boundary', 'tough-input', 'contradictory', 'night-day', 'arabic', 'people',
  'prevention-rules', 'prevention-results', 'family-results', 'family-forecast',
]

export type AgeBand = 'child' | '18-39' | '40-64' | '65+'
export type Difficulty = 'easy' | 'tough'
export interface BenchTags { lang: Lang; time: 'day' | 'night'; age: AgeBand; level: Difficulty }

/** One value typed into an input. `expect: 'refuse'` says the guardrail must keep it out. */
export interface SetOp { key: string; value: number | string | boolean | null; expect?: 'accept' | 'refuse' }

export interface SafetySetup {
  kind: 'safety'
  person?: PersonId
  /** Minutes since 15 Oct 00:00. Before 06:00 (360) it is night. */
  start?: number
  lang?: Lang
  /** Switches, applied first. */
  toggles?: Partial<Record<'still' | 'fall', boolean>>
  set?: SetOp[]
  /** `usual`, `slurred`, `none` are Noa's three ready-made answers; `typed` is what is typed into the speech check. */
  speech?: SampleKey | { typed: string }
  /** The answer to Noa's question (fall ok|cant|none, hypo drink|confused|none, hf pillows|rest|fine, hr fine|none). Default: the first option. */
  answer?: string
}
export interface PrevSetup {
  kind: 'prev'
  pv: PvId
  nat?: 'Emirati' | 'Expatriate'
  set?: SetOp[]
  barrier?: string
  /** When given the whole journey runs (default barrier unless `barrier` is set) and this result is sent. */
  result?: number
}
export interface FamResultSetup { kind: 'famResult'; id: string; value: number }
export type FamEdit = { op: 'set'; field: string; value: number } | { op: 'toggle'; field: string } | { op: 'sex'; sex: 'M' | 'F' }
export interface FamRiskSetup { kind: 'famRisk'; member: string; before?: string[]; edits?: FamEdit[] }
export type Setup = SafetySetup | PrevSetup | FamResultSetup | FamRiskSetup

/** What the published rule table says must happen. Same shape as what the run records. */
export interface Outcome {
  /** The sensor rule that starts a check (R1 to R4), or null. */
  trigger?: string | null
  /** The rule that decides (R1 stand-down, R5 to R12, P2 to P9, F1, F2), or `none`. */
  rule: string
  decision: DecisionClass
  /** The agent that takes this decision. */
  agent: BenchAgent
  /** Result routing: the variant (dm, pre, ok, refer, osteo, low); heart score: high, mid, low or why it is not scored. */
  detail?: string
  /** Speech check level, when the scenario tests it. */
  speech?: 'green' | 'amber' | 'red' | 'none'
  /** An input the engine must warn about (recommended, not blocking). */
  warn?: string
  /** Heart-risk alert raised (family forecast). */
  alert?: boolean
}

export interface Scenario {
  id: string
  group: BenchGroup
  title: string
  setup: Setup
  expected: Outcome
  /** A rule this scenario is a negative control for (it is close to the rule's edge and the rule must NOT fire). */
  near?: string[]
  /** A note for the judges (why the expectation is what it is). */
  note?: string
  /** The Test case tab case this scenario opens as, when it maps to one of the ten. */
  openAs?: CaseId
  tags: BenchTags
}

export interface Divergence {
  /** The first step where actual differs from expected. */
  step: 'input' | 'trigger' | 'speech' | 'decision' | 'detail' | 'warning' | 'error'
  agent: BenchAgent
  field: string
  expected: string
  actual: string
}

export interface ScenarioResult {
  id: string
  scenario: Scenario
  actual: Outcome
  pass: boolean
  divergence: Divergence | null
}
