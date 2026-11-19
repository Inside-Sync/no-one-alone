import en from '@/locales/en/testcase.json'
import { TestCaseEngine, runAutopilot, type InputCheck, type SafetyInputs, type TFn } from '../engine'
import type { BenchAgent, DecisionClass, Divergence, FamResultSetup, FamRiskSetup, Outcome, PrevSetup, SafetySetup, Scenario, ScenarioResult, SetOp } from './types'

/** A `t` for the testcase namespace from the English JSON. The engine only needs it for the speech sentences, so one `t` serves both languages. */
export const benchT: TFn = (key) => {
  const v = key.split('.').reduce<unknown>((o, s) => (o == null ? o : (o as Record<string, unknown>)[s]), en)
  return typeof v === 'string' ? v : key
}

const PATH_CLASS: Record<string, DecisionClass> = {
  stroke_em: 'call-998', fall_em: 'call-998', hypo_em: 'call-998', hf_em: 'call-998',
  hypo_home: 'home-plan', fall_minor: 'home-plan', hf_clinic: 'same-day-clinic',
}

/** The agent that wrote the decision: the actor of the newest audit row, or (when the engine logged none) the tag of the newest log line. */
function deciderOf(e: TestCaseEngine): BenchAgent {
  const rows = e.db.audit
  const last = rows[rows.length - 1]
  const k = last && typeof last.actor === 'object' ? (last.actor as { k: string }).k.replace('actor.', '') : ''
  if (k === 'noa' || k === 'voice' || k === 'guardian') return k
  const tag = e.logs[0]?.m
  return tag === 'FORECAST' ? 'forecast' : 'noa'
}

const warnings = (e: TestCaseEngine): string[] => e.inputIssues().recommended.map((i) => i.field)

/** Apply typed values; report the first value the guardrail treated differently from what the scenario says. */
function applySet(e: TestCaseEngine, set: SetOp[] | undefined): Divergence | null {
  let bad: Divergence | null = null
  for (const op of set ?? []) {
    const r: InputCheck = e.setInput(op.key as keyof SafetyInputs, op.value)
    const want = op.expect !== 'refuse'
    if (r.ok !== want && !bad) {
      bad = { step: 'input', agent: 'guardrail', field: op.key, expected: want ? 'accepted' : 'refused', actual: r.ok ? 'accepted' : 'refused' }
    }
  }
  return bad
}

const refused = (): Outcome => ({ trigger: null, rule: 'none', decision: 'refused', agent: 'guardrail' })
type Run = { actual: Outcome; input: Divergence | null }

/**
 * The playback adds up to +-3 bpm of sensor noise to the heart rate. A constant source of 0.5 switches it off, so the heart rate typed in IS the
 * reading and the edge of "above 120 for 10 minutes" can be tested exactly.
 */
const NO_NOISE = () => 0.5

function runSafety(s: SafetySetup, t: TFn): Run {
  const e = new TestCaseEngine({ t, caseId: 'own', random: NO_NOISE })
  if (s.person) e.setPerson(s.person)
  if (s.start != null) e.setStart(s.start)
  if (s.lang) e.setLang(s.lang)
  for (const k of ['still', 'fall'] as const) if (s.toggles?.[k] != null) e.setInputToggle(k, s.toggles[k] as boolean)
  const input = applySet(e, s.set)
  e.play()
  if (e.S.phase === 'setup') return { actual: refused(), input }
  e.drain()
  const S = e.S
  if (S.phase === 'check') {
    const sp = s.speech ?? 'usual'
    if (typeof sp === 'string') e.sampleSpeech(sp)
    else e.typedSpeech(sp.typed)
    e.drain()
    if (S.phase === 'check' && S.qk && S.speech.home?.said && !S.ans) {
      const first: Record<string, string> = { fall: 'ok', hypo: 'drink', hf: 'pillows', hr: 'fine' }
      e.answer(s.answer ?? first[S.qk])
      e.drain()
    }
  }
  const dec = S.dec
  const speechLevel = S.speech.home ? (S.speech.home.said ? S.speech.home.lvl : 'none') : undefined
  if (S.phase !== 'decided' || !dec) return { actual: { trigger: S.why1, rule: 'none', decision: 'no-decision', agent: 'voice', speech: speechLevel }, input }
  const decision: DecisionClass = dec.path ? PATH_CLASS[dec.path] : dec.standdown ? 'stand-down' : 'no-action'
  return { actual: { trigger: S.why1, rule: dec.rule, decision, agent: deciderOf(e), speech: speechLevel, warn: warnings(e)[0] }, input }
}

