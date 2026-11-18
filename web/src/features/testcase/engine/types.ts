import type { IconName } from '@/data/types'
import type { AgentId, CaseId, FamilyProfile, JourneyId, Params, PersonId, SafetyInputs, PrevInputs, SampleKey, StepDef, TeachId, Txt } from '../data/types'
import type { SignalRow } from './family'
import type { ForecastResult } from './forecast'
import type { InputIssue, InputIssues } from './inputs'

export * from '../data/types'

/**
 * # Test case engine: public API (pure TypeScript, no React, no timers, no Date.now)
 *
 * ```ts
 * const engine = new TestCaseEngine({ t, random })    // t: the testcase-namespace `t` (only used by the speech check)
 * engine.subscribe(listener)                           // useSyncExternalStore(engine.subscribe, engine.getSnapshot)
 * const snap = engine.getSnapshot()                    // immutable per change (see `Snapshot`)
 * const text = resolveText(txt, t, engine.ctx())       // every user-visible string comes out as a `Txt`
 * ```
 *
 * ## Text
 * The engine never builds English. It returns `Txt` ({ k, p }): an i18n key of the `testcase` namespace and params.
 * Placeholders in the locale strings are `{{name}}`. A placeholder is filled from the Txt's own `p`, then from the token context
 * `engine.ctx()` (person, pronouns, readings, slot, voice line...). `resolveText(txt, t, ctx)` does the whole job (nested Txt,
 * `TxtList`); call it with a `t` for the namespace (`i18n.getFixedT(null, 'testcase')`). Data fields typed `TKey` are bare keys:
 * wrap them with `tx(key)` first (the engine already does so in everything it returns).
 *
 * ## Time
 * The engine has a clock in minutes since 15 Oct 2026 00:00 (`state.clock`; `hm(t)` -> "02:10", `clk(t)` -> "15 Oct 02:10").
 * Nothing waits: the UI drives the three things that used to be `await sleep`:
 *  - the sensor playback: call `engine.playTick()` every 90 ms while `state.phase === 'playing'`;
 *  - the pipeline animation: call `engine.flowTick()` every 220 ms while `engine.busy` (or use `engine.settle()` in tests);
 *  - the autopilot: call `engine.autoStep()`; it returns the delay in ms before the next call (400 while busy, 850 otherwise)
 *    or `null` when the run is over. `engine.setAuto(false)` stops it. `runAutopilot(engine)` (autopilot.ts) runs it instantly.
 *
 * ## Actions (all no-ops when they do not apply, exactly like the prototype's guards)
 *  - Case: `restart(caseId?)`, `replay()` (same inputs, person and start), `setLang('en'|'ar')` (teach-back and speech language),
 *    `setInput(key, value)`, `setInputToggle('still'|'fall'|'glus', boolean)`, `setNationality`, `setPerson` / `setStart` ("own" case),
 *    `setResVal`, `setRecheckVal`, `setDailyVal`, `setFamResult(member, value)`, `setPlanShare('f1'|'f2', boolean)`,
 *    `setNoaTab('hosp'|'doh')`, `setDbTab(table)`.
 *  - Safety step 0: `play()` then `playTick()` repeatedly, `submitSpeech(result)` / `sampleSpeech(key)` / `typedSpeech(text)` /
 *    `spokenSpeech(text, seconds)`, `answer(id)`. The decision (rules R1 to R12) is taken by the engine when both are in.
 *  - Prevention step 0: `checkPassport()`, `chooseBarrier(id)`; later steps `sendResult()`, `referAct()`.
 *  - Family step 0: `famAct(actionId)`, `famSelect(memberId)` and the profile editor (below); step 2: `setFamResult(resultId, value)`, `famSendResults()`.
 *  - Safety / prevention inputs: `setInput(key, value)` is checked (see "Input guardrail").
 *  - Any step: `go(i)`, `next()` (`canNext()`), `tlNext()`, `btnAct()`, `answerTeach(optionIndex)`, `sendPlan()`, `recheck()`,
 *    `sendDaily()`, `accept()`, `report()`, `applyLiveExplain(json)`.
 *
 * ## The family (eight people, four generations) and Noa Forecast
 * `snapshot.state.fm` (`FamState`) holds `prof` (the editable profile of every member), `status`, `booked`, `declined`, `fcNo` (heart-review "not now"),
 * `conn`, `badges`, `sel`, `res` (results by result id), `routes` and `alerts` (newest first; heart-risk alerts have id `fc_<member>`).
 * `snapshot.family` (`FamilyView`) is recomputed on every change and holds, per member id, everything the screen draws, as data:
 *  - `forecast[id]`: `ForecastResult`. `ok: true`: `r` (10-year risk 0..0.99), `cat` (`id` high | mid | low, `tone`, `label` / `lower` Txt), `lab` (cholesterol
 *    used), `ha` (heart age: a number, `'atMost30'` or `'over100'`), `r5` / `p5` (5 years on if trends continue / with the plan), `traj` (year 0..5 pairs), `chart`
 *    (`years`, `max`, `ticks`, `bands`, `now`, `trend`, `plan`: draw the three series and the bands), `evidence` (`variant` lab | bmi, `used` / `missing` inputs by id
 *    and a `note` Txt such as "BMI used because cholesterol is not measured yet", `trends`). `ok: false`: `reason` (child | cvd | under30 | over74), `why` and
 *    `short` Txt. The score applies to ages 30 to 74 without a heart attack or stroke (`fcValidity`).
 *  - `signals[id]`: rows `{ agent, source, value }` (which agent collected what, from where), `next[id]`: the one next action, `age[id]` (Txt "18 months" or a
 *    number), `ifhas[id]` (IFHAS eligible), `child[id]` (next well-child visit, name, visits done of 14).
 * Editor actions (all take the member id; adults: `age sbp bmi tc hdl sbpTrend bmiTrend`, children: `ageM overdueW`; ranges in `FAMILY_RANGES`):
 *  - `setProfile(member, field, value, commit = true)`: snaps to the slider step and clamps to the range (a warning). `commit` false while a slider is dragged (the
 *    tree and the forecast change, nothing else); true on release: the edit is logged and heart-risk alerts are synced (Noa Forecast raises ONE red alert when the risk
 *    reaches 20%, never on top of another open alert, a booking or a "not now"; it withdraws it when the risk falls). A child's status follows `overdueW`.
 *  - `toggleProfile(member, 'smoker' | 'dm' | 'bpTx' | 'cvd' | 'emirati' | 'labs')` (`labs` on: total 5.2, HDL 1.2 mmol/L; off: both cleared, the BMI score returns),
 *    `setSex(member, 'M' | 'F')`, `resetFamily()`.
 *  - `famAct`: `moza_ok`, `book_<hind|maitha|khalid|amna|saeed|sultan>`, `keep_amna`, `no_<member>`, and for a heart-risk alert `fcb_<member>` (book the doctor
 *    review) / `fcn_<member>` (not now). Booking Sultan while Khalid smokes adds connection C8.
 *  - `forecast(member)` gives the same `ForecastResult` outside React; the pure functions (`framRisk`, `heartAge`, `fcProject`, `fcFor`, `fcCat`, `pct`, `wcNext`,
 *    `wcDone`, `ifhasOk`, `nextAction`, `famSignals`) are exported from `engine/index.ts`. `engine.prevForecast()` is the heart forecast beside the HbA1c of the
 *    "Adult screening never done" case (null in the other cases).
 *
 * ## Input guardrail (plan item B3)
 * `snapshot.inputIssues` lists, for the running case, the inputs that are missing or implausible, as `{ subject, field, level, kind, message: Txt, min?, max?, value?, applied? }`:
 *  - `required` (the decision is blocked, the UI must ask): a value that is not a number, or (safety and prevention inputs) outside its plausible range. `setInput` REFUSES
 *    such a value (the previous valid value stays and the issue is kept until a valid one arrives); `play()`, `checkPassport()` and `famSendResults()` do nothing while
 *    a required issue is open. A state scan also reports values that got in some other way.
 *  - `recommended` (a warning, the flow continues): a family value clamped to its range (`setProfile`, `setFamResult`), cholesterol not measured for someone the heart
 *    score applies to ("BMI used"), only one of total and HDL cholesterol, no glucose sensor for a person with diabetes.
 * The ranges are the prototype's own sliders (`SAFETY_RANGES`, `PREV_RANGES`, `FAMILY_RANGES` in `data/forecast.ts`): plausibility only, no clinical thresholds.
 * `setInput`, `setProfile` and `setFamResult` return `{ ok, value, issue? }`.
 *
 * ## What to render
 * `snapshot.steps` are the steps of the running case; render the current one (`snapshot.step`) by `StepDef.kind` (see `stepKinds`).
 * Helpers on the engine give the dynamic content of a step: `items(step)`, `packet(step)`, `decisionChecks()`, `curExplain()`,
 * `phoneTone`... The demo database is `snapshot.db` (table -> rows, cells are `string | number | Txt`), the event log is
 * `snapshot.log` (newest first), the family feed is `snapshot.state.feed`, the pipeline is `snapshot.state.pipe`.
 *
 * ## Locale key layout (`locales/{en,ar}/testcase.json`, identical key sets)
 * people.<id>.{n,nar,nen,full,call,home,f1s,f1ar,f1,f2s,f2,f2d,meds,hist,usual,hosp,age} - `n`/`f1s` are Arabic in the ar file; nar/f1ar/nen never change.
 * cases.<id>.{title,teaser} - questions.<fall|hypo|hf|hr>.{q,a.N} - rules.R1..R12.{when,then} - agents.<id>.{n,role,can,cannot,story}
 * teach.<id>.{facts, en.{explain,q,opts.N,simpler,wrong.N}, ar.{...}} - the English and Arabic sets are in BOTH files (the overlay's EN/AR switch is independent)
 * daily.<id>.* - report.<id>.{title,kpi.N.{label,value,note}} - journeys.<id>.{name,steps.N.{title,hold,btn,text,done,decides,agents.<agent>.N,items.N.{title,detail,anticoag.*},packet.N.*,phone.*,fam.*}}
 * stepLabel.* / flow.* / pipe.* (shared short labels) - stepZero.<home|passport>.* - prevention.{barriers,enablers,rules,pv.<case>.*,steps.N.*,route.<case>.<variant>.*,ifhas.*,why.*}
 * family.{members,sources,connections,results,badges,alerts,visits,follow,steps,routes,slots,status,pfl,fmt,next,signals,teams,...} - modes.* - nodes.N.{who,name}
 * forecast.{cat,catLower,na,naShort,evidence,ha}.* - inputs.{missing,clamped,rejected,outOfRange,rec,field}.* - prevention.forecast.* (the forecast beside the IFHAS result)
 * Engine-built text: tokens.* (pronouns, voice lines) - log.* - audit.* - db.* (cells, notes) - checks.* - feed.* - decision.* - source.* - actor.* - status.* - teams.* - reading.* - speech.* - common.*
 * UI chrome (buttons, labels, "Your turn") is NOT here: the UI agents add their own keys to this file.
 * Placeholders are `{{token}}`; tokens come from `engine.ctx()`: n nar nen full age f1 f1s f2 f2s f2d meds hist hosp she he She her Her herO glu wt spo2 floor t0 lkw chk
 * speech answer addr addrar poss val finding team next item slot enabler voice chads.
 */

