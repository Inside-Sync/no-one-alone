/**
 * Shared types of the "Noa · family health" journey (data and engine). Ported from the prototype panel (noa.js).
 * Data files hold ids, numbers and thresholds; every visible word lives in `src/locales/{en,ar}/familyHealth.json` and is
 * referenced through a `Txt` descriptor (key + params), resolved by `engine/text.ts`.
 */

/** A key of the `familyHealth` namespace (dot path, e.g. `rules.G1`). */
export type FhKey = string

/** A parameter value: literal, nested text, a joined list, a date (formatted per language) or a number with fixed decimals. */
export type FhParam = string | number | boolean | null | undefined | Txt | TxtList | TxtDate | TxtFixed
export type FhParams = Record<string, FhParam>
/** A list joined with `sep` (a literal or a `Txt` such as `join.and`). */
export interface TxtList { list: readonly (Txt | string | number)[]; sep: Txt | string }
/** A date (ms since epoch, UTC) shown as "Sun 20 Dec" (en-GB) or its Arabic form. */
export interface TxtDate { date: number }
/** A number with fixed decimals ("1.0"), written with the language's digits. */
export interface TxtFixed { fixed: number; digits: number }
/**
 * A text descriptor. `lc`: lower-case the first letter when the text is used mid-sentence (only when the first word has no other
 * capital, so "IFHAS", "HbA1c" and names keep their case; a no-op in Arabic).
 */
export interface Txt { k: FhKey; p?: FhParams; lc?: boolean }

export const PERSON_IDS = ['moza', 'saeed', 'khalid', 'amna', 'hamdan', 'hind'] as const
export type PersonId = (typeof PERSON_IDS)[number]
export type AdultId = 'moza' | 'saeed' | 'khalid' | 'amna'
export type Sex = 'M' | 'F'
export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'muted'

/** Today's readings and record facts of one person (the prototype PROF). Adults and children have different shapes. */
export interface AdultProfile {
  child?: false
  age: number; sex: Sex; sbp: number; dbp: number; bpTx: boolean; smoker: boolean; dm: boolean
  tc: number | null; hdl: number | null; wt: number; ht: number; spo2: number; steps: number; irrAlerts: number
  cvd: boolean; emirati: boolean; sbpTrend: number; bmiTrend: number; hr: number; mins: number; rest: boolean; irr: boolean
  glu?: number; gdm?: boolean; a1c?: number
  /** Worked out from weight and height (one decimal). */
  bmi: number
}
export interface ChildProfile { child: true; ageM: number; overdueW: number }
export type Profile = AdultProfile | ChildProfile
export const isChild = (p: Profile): p is ChildProfile => p.child === true

/** Agents: the Orchestrator and the 9 skills grouped in 4 domain agents. */
export const AGENT_IDS = ['orch', 'guardian', 'voice', 'coach', 'forecast', 'navigator', 'courier', 'insight', 'analyst'] as const
export type AgentId = (typeof AGENT_IDS)[number]
export const DOMAIN_IDS = ['care', 'screen', 'spec', 'gov', 'orch'] as const
export type DomainId = (typeof DOMAIN_IDS)[number]
/** The prototype "mode" of a bubble or stage: Individual, Hospital, Government or System. */
export type Mode = 'ind' | 'hosp' | 'gov' | 'sys'

export const STAGE_IDS = ['detect', 'protect', 'home', 'pathway', 'referral'] as const
export type StageId = (typeof STAGE_IDS)[number]

/** The 34 Orchestrator rule codes. */
export const RULE_IDS = [
  'IN', 'G0', 'G1', 'L1', 'L2', 'U1', 'G2', 'G3', 'B1', 'B2', 'O1', 'W1', 'A1', 'K1', 'V1', 'V2', 'V3', 'V4', 'N1', 'N2', 'N3',
  'F1', 'R1', 'H1', 'C1', 'X1', 'D1', 'P1', 'Q1', 'S1', 'H2', 'T1', 'T2', 'K2',
] as const
export type RuleId = (typeof RULE_IDS)[number]
/** The rules that read today's signals. `now`/`today` make the case urgent, `soon` and `plan` only add a flag. */
export type SignalRuleId = 'L1' | 'L2' | 'G1' | 'G3' | 'B1' | 'O1' | 'G2' | 'B2' | 'W1' | 'A1' | 'K1'
export type SignalLevel = 'now' | 'today' | 'soon' | 'plan'

/** Department of Health programmes. */
export const PROG_IDS = ['dxa', 'ifhas', 'lipid', 'a1c', 'dmeye', 'dmkid', 'bowel', 'breast', 'cervix', 'flu', 'quit', 'well', 'mchat', 'school'] as const
export type ProgId = (typeof PROG_IDS)[number]
/** A screening-history line's programme: a DoH programme, or a check with no programme (dental, foot, hearing). */
export type ScrProg = ProgId | 'dental' | 'dmfoot' | 'other'
export type ScrStatus = 'overdue' | 'due' | 'done' | 'not yet' | 'ended'

export const URGENCY_IDS = ['now', 'today', 'h24', 'w1', 'w2', 'm1', 'm3'] as const
export type UrgencyId = (typeof URGENCY_IDS)[number]

/** Home tests by voice. */
export const VT_IDS = ['speech', 'hypo', 'din', 'falls', 'phq2', 'stopbang', 'dmrisk'] as const
export type VtId = (typeof VT_IDS)[number]
export type QsetId = 'falls' | 'phq2' | 'stopbang' | 'dmrisk'

export type TimeId = 'eve' | 'sat' | 'am' | 'pm'
export type PrefId = 'one' | 'home' | 'female'
export type SampleKey = 'usual' | 'unclear' | 'slurred'
export type NoaLang = 'en' | 'ar'

export const TEST_CASE_IDS = ['s0', 's2', 's3', 'k1', 'k3', 'k4', 'a1', 'm1', 'h1', 'd1'] as const
export type TestCaseId = (typeof TEST_CASE_IDS)[number]

/**
 * Icon names used by the data (the UI maps them to its icon table). The prototype's emoji are noted next to each name in
 * `data/icons.ts` so the UI stream can add them to `components/ui/emoji.ts`.
 */
export type FhIcon =
  | 'grandma' | 'grandpa' | 'dad' | 'mum' | 'son' | 'daughter'
  | 'orchestrator' | 'puzzle' | 'shield' | 'speech' | 'graduation-cap' | 'trend' | 'compass' | 'package' | 'search' | 'chart-column'
  | 'home' | 'clinic' | 'xray' | 'landmark' | 'conductor'
  | 'droplet' | 'stethoscope' | 'watch' | 'scale' | 'ear' | 'footprints' | 'message-circle' | 'bed'
  | 'check' | 'lock' | 'stop' | 'arrow-up' | 'family' | 'recall' | 'calendar' | 'child' | 'bot' | 'type' | 'bell' | 'sun'
  | 'heart' | 'activity'