function runPrev(s: PrevSetup, t: TFn): Run {
  const e = new TestCaseEngine({ t, caseId: s.pv })
  if (s.nat) e.setNationality(s.nat)
  const input = applySet(e, s.set)
  e.checkPassport()
  const S = e.S
  if (S.phase === 'setup') return { actual: refused(), input }
  if (S.dec?.rule === 'P2') return { actual: { rule: 'P2', decision: 'stay-silent', agent: deciderOf(e) }, input }
  const barrier = s.barrier ?? (s.result != null ? e.pvDef.barrier : undefined)
  if (!barrier) return S.phase === 'ask' ? { actual: { rule: 'P1', decision: 'ask-barrier', agent: 'guardian' }, input } : { actual: { rule: 'none', decision: 'no-decision', agent: 'noa' }, input }
  e.chooseBarrier(barrier)
  e.drain()
  if (s.result == null || !S.dec?.path) {
    const rule = S.dec?.rule ?? 'none'
    return { actual: { rule, decision: rule === 'P8' ? 'respect-choice' : 'barrier-help', agent: deciderOf(e) }, input }
  }
  e.setResVal(s.result)
  runAutopilot(e)
  const r = S.route
  if (!r) return { actual: { rule: 'none', decision: 'no-decision', agent: 'noa' }, input }
  return { actual: { rule: 'P9', decision: r.b === 'refer' ? 'refer' : 'passport-ok', agent: deciderOf(e), detail: r.t.k.split('.')[3] }, input }
}

function runFamResult(s: FamResultSetup, t: TFn): Run {
  const e = new TestCaseEngine({ t, caseId: 'family' })
  e.setAuto(true)
  for (let i = 0; i < 400 && !(e.cur().kind === 'famresult' && !e.S.done[e.S.step]); i++) { e.drain(); if (e.autoStep() == null) break }
  e.setAuto(false)
  if (e.cur().kind !== 'famresult') return { actual: { rule: 'none', decision: 'no-decision', agent: 'noa' }, input: null }
  const c = e.setFamResult(s.id, s.value)
  e.drain()
  e.famSendResults()
  const r = e.S.fm?.routes[s.id]
  const warn = warnings(e).find((f) => f === 'res.' + s.id)
  if (!r) return { actual: { rule: 'none', decision: c.ok ? 'no-decision' : 'refused', agent: c.ok ? 'noa' : 'guardrail' }, input: null }
  return { actual: { rule: 'P9', decision: r.b === 'refer' ? 'refer' : 'passport-ok', agent: deciderOf(e), detail: r.text.k.split('.')[3], warn }, input: null }
}

function runFamRisk(s: FamRiskSetup, t: TFn): Run {
  const e = new TestCaseEngine({ t, caseId: 'family' })
  for (const id of s.before ?? []) e.famAct(id)
  for (const ed of s.edits ?? []) {
    if (ed.op === 'set') e.setProfile(s.member, ed.field as never, ed.value)
    else if (ed.op === 'toggle') e.toggleProfile(s.member, ed.field as never)
    else e.setSex(s.member, ed.sex)
  }
  const f = e.getSnapshot().family?.forecast[s.member]
  const alert = !!e.S.fm?.alerts.some((a) => a.id === 'fc_' + s.member && a.state === 'open')
  if (!f) return { actual: { rule: 'none', decision: 'no-decision', agent: 'forecast' }, input: null }
  if (!f.ok) return { actual: { rule: 'none', decision: 'not-scored', agent: 'forecast', detail: f.reason, alert }, input: null }
  if (f.cat.id === 'high') return { actual: { rule: 'F1', decision: 'doctor-review', agent: 'forecast', detail: 'high', alert }, input: null }
  if (f.cat.id === 'mid' && !f.lab) return { actual: { rule: 'F2', decision: 'measure-cholesterol', agent: 'forecast', detail: 'mid', alert }, input: null }
  return { actual: { rule: 'none', decision: 'no-action', agent: 'forecast', detail: f.cat.id, alert }, input: null }
}