/** Every step kind the UI must render. Speech checks are part of `home` (safety step 0) and `daily`; `child` / `adult` are the two layouts of the `passport` step (`PvCase.kind`). */
export const stepKinds = ['home', 'passport', 'famhub', 'tl', 'btn', 'teach', 'recheck', 'daily', 'accept', 'result', 'famresult', 'refer', 'report'] as const
export type StepKindName = (typeof stepKinds)[number]
export const passportKinds = ['child', 'adult'] as const

export type Lang = 'en' | 'ar'
export type Phase = 'setup' | 'playing' | 'check' | 'decided' | 'ask'
export type LogClass = 'ok' | 'warn' | 'bad' | 'is' | 'noa'
export type Cell = string | number | Txt
export type DbRow = Record<string, Cell>
export const DB_TABLES = ['agents', 'patients', 'consents', 'observations', 'checkins', 'alerts', 'tasks', 'encounters', 'reports', 'audit'] as const
export type DbTable = (typeof DB_TABLES)[number]
export type DbState = Record<DbTable, DbRow[]>

export interface LogEntry { t: string; m: string; cls: LogClass; tx: Txt }
export interface FeedItem { t: string; who: Txt; text: Txt }
export interface PipeState { c: 'active' | 'done'; t: Txt }
export type SpeechLevel = 'green' | 'amber' | 'red'
export interface SpeechResult {
  said: string; secs: number | null; match: number; ratio: number | null; score: number; lvl: SpeechLevel
  mode: 'spoken' | 'typed' | 'sample'; lang: Lang; wpm: number | null
  /** Per target word: heard clearly. */
  mask: boolean[]; target: string[]; matched: number; total: number
}

export interface Decision {
  /** The journey that follows, `prev` for prevention, null when nothing follows (R12, stand down, P2, P8). */
  path: JourneyId | 'prev' | null
  rule: string
  name: Txt
  why?: Txt
  standdown?: boolean
  /** Low sugar did not recover after two rechecks. */
  escalated?: boolean
}
export interface Due { item: Txt; list: Txt[] }
export interface Route { b: 'refer' | 'ok'; t: Txt; tCap: Txt; team: Txt | null; next: Txt | null; teach: TeachId }
/** Where a family result goes. `used`: the value only feeds a heart risk (blood pressure, cholesterol); it is not a finding on its own. */
export interface FamRoute { b: 'refer' | 'ok'; text: Txt; low: Txt; team: Txt | null; used: boolean }
export interface FamAlert {
  id: string; who: string; lvl: 'red' | 'amber' | 'yellow' | 'green'; title: Txt; why: Txt; agent: AgentId
  acts: { label: Txt; id: string }[]; state: 'open' | 'done'; conn?: string[]; done?: Txt
}
export interface FamState {
  /** The editable profile of every member: adults have age, sex, sbp, bpTx, smoker, dm, tc, hdl, bmi, cvd, trends, emirati; children ageM and overdueW. */
  prof: Record<string, FamilyProfile>
  /** member -> alert | overdue | due | booked | care | ok | declined */
  status: Record<string, string>
  booked: Record<string, Txt>
  declined: Record<string, boolean>
  /** Members whose heart-risk review was answered "not now": no further heart-risk alert for them. */
  fcNo: Record<string, boolean>
  conn: string[]
  badges: string[]
  sel: string
  /** Results entered, by result id (`hind`, `khalid_a1c`, `khalid_tc`...). */
  res: Record<string, number>
  routes: Record<string, FamRoute>
  alerts: FamAlert[]
}
export interface Explain {
  src: 'prepared' | 'live'; lang: Lang; tkey: TeachId
  explain: Txt | string; q: Txt | string; opts: (Txt | string)[]; correct: number; simpler: Txt | string; wrong?: (Txt | string)[]
}