const str = (v: unknown) => (v == null ? 'none' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v))

/** The first step where the run differs from the expectation: input guardrail, trigger (Guardian), speech check (Voice), decision, detail, warning. */
export function diverge(x: Outcome, a: Outcome, input: Divergence | null): Divergence | null {
  if (input) return input
  const d = (step: Divergence['step'], agent: BenchAgent, field: string, ex: unknown, ac: unknown): Divergence => ({ step, agent, field, expected: str(ex), actual: str(ac) })
  if (x.trigger !== undefined && x.trigger !== a.trigger) return d('trigger', 'guardian', 'trigger', x.trigger, a.trigger)
  if (x.speech !== undefined && x.speech !== a.speech) return d('speech', 'voice', 'speech', x.speech, a.speech)
  if (x.decision !== a.decision) return d('decision', a.agent, 'decision', x.decision, a.decision)
  if (x.rule !== a.rule) return d('decision', a.agent, 'rule', x.rule, a.rule)
  if (x.agent !== a.agent) return d('decision', a.agent, 'agent', x.agent, a.agent)
  if (x.detail !== undefined && x.detail !== a.detail) return d('detail', a.agent, 'detail', x.detail, a.detail)
  if (x.alert !== undefined && x.alert !== a.alert) return d('detail', 'forecast', 'alert', x.alert, a.alert)
  if (x.warn !== undefined && x.warn !== a.warn) return d('warning', 'guardrail', 'warning', x.warn, a.warn)
  return null
}

/** Run one scenario on a fresh engine (no timers: the playback and the pipeline are drained). Never throws: an engine error becomes a failed result. */
export function runScenario(sc: Scenario, t: TFn = benchT): ScenarioResult {
  let out: Run
  try {
    const s = sc.setup
    out = s.kind === 'safety' ? runSafety(s, t) : s.kind === 'prev' ? runPrev(s, t) : s.kind === 'famResult' ? runFamResult(s, t) : runFamRisk(s, t)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const actual: Outcome = { rule: 'none', decision: 'no-decision', agent: 'noa' }
    return { id: sc.id, scenario: sc, actual, pass: false, divergence: { step: 'error', agent: 'noa', field: 'error', expected: 'no error', actual: msg } }
  }
  const divergence = diverge(sc.expected, out.actual, out.input)
  return { id: sc.id, scenario: sc, actual: out.actual, pass: divergence === null, divergence }
}

export function runAllSync(list: readonly Scenario[], t: TFn = benchT): ScenarioResult[] {
  return list.map((s) => runScenario(s, t))
}

export interface RunOptions {
  t?: TFn
  onProgress?: (done: number, total: number) => void
  isCancelled?: () => boolean
  /** Yield to the browser every this many scenarios (default 6). */
  chunk?: number
}

/** Run the set in chunks so the page stays responsive; stops early (returns what ran so far) when `isCancelled()` turns true. */
export async function runAll(list: readonly Scenario[], opts: RunOptions = {}): Promise<{ results: ScenarioResult[]; cancelled: boolean }> {
  const out: ScenarioResult[] = []
  const chunk = opts.chunk ?? 6
  for (let i = 0; i < list.length; i++) {
    if (opts.isCancelled?.()) return { results: out, cancelled: true }
    out.push(runScenario(list[i], opts.t))
    if ((i + 1) % chunk === 0 || i === list.length - 1) {
      opts.onProgress?.(i + 1, list.length)
      if (i < list.length - 1) await new Promise<void>((r) => setTimeout(r, 0))
    }
  }
  return { results: out, cancelled: false }
}