/** The whole mutable state of a running case. Everything in it is serialisable; times are minutes since 15 Oct 2026 00:00. */
export interface State {
  ck: CaseId
  pk: PersonId
  inp: SafetyInputs | PrevInputs | Record<string, never>
  /** The result being entered (prevention). */
  resVal: number | null
  barrier: string | null
  branch: 'refer' | 'ok' | null
  route: Route | null
  due: Due | null
  teachKey: TeachId | null
  start: number
  lang: Lang
  phase: Phase
  /** Heart rate per minute and whether the person moved, from the playback. */
  read: number[]
  mv: number[]
  min: number
  trig: Triggers | null
  tTrig: number | null
  tCheck: number | null
  tAct: number | null
  /** Which rule fired first (R1 to R4). */
  why1: string | null
  speech: { home?: SpeechResult; daily?: SpeechResult }
  ans: string | null
  qk: 'fall' | 'hypo' | 'hf' | 'hr' | null
  dec: Decision | null
  path: JourneyId | 'prev' | 'fam' | null
  step: number
  max: number
  /** Timeline progress per step index. */
  prog: Record<number, number>
  done: Record<number, boolean>
  seen: Record<number, boolean>
  /** Teach-back: 'ok' once passed; the wrong option index tried last. */
  tb: 'ok' | null
  tbWrong: number | null
  explain: Explain | null
  /** Who sees the plan (the two people on the call list). */
  fam: { f1: boolean; f2: boolean }
  planSent: boolean
  /** Prevention: the decision came from Noa's "Book it · one tap", not from an answer the person gave. */
  noaPicked: boolean
  rc: { n: number; vals: number[]; val: number }
  daily: { val: number | null; sent: boolean; alert: boolean }
  noaTab: 'hosp' | 'doh'
  dbTab: DbTable
  pipe: Record<number, PipeState>
  clock: number
  auto: boolean
  feed: FeedItem[]
  fm: FamState | null
  /** Inputs the engine refused or clamped, by `subject.field`, until a valid value arrives (see `inputs.ts`). */
  notes: Record<string, InputIssue>
}
export interface Triggers { hr: boolean; fall: boolean; hypo: boolean; hypoS: boolean; hf: boolean; spo2c: boolean }

/** A row with the blood-thinner override applied. */
export interface ResolvedRow { at: number; title: string; detail: string }

export interface Snapshot {
  version: number
  state: State
  db: DbState
  /** Newest first, at most 150. */
  log: LogEntry[]
  steps: StepDef[]
  /** The current step. */
  step: StepDef
  busy: boolean
  /** Night theme on (night cases, from the first minute of playback until `nightUntil`). */
  night: boolean
  /** Ids of rows added since the step was entered (highlight them). */
  fresh: ReadonlySet<string>
  canNext: boolean
  /** Family cases: the passport score in % and the number up to date. */
  famScore: number
  famUp: number
  /** Family cases: the forecast, signals and next action of every member (data only, no markup). `null` in the other cases. */
  family: FamilyView | null
  /** Inputs of the running case that are missing or implausible: `required` blocks the decision, `recommended` is a warning. */
  inputIssues: InputIssues
}
/** What the family screen needs per member id, recomputed on every change. */
export interface FamilyView {
  forecast: Record<string, ForecastResult>
  signals: Record<string, SignalRow[]>
  next: Record<string, Txt>
  /** "18 months" (Txt) under two years for children, whole years otherwise. */
  age: Record<string, Txt | number>
  /** IFHAS applies (Emirati adults 18 to 75). */
  ifhas: Record<string, boolean>
  /** Children: next visit (months, null when all done), visits done of 14. */
  child: Record<string, { next: number | null; nextName: Txt | null; done: number; total: number }>
}

export type TFn = (key: string, opts?: Record<string, unknown>) => string
export type { IconName, AgentId, Params, PersonId, SampleKey }
