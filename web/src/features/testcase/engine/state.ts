import { AGENTS, AGENT_IDS } from '../data/agents'
import { CASES } from '../data/cases'
import { DAILY } from '../data/daily'
import { FAMILY_BADGES, FAMILY_CONNECTIONS, FAMILY_MEMBERS, FAMILY_PROFILES, FAMILY_RESULTS, FAMILY_SOURCES } from '../data/family'
import { FAMILY_RANGES, IFHAS_FORECAST, SAFETY_RANGES } from '../data/forecast'
import { JOURNEYS } from '../data/journeys'
import { PEOPLE, PERSON_IDS } from '../data/people'
import { BARRIERS, ENABLER, PV } from '../data/prevention'
import { QUESTIONS } from '../data/questions'
import { REPORT } from '../data/report'
import { STEP_ZERO } from '../data/stepZero'
import { TEACH } from '../data/teach'
import { tx, type AdultProfile, type CaseId, type JourneyId, type Params, type PersonId, type PrevInputs, type PvId, type Row, type SafetyInputs, type SampleKey, type StepDef, type Txt } from '../data/types'
import { runAutoStep } from './autopilot'
import { decisionChecks, prevChecks } from './checks'
import { emptyDb, type Seq } from './db'
import { ageText, childAlertTitle, famScore, famSignals, famUp, familySteps, fcAlertTitle, initFamily, nextAction, routeFamilyResult } from './family'
import { fcFor, ifhasForecast, ifhasOk, pct, wcDone, wcNext, type ForecastResult } from './forecast'
import { checkValue, familyIssue, noteKey, prevIssue, prevRange, prevStateIssues, profileStateIssues, safetyIssue, safetyStateIssues, split, type Checked, type InputIssue, type InputIssues } from './inputs'
import { dueNow, passportStep, prevSteps, routeResult, wcName } from './prevention'
import { alertTeamKey, chads, choosePath, runLen, triggers } from './safety'
import { samples, scoreSpeech, sentenceTxt } from './speech'
import { clk, clkDate, hm, pad2, resolveText } from './text'
import { DB_TABLES, type Cell, type DbRow, type DbState, type DbTable, type Explain, type FamAlert, type FamilyView, type FeedItem, type Lang, type LogClass, type LogEntry, type Snapshot, type SpeechResult, type State, type TFn } from './types'
import { WC_AGES } from '../data/prevention'

const T = tx
export interface EngineOptions {
  /** `t` of the `testcase` namespace. Only the speech check needs it (the target sentence and the sample answers are real strings). */
  t?: TFn
  /** 0..1 random source for the heart-rate jitter of the playback. Default: a fixed-seed generator, so runs are reproducible. */
  random?: () => number
  /** Case to start with (default `family`, like the prototype). */
  caseId?: CaseId
  /** The language Noa speaks and teaches in at the start (the app language); kept across restarts. Default `en`. */
  lang?: Lang
}

export interface Item { at: number; title: Txt; detail: Txt }
/** The outcome of an edit: `ok` false when the value was refused (or clamped, then `value` is what was kept); `issue` explains. */
export interface InputCheck { ok: boolean; value: number; issue?: InputIssue }
const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** AUTO_DB: which database table to open when a step of this kind is entered. */
const AUTO_DB: Record<string, DbTable> = { result: 'observations', refer: 'tasks', tl: 'tasks', btn: 'encounters', teach: 'checkins', recheck: 'observations', daily: 'alerts', accept: 'tasks', report: 'reports' }
const LEVEL_KEY = { green: 'speech.level.green', amber: 'speech.level.amber', red: 'speech.level.red' } as const

/**
 * The Test case engine: one running case. Pure TypeScript, deterministic given its `random`, no timers. See `types.ts` for the API.
 * Mirrors the prototype's `S` / `DB` / `LOG` and its actions one to one.
 */
export class TestCaseEngine {
  S!: State
  db!: DbState
  logs: LogEntry[] = []
  seq!: Seq
  fresh = new Set<string>()
  t: TFn
  private random: () => number
  /** Set when the caller injected `random`; otherwise the default generator is re-seeded at every restart so a case does not depend on earlier ones. */
  private injected: (() => number) | null
  private lang0: Lang
  private listeners = new Set<() => void>()
  private version = 0
  private snap: Snapshot | null = null
  /** Pipeline animation queue (node, text) and the node currently "working". */
  private queue: [number, Txt][] = []
  private active: [number, Txt] | null = null
  private playCtl: { m: number; end: number; tTrig: number | null; why: string | null } | null = null

  constructor(opts: EngineOptions = {}) {
    this.t = opts.t ?? ((k: string) => k)
    this.injected = opts.random ?? null
    this.random = this.injected ?? mulberry32(2026)
    this.lang0 = opts.lang ?? 'en'
    this.restart(opts.caseId ?? 'family')
  }

  /* ---------------------------------------------------------------- store */
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  getSnapshot = (): Snapshot => {
    if (this.snap) return this.snap
    const steps = this.steps()
    this.snap = {
      version: this.version,
      state: structuredClone(this.S),
      db: Object.fromEntries(DB_TABLES.map((k) => [k, this.db[k].slice()])) as DbState,
      log: this.logs.slice(),
      steps,
      step: steps[this.S.step],
      busy: this.busy,
      night: this.night,
      fresh: new Set(this.fresh),
      canNext: this.canNext(),
      famScore: this.S.fm ? famScore(this.S.fm) : 0,
      famUp: this.S.fm ? famUp(this.S.fm) : 0,
      family: this.familyView(),
      inputIssues: this.inputIssues(),
    }
    return this.snap
  }
  /** The live (mutable) state: read it in tests and logic; render from `getSnapshot()`. */
  get state(): State { return this.S }
  /** Publish a change. `sync` false: a slider drag (the prototype re-draws only the tree and the forecast then, no alerts and no log). */
  private emit(sync = true) {
    if (sync && this.S.fm) this.syncFc('live')
    this.reconcile()
    this.version++
    this.snap = null
    this.listeners.forEach((l) => l())
  }
  setTranslator(t: TFn) { this.t = t }

  /* ---------------------------------------------------------------- tokens */
  /** The token context for `resolveText` (prototype `tk`): person, pronouns, readings, slot, voice line... */
  ctx(): Params {
    const S = this.S, p = PEOPLE[S.pk], male = p.sex === 'M', I = S.inp as Partial<SafetyInputs>
    const k = (f: keyof typeof p.t): Txt | '' => (p.t[f] ? T(p.t[f]!) : '')
    const g = (name: string) => T(`tokens.${name}_${male ? 'm' : 'f'}`)
    const sp = S.speech.home
    const pv = S.ck && CASES[S.ck].pv ? PV[CASES[S.ck].pv as PvId] : null
    const slot: Params[string] = this.isPrev && S.barrier && pv ? T(pv.slot[S.barrier] ?? pv.slot.access) : ''
    const enb = S.barrier ? ENABLER[S.barrier] : null
    const ans = S.ans && S.qk ? QUESTIONS[S.qk].a.find((a) => a.id === S.ans) : null
    let voice: Params[string] = ''
    if (S.barrier && pv) {
      voice = S.barrier === 'awareness' ? T('tokens.voice.awareness', { list: { list: S.due?.list ?? [], sep: '; ' } })
        : S.barrier === 'access' ? T('tokens.voice.access')
        : S.barrier === 'trust' ? T('tokens.voice.trust')
        : S.barrier === 'value' ? T('tokens.voice.value', { why: pv.why ? T(pv.why) : T('tokens.voice.valueDefault') })
        : T('tokens.voice.other')
    }
    return {
      n: k('n'), nar: k('nar'), nen: k('nen'), full: k('full'), age: p.child && p.t.age ? T(p.t.age) : p.age,
      f1: k('f1'), f1s: k('f1s'), f2: k('f2'), f2s: k('f2s'), f2d: k('f2d'), meds: k('meds'), hist: k('hist'), hosp: k('hosp'), usual: k('usual'),
      she: g('she'), he: g('she'), She: g('She'), her: g('her'), Her: g('Her'), herO: g('herO'),
      glu: I.glu != null ? I.glu : T('tokens.normal'), wt: I.wt, spo2: I.spo2, floor: I.floor,
      t0: hm(S.start + 10), lkw: hm(S.start + 10), chk: S.tCheck != null ? hm(S.tCheck) : '—',
      speech: sp ? (sp.said ? T('tokens.speech.scored', { score: sp.score.toFixed(2), level: T(LEVEL_KEY[sp.lvl]) }) : T('tokens.speech.none')) : '—',
      answer: ans ? T(ans.label) : '—',
      addr: p.child ? k('f1s') : k('n'), addrar: p.child ? k('f1ar') : k('nar'),
      poss: p.child ? T('tokens.possChild', { n: k('n') }) : T('tokens.possAdult'),
      val: S.resVal, finding: S.route ? S.route.t : '', team: S.route?.team ?? '', next: S.route?.next ?? T('tokens.nextCheck'),
      item: S.due ? S.due.item : '', slot, enabler: enb ? T(enb.name) : '', voice,
      chads: chads(p, true),
    }
  }

  /* ---------------------------------------------------------------- helpers */
  get isFam() { return CASES[this.S.ck].type === 'fam' }
  get isPrev() { return CASES[this.S.ck].type === 'prev' }
  get person() { return PEOPLE[this.S.pk] }
  private get pv() { return PV[CASES[this.S.ck].pv as PvId] }
  private get F() { return this.S.fm! }
  private hosp = (): Txt => T(this.person.t.hosp!)
  /** The Noa agent's display actor ("Noa Guardian"). */
  private actor = (a: string): Txt => T(`actor.${a}`)
  get busy() { return this.queue.length > 0 || this.active != null }
  /** Playback pause of the demo (set by the shell's driver, read by whatever else steps the engine on a timer). The engine itself ignores it. */
  paused = false

  private log(m: string, cls: LogClass, text: Txt) {
    this.logs.unshift({ t: hm(this.S.clock), m, cls, tx: text })
    if (this.logs.length > 150) this.logs.pop()
  }
  private add(table: DbTable, row: DbRow) {
    this.db[table].push(row)
    this.fresh.add(String(Object.values(row)[0]))
    return row
  }
  /** Replace the last row of a table that matches (rows are immutable so snapshots stay valid). */
  private patchLast(table: DbTable, pred: (r: DbRow) => boolean, patch: DbRow) {
    for (let i = this.db[table].length - 1; i >= 0; i--) if (pred(this.db[table][i])) { this.db[table][i] = { ...this.db[table][i], ...patch }; return }
  }
  private audit(actor: Cell, event: Cell, detail: Cell) {
    this.db.audit.push({ id: 'A-' + pad2(this.seq.a++), at: clk(this.S.clock), actor, event, detail })
  }
  private feed(who: Txt, text: Txt) {
    this.S.feed.push({ t: hm(this.S.clock), who, text } satisfies FeedItem)
  }
  private pid() { return String(this.db.patients[0].patient_id) }
  private obs(reading: Txt, source: Txt, at: number) {
    this.add('observations', { obs_id: 'O-' + this.seq.o++, patient_id: this.pid(), reading, source, measured_at: clk(at) })
  }
  private task(at: number, task: Txt, result: Txt) {
    this.add('tasks', { task_id: 'T-' + pad2(this.seq.t++), at: clk(at), task, result })
  }
  private alert(level: string, finding: Txt, rule: Cell, team: Txt, status: string, created: number, patient: Cell = this.pid()) {
    this.add('alerts', { alert_id: 'AL-' + pad2(this.seq.al++), patient_id: patient, level, finding, rule, team, status: T('status.' + status), created: clk(created) })
  }
  private statusIs(r: DbRow, s: string) { return (r.status as Txt).k === 'status.' + s }
  private pair = (a: Txt, b: Txt) => T('common.pair', { a, b })

  /* ---------------------------------------------------------------- steps */
  steps(): StepDef[] {
    const S = this.S
    if (this.isFam) return familySteps(S.fm!)
    if (this.isPrev) return [passportStep(S), ...(S.path === 'prev' ? prevSteps(S) : [])]
    const home = STEP_ZERO.home
    if (S.dec?.path) {
      const first = JOURNEYS[S.dec.path as JourneyId].steps[0].flow.find((f) => 'agent' in f) ?? { agent: 'responder' as const }
      return [{ ...home, flow: [...home.flow, first] }, ...JOURNEYS[S.path as JourneyId].steps]
    }
    return [home, ...(S.path && S.path in JOURNEYS ? JOURNEYS[S.path as JourneyId].steps : [])]
  }
  cur(): StepDef { return this.steps()[this.S.step] }
  /** Journey facts of the running path: report id, teach id, daily id. */
  meta() {
    const S = this.S
    if (S.path === 'prev') return { report: this.pv.report, teach: 'prev_ok' as const, daily: null }
    if (S.path === 'fam') return { report: 'fam', teach: 'prev_ok' as const, daily: null }
    const j = JOURNEYS[S.path as JourneyId]
    return { report: j.report, teach: j.teach, daily: j.daily }
  }
  /** Absolute clock of a step (prototype stepTime): minutes after the decision, or a day offset at a time of day. */
  stepTime(st: StepDef): number {
    const a = st.at ?? { m: 0 }
    const tAct = this.S.tAct ?? 0
    if ('d' in a) {
      const day = Math.floor(tAct / 1440) + a.d
      const [h, m] = a.h.split(':').map(Number)
      return day * 1440 + h * 60 + m
    }
    return tAct + (a.m || 0)
  }
  private rows(rows: Row[] | undefined): Item[] {
    const anti = this.person.anticoag
    return (rows ?? []).map((r) => {
      const o = anti && r.anticoag ? { ...r, ...r.anticoag } : r
      return { at: o.at ?? 0, title: T(o.title, o.p), detail: T(o.detail) }
    })
  }
  /** Timeline rows of a step, with the blood-thinner variant applied. */
  items(st: StepDef): Item[] { return this.rows(st.items) }
  /** Packet rows (title/detail) of a step, with the blood-thinner variant applied. */
  packet(st: StepDef): Item[] { return this.rows(st.packet) }
  get night(): boolean {
    const S = this.S, c = CASES[S.ck]
    const night = c.night && (S.ck !== 'own' || S.start < 360)
    if (!night) return false
    return (S.step === 0 && S.phase !== 'setup') || (!!S.path && S.path in JOURNEYS && S.step >= 1 && S.step <= JOURNEYS[S.path as JourneyId].nightUntil)
  }
  canNext(): boolean {
    const S = this.S
    if (this.busy) return false
    const ss = this.steps()
    if (S.step === 0) return this.isFam ? !!S.done[0] : !!(S.dec && S.dec.path)
    return !!S.done[S.step] && S.step < ss.length - 1
  }
  /** The amber "target" alert of the daily reading (prototype's lookup in the accept step and the hospital screen). */
  targetAlert(): DbRow | undefined {
    return this.db.alerts.slice().reverse().find((x) => x.level === 'amber' && (this.statusIs(x, 'new') || this.statusIs(x, 'accepted')) && (x.rule as Txt).k === 'db.target')
  }

  /** What the prototype did while rendering (marking steps that have nothing to do as done). Runs after every action. */
  private reconcile() {
    const S = this.S, st = this.cur(), i = S.step
    if (i === 0 || S.done[i]) {
      if (this.isFam && i === 0 && S.fm && Object.keys(S.fm.booked).length) S.done[0] = true
      return
    }
    if (st.kind === 'daily' && S.daily.sent && S.speech.daily && S.speech.daily.lvl !== 'red') S.done[i] = true
    else if (st.kind === 'accept' && !this.targetAlert()) S.done[i] = true
    else if (st.kind === 'refer' && S.branch !== 'refer') S.done[i] = true
    else if (st.kind === 'famresult' && S.fm && !Object.keys(FAMILY_RESULTS).some((k) => S.fm!.booked[FAMILY_RESULTS[k].who])) S.done[i] = true
  }

  /* ---------------------------------------------------------------- case lifecycle */
  private newState(ck: CaseId, lang: Lang): State {
    const c = CASES[ck]
    const inp = structuredClone(c.type === 'prev' ? PV[c.pv as PvId].inp : c.type === 'safety' ? c.inp! : {}) as State['inp']
    const S: State = {
      ck, pk: c.person, inp, resVal: c.type === 'prev' ? PV[c.pv as PvId].result.def : null, barrier: null, branch: null, route: null, due: null,
      teachKey: null, start: c.start, lang, phase: 'setup', read: [], mv: [], min: -1, trig: null, tTrig: null, tCheck: null, tAct: null, why1: null,
      speech: {}, ans: null, qk: null, dec: null, path: null, step: 0, max: 0, prog: {}, done: {}, seen: {}, tb: null, tbWrong: null, explain: null,
      fam: { f1: true, f2: true }, planSent: false, noaPicked: false, rc: { n: 0, vals: [], val: 5.1 }, daily: { val: null, sent: false, alert: false },
      noaTab: 'hosp', dbTab: 'observations', pipe: {}, clock: c.start, auto: false, feed: [], fm: null, notes: {},
    }
    if (c.type === 'fam') { S.fm = initFamily(); S.path = 'fam'; S.tAct = S.start; S.pk = 'khalid' }
    return S
  }
  /** Load a case from scratch (the language is kept). Without an id, the same case again ("Try another case"). */
  restart(ck?: CaseId) {
    const prev = this.S as State | undefined
    if (!this.injected) this.random = mulberry32(2026)
    this.logs = []; this.fresh = new Set(); this.queue = []; this.active = null; this.playCtl = null
    this.S = this.newState(ck ?? prev?.ck ?? 'family', prev?.lang ?? this.lang0)
    if (prev && prev.ck === 'own' && (!ck || ck === 'own')) { this.S.pk = prev.pk; this.S.start = prev.start }
    this.seedDb()
    if (this.isFam) this.seedFamily()
    this.S.clock = this.S.start
    this.log('START', 'is', T('log.start', { person: T(this.person.t.full!), title: T(CASES[this.S.ck].title) }))
    this.emit()
  }
  /** Same case, same inputs, person and start time: "Change the details and check again". */
  replay() {
    const keep = { inp: this.S.inp, pk: this.S.pk, start: this.S.start, ck: this.S.ck }
    this.restart(keep.ck)
    this.S.inp = keep.inp; this.S.pk = keep.pk; this.S.start = keep.start; this.S.clock = keep.start
    this.seedDb()
    this.emit()
  }
  private seedDb() {
    const S = this.S, p = this.person
    this.db = emptyDb()
    this.seq = { o: 10001, c: 1, al: 1, t: 1, e: 1, a: 1 }
    AGENT_IDS.forEach((k, i) => this.db.agents.push({ agent_id: 'AG-' + (i + 1), name: T('db.agentName', { n: T(AGENTS[k].n) }), role: T(AGENTS[k].role), can: T(AGENTS[k].can), cannot: T(AGENTS[k].cannot) }))
    this.db.patients.push({ patient_id: 'P-' + (1000 + PERSON_IDS.indexOf(S.pk)), name: T(p.t.full!), age: p.child && p.t.age ? T(p.t.age) : p.age, sex: p.sex, medicines: T(p.t.meds!), history: T(p.t.hist!), usual: T(p.t.usual!), call_list: T('db.callList', { f1: T(p.t.f1!), f2: T(p.t.f2!) }) })
    const cs: [string, string, string][] = [['emergencies', 'db.consent.emergency', 'db.consent.alwaysShare'], ['routine_alerts', 'db.consent.familyDoctor', 'db.consent.share'], ['family_circle', '', 'db.consent.granted'], ['malaffi', 'db.consent.malaffi', 'db.consent.planned']]
    cs.forEach((c) => this.db.consents.push({ scope: c[0], shared_with: c[1] ? T(c[1]) : this.pair(T(p.t.f1s!), T(p.t.f2s!)), status: T(c[2]), changed_at: '2 Jul 2026' }))
    this.audit(this.actor('system'), T('audit.caseLoaded'), T('common.dotPair', { a: T(p.t.full!), b: T(CASES[S.ck].title) }))
  }
  private seedFamily() {
    const prof = this.F.prof
    this.db.patients = FAMILY_MEMBERS.map((m, i) => ({ patient_id: 'FAM-1-' + (i + 1), name: T('db.famName', { n: T(m.name), rel: T(m.relLower) }), age: ageText(prof[m.id]), generation: m.gen, sources: T('common.list', { list: { list: m.src.map((x) => T(x)), sep: ', ' } }), reached_by: T(m.how) }))
    const person = (id: string) => T(`family.members.${id}.n`)
    const cons: [Txt, string, string][] = [
      [person('moza'), 'db.famConsent.moza', 'db.consent.granted'], [person('saeed'), 'db.famConsent.saeed', 'db.consent.granted'], [person('khalid'), 'db.famConsent.khalid', 'db.consent.granted'],
      [person('amna'), 'db.famConsent.amna', 'db.consent.granted'], [person('maitha'), 'db.famConsent.maitha', 'db.consent.granted'], [person('sultan'), 'db.famConsent.sultan', 'db.consent.private'],
      [T('db.famChildren'), 'db.famConsent.children', 'db.consent.parent'], [T('db.malaffi'), 'db.famConsent.malaffi', 'db.consent.planned'],
    ]
    this.db.consents = cons.map((c) => ({ person: c[0], scope: 'record', shared_with: T(c[1]), status: T(c[2]), changed_at: 'Oct 2026' }))
    this.db.consents.push({ person: person('khalid'), scope: 'family_circle', shared_with: T('db.famConsent.circle'), status: T('db.consent.granted'), changed_at: 'Oct 2026' })
    this.db.consents.push({ person: person('khalid'), scope: 'home_signals', shared_with: T('db.famConsent.signals'), status: T('db.consent.granted'), changed_at: 'Oct 2026' })
    FAMILY_MEMBERS.forEach((m, i) => {
      const p = prof[m.id]
      if (!p.child) this.db.observations.push({ obs_id: 'O-' + this.seq.o++, patient_id: 'FAM-1-' + (i + 1), reading: T(p.tc != null ? 'db.famReadingChol' : 'db.famReading', { sbp: p.sbp, bmi: p.bmi, tc: p.tc, hdl: p.hdl }), source: T(m.dev), measured_at: '14 Oct' })
    })
    FAMILY_SOURCES.forEach((s, i) => this.db.encounters.push({ encounter_id: 'SRC-' + (i + 1), when: T('db.linked'), type: T('db.source'), summary: T(s.note), where: T(s.name) }))
    this.S.dbTab = 'patients'
  }

  /* ---------------------------------------------------------------- setup inputs */
  /**
   * Set one sensor / passport input. Numbers are checked against the plausible range (`SAFETY_RANGES`, `PREV_RANGES`): a value that is
   * missing or out of range is REFUSED (the previous valid value stays), the reason is kept in `snapshot.inputIssues` as a `required`
   * issue until a valid value is entered. `glu` accepts `null` (sensor off).
   */
  setInput(key: keyof SafetyInputs | keyof PrevInputs, value: number | string | boolean | null): InputCheck {
    if (this.S.phase !== 'setup') return { ok: false, value: NaN }
    const S = this.S, I = S.inp as Record<string, unknown>, type = CASES[S.ck].type
    const nk = noteKey(type === 'prev' ? 'prevention' : 'safety', key)
    let res: InputCheck = { ok: true, value: Number(value) }
    if (type === 'safety' && key in SAFETY_RANGES && !(key === 'glu' && value === null)) {
      const f = key as keyof typeof SAFETY_RANGES, c = checkValue(SAFETY_RANGES[f], value)
      res = this.noteInput(nk, c, c.ok ? null : safetyIssue(f, value, c, I[key] as number), I, key)
    } else if (type === 'prev' && (key === 'age' || key === 'overdue' || key === 'rem')) {
      const kind = PV[CASES[S.ck].pv as PvId].kind, c = checkValue(prevRange(key, kind), value)
      res = this.noteInput(nk, c, c.ok ? null : prevIssue(key, kind, value, c, I[key] as number), I, key)
    } else { I[key] = value; delete S.notes[nk] }
    this.emit()
    return res
  }
  private noteInput(nk: string, c: Checked, issue: InputIssue | null, I: Record<string, unknown>, key: string): InputCheck {
    if (c.ok) { I[key] = c.value; delete this.S.notes[nk]; return { ok: true, value: c.value } }
    this.S.notes[nk] = issue!
    return { ok: false, value: c.value, issue: issue! }
  }
  /** The segmented switches: moving/not moving, fall yes/no, glucose sensor on (5.6 mmol/L) or off. */
  setInputToggle(key: 'still' | 'fall' | 'glus', on: boolean) {
    const I = this.S.inp as SafetyInputs
    if (key === 'glus') I.glu = on ? 5.6 : null
    else I[key] = on
    if (key === 'fall' && on && !I.floor) I.floor = 6
    this.emit()
  }
  setNationality(nat: PrevInputs['nat']) { (this.S.inp as PrevInputs).nat = nat; this.emit() }
  /** "Enter your own": choose the person (re-seeds the database). */
  setPerson(pk: PersonId) { this.S.pk = pk; this.seedDb(); this.emit() }
  setStart(min: number) { this.S.start = min; this.S.clock = min; this.emit() }
  setLang(l: Lang) { this.S.lang = l; this.emit() }
  /**
   * The prevention result (the slider of the case, `PV[..].result` min/max/step). A missing or out-of-range value is REFUSED (the
   * previous valid value stays) and reported as a `required` issue on `snapshot.inputIssues`, like `setInput`.
   */
  setResVal(v: number): InputCheck {
    const S = this.S, c = CASES[S.ck]
    if (c.type !== 'prev') { S.resVal = v; this.emit(); return { ok: true, value: v } }
    const res = PV[c.pv as PvId].result, r = { min: res.min, max: res.max, step: res.step }, nk = noteKey('prevention', 'result')
    const k = checkValue(r, v)
    if (k.ok) { S.resVal = k.value; delete S.notes[nk]; this.emit(); return { ok: true, value: k.value } }
    const label = T(res.label)
    const issue: InputIssue = k.kind === 'missing'
      ? { subject: 'prevention', field: 'result', level: 'required', kind: 'missing', message: tx('inputs.missing', { label }), value: null, applied: S.resVal ?? undefined }
      : { subject: 'prevention', field: 'result', level: 'required', kind: 'range', value: Number(v), min: r.min, max: r.max, applied: S.resVal ?? undefined, message: tx('inputs.rejected', { label, value: Number(v), min: r.min, max: r.max, applied: S.resVal }) }
    S.notes[nk] = issue
    this.emit()
    return { ok: false, value: k.value, issue }
  }
  setRecheckVal(v: number) { this.S.rc.val = v; this.emit() }
  setDailyVal(v: number) { this.S.daily.val = v; this.emit() }
  /** A result at the family results step (`member` is a result id such as `khalid_tc`); out of its range it is clamped, with a warning. */
  setFamResult(member: string, v: number): InputCheck {
    const def = FAMILY_RESULTS[member], F = this.F
    if (!def) { F.res[member] = v; this.emit(); return { ok: true, value: v } }
    const r = { min: def.min, max: def.max, step: def.step }, c = checkValue(r, v), nk = noteKey(def.who, 'res.' + member)
    if (c.kind === 'missing') {
      this.S.notes[nk] = { subject: def.who, field: 'res.' + member, level: 'required', kind: 'missing', message: tx('inputs.missing', { label: T(def.label) }), value: null, applied: F.res[member] }
      this.emit()
      return { ok: false, value: NaN, issue: this.S.notes[nk] }
    }
    F.res[member] = c.value
    if (c.ok) delete this.S.notes[nk]
    else this.S.notes[nk] = { subject: def.who, field: 'res.' + member, level: 'recommended', kind: 'range', value: Number(v), min: r.min, max: r.max, applied: c.value, message: tx('inputs.clamped', { label: T(def.label), value: Number(v), min: r.min, max: r.max, applied: c.value }) }
    this.emit()
    return c.ok ? { ok: true, value: c.value } : { ok: false, value: c.value, issue: this.S.notes[nk] }
  }
  setPlanShare(f: 'f1' | 'f2', on: boolean) { this.S.fam[f] = on; this.emit() }
  setNoaTab(t: 'hosp' | 'doh') { this.S.noaTab = t; this.emit() }
  setDbTab(t: DbTable) { this.S.dbTab = t; this.emit() }

  /* ---------------------------------------------------------------- pipeline */
  private flow(list: [number, Txt][]) { this.queue.push(...list) }
  /** Advance the pipeline animation by one half step (a node starts "working", then shows its text). Call every ~220 ms while `busy`. */
  flowTick(): boolean {
    if (this.active) {
      const [i, text] = this.active
      this.S.pipe[i] = { c: 'done', t: text }
      this.active = null
    } else if (this.queue.length) {
      this.active = this.queue.shift()!
      this.S.pipe[this.active[0]] = { c: 'active', t: T('pipe.working') }
    } else return false
    this.emit()
    return this.busy
  }
  /** Run every pending animation step instantly (tests, autopilot without timing). */
  settle() { let n = 0; while (this.busy && n++ < 1000) this.flowTick() }

  /* ---------------------------------------------------------------- safety: playback and decision */
  /** Press Play: start the minute-by-minute playback; then call `playTick()` every 90 ms. */
  play() {
    const S = this.S
    if (S.phase !== 'setup' || this.busy || this.inputIssues().required.length) return
    const I = S.inp as SafetyInputs
    S.phase = 'playing'; S.read = []; S.mv = []; S.pipe = {}
    this.playCtl = { m: 0, end: 10 + Math.max(I.dur, I.fall ? I.floor : 0, 1) + 6, tTrig: null, why: null }
    this.log('WATCH', 'is', T('log.watching', { at: hm(S.start) }))
    this.emit()
  }
  /** One simulated minute. Returns true while the playback continues. */
  playTick(): boolean {
    const S = this.S, ctl = this.playCtl
    if (!ctl || S.phase !== 'playing') return false
    const I = S.inp as SafetyInputs, tr = triggers(I), m = ctl.m
    const on = m >= 10, inRun = on && m < 10 + I.dur
    S.read.push(Math.round(inRun ? I.hr + (this.random() - 0.5) * 6 : (I.still ? 60 : 84) + (this.random() - 0.5) * 5))
    S.mv.push(inRun && !I.still ? 1 : 0)
    S.min = m; S.clock = S.start + m
    if (on) {
      // Same minute: the rule that fires first by priority (R3 before R4) is the one recorded.
      if (m === 10 && tr.hypo) { ctl.tTrig = S.clock; ctl.why = 'R3' }
      else if (m === 10 && tr.hf) { ctl.tTrig = S.clock; ctl.why = 'R4' }
      if (I.fall && m === 12 && tr.fall && ctl.tTrig == null) { ctl.tTrig = S.clock; ctl.why = 'R2' }
      if (runLen(S.read, S.mv) >= 10 && ctl.tTrig == null) { ctl.tTrig = S.clock; ctl.why = 'R1' }
    }
    ctl.m++
    if (ctl.tTrig != null || ctl.m >= Math.min(ctl.end, 40)) this.finishPlay(tr, ctl.tTrig, ctl.why)
    this.emit()
    return S.phase === 'playing'
  }
  private finishPlay(tr: ReturnType<typeof triggers>, tTrig: number | null, why: string | null) {
    const S = this.S, I = S.inp as SafetyInputs
    this.playCtl = null
    if (tTrig == null || why == null) {
      S.phase = 'decided'
      const notes: Txt[] = []
      if (I.hr > 120 && !I.still) notes.push(T('log.noticed.fastMoving'))
      else if (I.hr > 120 && I.dur < 10) notes.push(T('log.noticed.settled', { min: I.dur }))
      if (I.fall && I.floor < 2) notes.push(T('log.noticed.fallUp'))
      const why2 = notes.length ? T('log.noticed.some', { notes: { list: notes, sep: '; ' } }) : T('log.noticed.none')
      S.dec = { path: null, rule: 'R12', name: T('decision.noAction'), standdown: false, why: why2 }
      this.log('WATCH', 'ok', T('log.noRuleMet', { why: why2 }))
      this.audit(this.actor('guardian'), T('audit.noAction'), why2)
      return
    }
    S.tTrig = tTrig; S.trig = tr; S.why1 = why
    S.qk = I.fall && tr.fall ? 'fall' : tr.hypo ? 'hypo' : tr.hf ? 'hf' : 'hr'
    S.clock = tTrig + 1; S.tCheck = S.clock; S.phase = 'check'
    const line = T(`reading.${why}`, { glu: I.glu, wt: I.wt, spo2: I.spo2 })
    const src = I.glu != null && why === 'R3' ? 'source.glucose' : why === 'R4' ? 'source.scale' : 'source.watch'
    this.obs(line, T(src), tTrig)
    this.log('DETECT', 'bad', T('log.detect', { rule: why, reading: line }))
    if (S.pk !== 'mariam' || why !== 'R4') {
      this.log('ALERT', 'is', T('log.alertFamily'))
      this.feed(this.pair(T(this.person.t.f1s!), T(this.person.t.f2s!)), T('feed.safetyAlert'))
    }
    this.log('ASK', 'is', T('log.ask', { q: T(QUESTIONS[S.qk].q) }))
    this.audit(this.actor('guardian'), T('audit.ruleMet', { rule: why }), line)
    this.flow([[0, T('pipe.ruleMet', { rule: why })], [1, T('pipe.voiceCheck')], [2, T('pipe.stored')]])
  }
  /** True when Noa still waits for the answer to its question (speech heard, question not answered). */
  needAns(): boolean { const S = this.S; return !!S.qk && !!S.speech.home?.said && !S.ans }

  /** Take the decision once the speech check and (if asked) the answer are in (rules R5 to R11, or stand down). */
  private decide() {
    const S = this.S
    if (S.phase !== 'check' || !S.speech.home || !S.trig || !S.qk) return
    const sp = S.speech.home, noAns = !sp.said || S.ans === 'none'
    if (!noAns && !S.ans) return
    const path = choosePath(S.trig, sp, S.ans)
    S.clock = (S.tCheck ?? 0) + 2; S.tAct = S.clock; S.phase = 'decided'
    if (!path) {
      S.dec = { path: null, rule: 'R1', name: T('decision.standDown'), standdown: true, why: T('decision.standDownWhy') }
      this.feed(this.pair(T(this.person.t.f1s!), T(this.person.t.f2s!)), T('feed.allClear'))
      this.log('STAND', 'ok', T('log.standDown'))
      this.audit(this.actor('voice'), T('audit.standDown'), T('audit.checkPassed'))
      return
    }
    const j = JOURNEYS[path]
    S.dec = { path, rule: j.rule, name: T(j.name) }; S.path = path
    const em = /_em$/.test(path)
    this.alert(em ? 'red' : 'amber', T(j.name), j.rule, T(alertTeamKey(path)), 'new', S.clock)
    this.log('DECIDE', em ? 'bad' : 'warn', T('log.decide', { rule: j.rule, name: T(j.name) }))
    this.audit(this.actor('noa'), T('audit.decision', { rule: j.rule }), T(j.name))
    this.flow([[4, T('pipe.decided', { rule: j.rule })]])
  }

  /* ---------------------------------------------------------------- speech */
  private spKey(): 'home' | 'daily' { return this.S.step === 0 ? 'home' : 'daily' }
  /** Record a scored speech check (home: step 0, or the daily check) and, at home, try to decide. */
  submitSpeech(res: SpeechResult) {
    const S = this.S, k = this.spKey()
    S.speech[k] = res
    const lvl = T(LEVEL_KEY[res.lvl])
    this.add('checkins', {
      checkin_id: 'C-' + pad2(this.seq.c++), at: clk(S.clock), type: T('db.speechCheck'), result: res.said ? lvl : T('db.noAnswer'),
      detail: res.said ? T(res.secs ? 'db.speechDetailTimed' : 'db.speechDetailTyped', { score: res.score.toFixed(2), matched: res.matched, total: res.total, secs: res.secs ? res.secs.toFixed(1) : '' }) : T('db.noAnswer'), agent: this.actor('voice'),
    })
    this.log('CHECK', res.lvl === 'green' ? 'ok' : res.lvl === 'amber' ? 'warn' : 'bad', res.said ? T('log.speechScored', { level: lvl, score: res.score.toFixed(2) }) : T('log.speechNone'))
    if (k === 'home') { if (!res.said) S.ans = 'none'; this.decide() }
    this.emit()
  }
  /** Score what the person said (`secs` null for typed text) against the target sentence and submit it. */
  private scored(said: string, secs: number | null, mode: SpeechResult['mode']) {
    const target = this.text(sentenceTxt(this.S.lang, this.S.pk))
    this.submitSpeech(scoreSpeech(said, secs, target, this.S.lang, mode))
  }
  /** Resolve a Txt with the engine's own translator and context (speech only needs this). */
  text(x: Txt): string {
    return resolveText(x, this.t, this.ctx())
  }
  spokenSpeech(said: string, secs: number | null) { if (said.trim()) this.scored(said.trim(), secs, 'spoken') }
  typedSpeech(said: string) { if (said.trim()) this.scored(said.trim(), null, 'typed') }
  /** One of the ready-made answers: usual speech, slurred speech, no answer. */
  sampleSpeech(k: SampleKey) {
    const s = samples(this.t, this.S.pk)[k][this.S.lang]
    this.scored(s[0], s[1], 'sample')
  }
  /** Answer Noa's question (fall: ok|cant|none, hypo: drink|confused|none, hf: pillows|rest|fine, hr: fine|none). */
  answer(id: string) {
    const S = this.S
    if (S.phase !== 'check' || !S.qk) return
    const a = QUESTIONS[S.qk].a.find((x) => x.id === id)
    S.ans = id
    this.log('ANSWER', 'is', T('log.answers', { a: a ? T(a.label) : id }))
    this.decide()
    this.emit()
  }

  /* ---------------------------------------------------------------- prevention */
  checkPassport() {
    const S = this.S
    if (S.phase !== 'setup' || !this.isPrev || this.inputIssues().required.length) return
    const I = S.inp as PrevInputs
    const d = dueNow(CASES[S.ck].pv as PvId, I, S.pk)
    S.clock = S.start
    if (!d.ok) {
      S.phase = 'decided'
      S.dec = { path: null, rule: 'P2', name: T('decision.nothingToNudge'), why: d.why }
      this.log('PASSPORT', 'ok', T('log.passportWhy', { why: d.why }))
      this.audit(this.actor('guardian'), 'P2', d.why)
      this.emit()
      return
    }
    S.due = { item: d.item, list: d.list }; S.phase = 'ask'
    this.obs(T(I.overdue ? 'db.dueOverdue' : 'db.due', { item: d.item, n: I.overdue }), T('source.passport'), S.clock)
    this.log('PASSPORT', 'warn', T(I.overdue ? 'log.passportDueOverdue' : 'log.passportDue', { item: d.item, n: I.overdue, rem: I.rem }))
    this.log('ASK', 'is', T('log.askBarrier', { next: I.rem + 1 }))
    this.emit()
  }
  /** "Book it · one tap" (Khalid): check the passport and let Noa pick the personal-reason route (P6) from his history, without a made-up answer from him. */
  oneTapBook() {
    if (this.S.phase === 'setup') this.checkPassport()
    if (this.S.phase === 'ask') this.chooseBarrier('value', false)
  }
  /** The person's answer to the barrier question. `asked` false: Noa chose the route itself (no ANSWER line is logged). */
  chooseBarrier(k: string, asked = true) {
    const S = this.S
    if (S.phase !== 'ask') return
    const e = ENABLER[k]
    S.barrier = k; S.clock = S.start + 3; S.tAct = S.clock; S.phase = 'decided'; S.noaPicked = !asked
    if (asked) this.log('ANSWER', 'is', T('log.barrierAnswer', { a: T(BARRIERS.find((b) => b.id === k)!.label) }))
    else this.log('ROUTE', 'noa', T('log.noaPickedRoute', { rule: e.rule, name: T(e.name) }))
    if (k === 'decline') {
      S.dec = { path: null, rule: 'P8', name: T(e.name), why: T('decision.declineWhy') }
      this.task(S.clock, T('db.choiceRecorded'), T('db.noRemindersUntil', { date: clkDate(S.clock + 129600) }))
      this.log('CHOICE', 'ok', T('log.choiceRecorded'))
      this.emit()
      return
    }
    S.path = 'prev'
    S.dec = { path: 'prev', rule: e.rule, name: T(e.name) }
    this.alert('amber', T('db.itemDue', { item: S.due!.item }), T('db.ruleName', { rule: e.rule, name: T(e.name) }), T('actor.navigator'), 'bookingOffered', S.clock)
    this.log('DECIDE', 'warn', T('log.decidePrev', { rule: e.rule, name: T(e.name) }))
    this.audit(this.actor('noa'), e.rule, T(e.name))
    this.flow([[4, T('pipe.decided', { rule: e.rule })]])
    this.emit()
  }
  /**
   * Adult screening case: the heart forecast shown next to the HbA1c the person enters (fixed demo values for everything but the case's age and the
   * HbA1c, which switches diabetes on from 6.5). `hint` says what moving the HbA1c across 6.5 does. `null` in the other cases.
   */
  prevForecast(): { f: ForecastResult; dm: boolean; hint: Txt } | null {
    if (this.S.ck !== 'ifhas') return null
    const I = this.S.inp as PrevInputs, v = Number(this.S.resVal ?? PV.ifhas.result.def)
    const { f, dm } = ifhasForecast(I.age, v, IFHAS_FORECAST)
    return { f, dm, hint: T(dm ? 'prevention.forecast.dropDm' : 'prevention.forecast.addDm') }
  }
  /** Prevention: send the result the person entered (`resVal`); it is routed by rule P9. */
  sendResult() {
    const S = this.S
    if (S.done[S.step] || !this.isPrev || this.inputIssues().required.length) return
    const st = this.cur(), c = this.pv, v = Number(S.resVal)
    S.clock = this.stepTime(st)
    const r = routeResult(CASES[S.ck].pv as PvId, v)
    S.route = r; S.branch = r.b; S.teachKey = r.teach
    const reading = T(c.result.unit ? 'db.readingUnit' : 'db.reading', { label: T(c.result.label), v, unit: c.result.unit ? T(c.result.unit) : '' })
    this.obs(reading, this.hosp(), S.clock)
    if (r.b === 'refer') {
      this.alert('amber', r.tCap, 'P9', r.team!, 'new', S.clock)
      this.log('ROUTE', 'noa', T('log.routeTo', { label: T(c.result.label), v, team: r.team }))
    } else this.log('ROUTE', 'ok', T('log.routeHealthy', { label: T(c.result.label), v, next: r.next }))
    S.done[S.step] = true
    this.emit()
  }
  referAct() {
    const S = this.S
    if (S.done[S.step] || !this.isPrev || !S.route) return
    const st = this.cur()
    S.clock = this.stepTime(st)
    this.patchLast('alerts', (x) => x.rule === 'P9', { status: T('status.accepted') })
    const refer = T(this.pv.refer)
    this.task(S.clock, T('common.colon', { a: S.route.team, b: S.route.t }), refer)
    this.log('ACCEPT', 'ok', T('log.accepted', { team: S.route.team, what: refer }))
    this.feed(T(this.person.t.f1s!), refer)
    S.done[S.step] = true
    this.emit()
  }

  /* ---------------------------------------------------------------- family */
  famSelect(k: string) { if (this.S.fm) { this.S.fm.sel = k; this.emit() } }
  private badge(k: string) {
    const F = this.F
    if (!F.badges.includes(k)) { F.badges.push(k); this.log('BADGE', 'ok', T('log.badge', { b: T(FAMILY_BADGES[k].label) })) }
  }
  private mname = (k: string): Txt => T(FAMILY_MEMBERS.find((m) => m.id === k)!.name)

  /** The forecast of one member's current profile (see `engine/forecast.ts`). */
  forecast(k: string) { return fcFor(this.F.prof[k]) }

  /** Everything the family screen draws per member, as data (also on `snapshot.family`). */
  familyView(): FamilyView | null {
    const F = this.S.fm
    if (!F) return null
    const v: FamilyView = { forecast: {}, signals: {}, next: {}, age: {}, ifhas: {}, child: {} }
    for (const m of FAMILY_MEMBERS) {
      const p = F.prof[m.id], f = fcFor(p)
      v.forecast[m.id] = f
      v.signals[m.id] = famSignals(F, m.id, f)
      v.next[m.id] = nextAction(F, m.id, f)
      v.age[m.id] = ageText(p)
      v.ifhas[m.id] = ifhasOk(p)
      if (p.child) { const a = wcNext(p, WC_AGES); v.child[m.id] = { next: a, nextName: a == null ? null : wcName(a), done: wcDone(p, WC_AGES), total: WC_AGES.length } }
    }
    return v
  }
  /** Missing or implausible inputs of the running case: `required` blocks the decision (the UI must ask), `recommended` only warns. */
  inputIssues(): InputIssues {
    const S = this.S, c = CASES[S.ck]
    const list: InputIssue[] = []
    if (c.type === 'safety') list.push(...safetyStateIssues(S.inp as SafetyInputs, S.pk))
    else if (c.type === 'prev') list.push(...prevStateIssues(S.inp as PrevInputs, PV[c.pv as PvId].kind))
    else if (S.fm) for (const m of FAMILY_MEMBERS) list.push(...profileStateIssues(m.id, S.fm.prof[m.id]))
    // A refused value (a required note) always wins over a warning for the same field: the "sensor missing" warning must never hide it.
    const blocked = new Set(Object.entries(S.notes).filter(([, n]) => n.level === 'required').map(([k]) => k))
    const kept = list.filter((i) => i.level === 'required' || !blocked.has(noteKey(i.subject, i.field)))
    const seen = new Set(kept.map((i) => noteKey(i.subject, i.field)))
    for (const [k, n] of Object.entries(S.notes)) if (!seen.has(k)) kept.push(n)
    return split(kept)
  }

  /**
   * Noa Forecast keeps each adult's heart-risk alert in step with the profile (prototype syncFc). `ctx`: `live` after every change,
   * `edit` after the judge edited a profile, `results` when the results are sent (then the alert is raised already routed, for booked members).
   * A high risk (20% or more) raises ONE alert (never on top of another open alert, a booking or a "not now"); it is withdrawn when the risk falls.
   */
  private syncFc(ctx: 'live' | 'edit' | 'results') {
    const F = this.F, S = this.S
    for (const m of FAMILY_MEMBERS) {
      const p = F.prof[m.id]
      if (p.child) continue
      const f = fcFor(p), id = 'fc_' + m.id, ex = F.alerts.find((a) => a.id === id)
      const otherOpen = F.alerts.some((a) => a.who === m.id && a.state === 'open' && a.id !== id)
      const team = T(m.id === 'saeed' ? 'family.teams.diabetes' : 'family.teams.doctor')
      if (f.ok && f.cat.id === 'high' && !F.fcNo[m.id]) {
        if (!ex && (ctx === 'results' ? !!F.booked[m.id] : !(otherOpen || F.booked[m.id] || F.declined[m.id]))) {
          const a: FamAlert = { id, who: m.id, lvl: 'red', title: fcAlertTitle(f), why: T('family.alerts.fc.why'), agent: 'forecast', acts: [{ label: T('family.alerts.fc.acts.0'), id: 'fcb_' + m.id }, { label: T('family.alerts.fc.acts.1'), id: 'fcn_' + m.id }], state: 'open' }
          if (ctx === 'results') {
            a.state = 'done'; a.acts = []; a.done = T('family.alerts.fc.doneRouted', { team }); F.status[m.id] = 'care'
            this.alert('red', T(f.lab ? 'db.fcFindingLab' : 'db.fcFindingBmi', { pct: pct(f.r) }), 'F1', team, 'routed', S.clock, T('db.famPatient', { n: this.mname(m.id) }))
          }
          F.alerts.unshift(a)
          this.log('FORECAST', 'warn', T(ctx === 'results' ? 'log.fcHighRouted' : 'log.fcHighOffered', { n: this.mname(m.id), pct: pct(f.r) }))
        }
      } else if (ex && ex.state === 'open') {
        F.alerts.splice(F.alerts.indexOf(ex), 1)
        this.log('FORECAST', 'ok', T('log.fcWithdrawn', { n: this.mname(m.id), risk: f.ok ? pct(f.r) : T('log.fcNotScored') }))
      }
    }
    // alert titles follow the profile (the prototype computes them when it draws them)
    for (const a of F.alerts) {
      if (a.id === 'hind') a.title = childAlertTitle(F.prof.hind)
      else if (a.id.startsWith('fc_')) a.title = fcAlertTitle(fcFor(F.prof[a.who]))
    }
  }

  /** A child's status follows the weeks overdue (prototype famChildSync): overdue while late, due once on time, unless booked or declined. */
  private childSync(k: string) {
    const F = this.F, p = F.prof[k]
    if (!p.child || F.booked[k] || F.declined[k]) return
    if (p.overdueW > 0) F.status[k] = 'overdue'
    else if (F.status[k] === 'overdue') F.status[k] = 'due'
  }
  private fmtField(f: string, v: number): Txt | string {
    const sgn = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x)
    switch (f) {
      case 'age': return T('family.fmt.age', { v })
      case 'sbp': return T('family.fmt.sbp', { v })
      case 'tc': case 'hdl': return T('family.fmt.mmol', { v })
      case 'sbpTrend': return T('family.fmt.sbpTrend', { v: sgn(v) })
      case 'bmiTrend': return T('family.fmt.bmiTrend', { v: sgn(v) })
      case 'ageM': return T('family.fmt.ageM', { v })
      case 'overdueW': return T('family.fmt.overdueW', { v })
      default: return String(v)
    }
  }
  /**
   * Edit one number of a member's profile (the sliders of the family editor): adults `age sbp bmi tc hdl sbpTrend bmiTrend`, children
   * `ageM overdueW`. The value is snapped to the slider step and clamped to its range (FAMILY_RANGES), exactly like the prototype's
   * slider; a clamped value gets a `recommended` issue, a missing one (NaN, null) is refused with a `required` issue.
   * `commit` false while the slider is being dragged (only the tree and the forecast change); `true` on release: the edit is logged,
   * heart-risk alerts are synced. Returns what was applied.
   */
  setProfile(member: string, field: keyof typeof FAMILY_RANGES, value: number, commit = true): InputCheck {
    const F = this.S.fm, p = F?.prof[member]
    if (!F || !p || !(field in FAMILY_RANGES)) return { ok: false, value: NaN }
    const childField = field === 'ageM' || field === 'overdueW'
    if (childField !== !!p.child) return { ok: false, value: NaN }
    const rec = p as unknown as Record<string, number | null>
    const c = checkValue(FAMILY_RANGES[field], value), nk = noteKey(member, field)
    if (c.kind === 'missing') {
      this.S.notes[nk] = familyIssue(member, field, value, c, rec[field] ?? undefined)
      this.emit(false)
      return { ok: false, value: NaN, issue: this.S.notes[nk] }
    }
    rec[field] = c.value
    if (c.ok) delete this.S.notes[nk]
    else this.S.notes[nk] = familyIssue(member, field, value, c, c.value)
    if (p.child) this.childSync(member)
    if (commit) {
      this.log('EDIT', 'is', T('log.editField', { n: this.mname(member), label: T(`family.pfl.${field}`), value: this.fmtField(field, c.value) }))
      this.syncFc('edit')
      this.emit()
    } else this.emit(false)
    return c.ok ? { ok: true, value: c.value } : { ok: false, value: c.value, issue: this.S.notes[nk] }
  }
  /**
   * Switch a yes / no field of an adult: `smoker dm bpTx cvd emirati`, or `labs` (cholesterol measured: on sets total 5.2 and HDL 1.2 mmol/L,
   * off clears both and the BMI score is used). Always logged and synced.
   */
  toggleProfile(member: string, field: 'smoker' | 'dm' | 'bpTx' | 'cvd' | 'emirati' | 'labs') {
    const F = this.S.fm, p = F?.prof[member]
    if (!F || !p || p.child) return
    const a: AdultProfile = p
    if (field === 'labs') { if (a.tc != null) { a.tc = null; a.hdl = null } else { a.tc = 5.2; a.hdl = 1.2 } } else a[field] = !a[field]
    this.log('EDIT', 'is', field === 'labs'
      ? T(a.tc != null ? 'log.editLabsOn' : 'log.editLabsOff', { n: this.mname(member) })
      : T('log.editToggle', { n: this.mname(member), label: T(`family.pfl.${field}`), yn: T(a[field] ? 'common.yes' : 'common.no') }))
    this.syncFc('edit')
    this.emit()
  }
  setSex(member: string, sex: 'M' | 'F') {
    const F = this.S.fm, p = F?.prof[member]
    if (!F || !p || p.child) return
    p.sex = sex
    this.log('EDIT', 'is', T('log.editSex', { n: this.mname(member), sex }))
    this.syncFc('edit')
    this.emit()
  }
  /** "Reset family": every profile back to the start, the "not now" of heart-risk reviews forgotten. */
  resetFamily() {
    const F = this.S.fm
    if (!F) return
    F.prof = structuredClone(FAMILY_PROFILES); F.fcNo = {}
    for (const k of Object.keys(this.S.notes)) if (FAMILY_MEMBERS.some((m) => k.startsWith(m.id + '.'))) delete this.S.notes[k]
    this.log('EDIT', 'is', T('log.editReset'))
    this.syncFc('edit')
    this.emit()
  }

  /**
   * Act on one of Noa's family alerts: `moza_ok`, `book_<member>` (hind, maitha, khalid, amna, saeed, sultan), `keep_amna`, `no_<member>`,
   * and for a heart-risk alert `fcb_<member>` (book the doctor review) / `fcn_<member>` (not now).
   */
  famAct(id: string) {
    const S = this.S, F = S.fm
    if (!F) return
    const A = (a: string) => F.alerts.find((x) => x.id === a) as FamAlert
    const k0 = id === 'moza_ok' ? 'moza' : /^fc[bn]_/.test(id) ? 'fc_' + id.slice(4) : id.replace(/^(book|keep|no)_/, '')
    if (!F.alerts.some((a) => a.id === k0 && a.state === 'open')) return
    const before = famScore(F)
    S.clock = S.start + 5
    const mname = this.mname
    const book = (k: string) => {
      const slot = T(`family.slots.${k}`)
      F.booked[k] = slot; F.status[k] = 'booked'; A(k).state = 'done'; A(k).done = T('family.doneBooked', { slot })
      this.task(S.clock, T('common.colon', { a: mname(k), b: A(k).title }), T('db.bookedSlot', { slot }))
      this.log('BOOK', 'ok', T('log.booked', { n: mname(k), slot }))
      this.feed(mname(k), T('family.doneBooked', { slot }))
    }
    if (id === 'moza_ok') {
      F.status.moza = 'care'; A('moza').state = 'done'; A('moza').done = T('family.doneMoza')
      this.task(S.clock, T('db.mozaDose'), T('db.doneArabic'))
      this.log('ACCEPT', 'ok', T('log.strokeClinicAccepted'))
      this.badge('bp')
    } else if (id === 'book_khalid') { book('khalid'); this.badge('first') }
    else if (id === 'book_sultan') {
      book('sultan'); this.badge('sultan')
      if ((F.prof.khalid as AdultProfile).smoker && !F.conn.includes('C8')) { F.conn.push('C8'); this.log('CONNECT', 'warn', T('log.connectC8')) }
    } else if (id.startsWith('book_')) book(id.slice(5))
    else if (id === 'keep_amna') {
      F.status.amna = 'due'; A('amna').state = 'done'; A('amna').done = T('family.doneKeep')
      this.log('CHOICE', 'ok', T('log.amnaKeeps'))
    } else if (id.startsWith('fcb_')) {
      const k = id.slice(4), a = A('fc_' + k)
      a.state = 'done'; a.done = T('family.alerts.fcb.done')
      if (F.status[k] !== 'booked') F.status[k] = 'care'
      this.task(S.clock, T('common.colon', { a: mname(k), b: T('family.alerts.fcb.task') }), T('db.bookedSunday'))
      this.log('BOOK', 'ok', T('log.fcBooked', { n: mname(k) }))
    } else if (id.startsWith('fcn_')) {
      const k = id.slice(4), a = A('fc_' + k)
      F.fcNo[k] = true; a.state = 'done'; a.done = T('family.alerts.fcn.done')
      this.log('CHOICE', 'ok', T('log.fcNotNow', { n: mname(k) }))
    } else if (id.startsWith('no_')) {
      const k = id.slice(3)
      F.status[k] = 'declined'; F.declined[k] = true; A(k).state = 'done'; A(k).done = T('family.doneDecline')
      this.log('CHOICE', 'ok', T('log.notNow', { n: mname(k) }))
    }
    if (['hind', 'maitha', 'khalid', 'amna'].filter((k) => F.booked[k]).length >= 2) this.badge('trip')
    const d = famScore(F) - before
    if (d) this.log('SCORE', 'ok', T('log.score', { score: famScore(F), d: (d > 0 ? '+' : '') + d }))
    this.emit()
  }
  /**
   * Family step 2: send the results the family entered (one per booked member, ids in FAMILY_RESULTS); each is routed by its threshold.
   * Khalid's cholesterol and blood pressure go into his profile and Noa Forecast recalculates; high-risk members are routed to the doctor;
   * connections C4 (his total cholesterol 7.5 or more) and C5 (his HbA1c referred) can appear. Blocked while a result is missing.
   */
  famSendResults() {
    const S = this.S, F = S.fm
    if (!F || S.done[S.step] || this.inputIssues().required.length) return
    const st = this.cur()
    S.clock = this.stepTime(st)
    const mname = this.mname
    for (const k of Object.keys(FAMILY_RESULTS).filter((x) => F.booked[FAMILY_RESULTS[x].who])) {
      const def = FAMILY_RESULTS[k], who = def.who
      const v = Number(F.res[k] != null ? F.res[k] : def.def)
      F.res[k] = v
      const r = routeFamilyResult(k, v)
      F.routes[k] = r
      const reading = T(def.unit ? 'db.readingUnit' : 'db.reading', { label: T(def.label), v, unit: def.unit ? T(def.unit) : '' })
      this.add('observations', { obs_id: 'O-' + this.seq.o++, patient_id: 'FAM-1', reading, source: T('source.clinic'), measured_at: clk(S.clock) })
      if (r.b === 'refer') {
        F.status[who] = 'care'
        this.alert('amber', r.text, 'P9', r.team!, 'routed', S.clock, T('db.famPatient', { n: mname(who) }))
        this.log('ROUTE', 'noa', T('log.routeTo', { label: T(def.label), v, team: r.team }))
        F.alerts.unshift({ id: 'r_' + k, who, lvl: 'amber', title: r.text, why: T('family.routedWhy', { team: r.team }), agent: 'navigator', acts: [], state: 'done', done: T('family.routedDone', { team: r.team }) })
      } else if (F.status[who] !== 'care') {
        F.status[who] = 'ok'
        if (!r.used) this.log('ROUTE', 'ok', T('log.routeFamilyHealthy', { label: T(def.label), v }))
      }
    }
    if (F.booked.khalid) {
      const p = F.prof.khalid as AdultProfile
      p.tc = F.res.khalid_tc; p.hdl = F.res.khalid_hdl; p.sbp = F.res.khalid_sbp
      if (F.res.khalid_a1c >= 6.5) p.dm = true
      const f = fcFor(p)
      if (f.ok) this.log('FORECAST', 'noa', T('log.fcRecalc', { pct: pct(f.r), cat: f.cat.lower, ha: f.ha === 'atMost30' ? T('forecast.ha.atMost30') : f.ha === 'over100' ? T('forecast.ha.over100') : f.ha }))
      if (f.ok && f.cat.id === 'high' && F.status.khalid !== 'care') F.status.khalid = 'care'
    }
    if (F.booked.sultan) (F.prof.sultan as AdultProfile).sbp = F.res.sultan_sbp
    if (F.booked.maitha && F.res.maitha_a1c >= 6.5) (F.prof.maitha as AdultProfile).dm = true
    if (F.booked.amna && F.res.amna_a1c >= 6.5) (F.prof.amna as AdultProfile).dm = true
    this.syncFc('results')
    if (F.res.khalid_tc >= 7.5 && !F.conn.includes('C4')) {
      F.conn.push('C4')
      F.alerts.unshift({ id: 'c4', who: 'maitha', lvl: 'yellow', title: T('family.c4.t'), why: T('family.c4.why', { conn: T(FAMILY_CONNECTIONS.C4.title), action: T(FAMILY_CONNECTIONS.C4.action) }), conn: ['C4'], agent: 'insight', acts: [], state: 'done', done: T('family.c4.done') })
      this.log('CONNECT', 'warn', T('log.connectC4'))
    }
    const kr = F.routes.khalid_a1c
    if (kr?.b === 'refer' && !F.conn.includes('C5')) {
      F.conn.push('C5')
      F.alerts.unshift({ id: 'c5', who: 'amna', lvl: 'yellow', title: T('family.c5.t'), why: T('family.c5.why', { conn: T(FAMILY_CONNECTIONS.C5.title), action: T(FAMILY_CONNECTIONS.C5.action) }), conn: ['C5'], agent: 'insight', acts: [], state: 'done', done: T('family.c5.done') })
      this.log('CONNECT', 'warn', T('log.connectC5'))
      this.badge('plan')
    }
    if (F.booked.hind) this.badge('hind8')
    if (FAMILY_MEMBERS.filter((m) => { const p = F.prof[m.id]; return !p.child && !p.cvd && p.age >= 30 && p.age <= 74 }).every((m) => (F.prof[m.id] as AdultProfile).tc != null)) this.badge('heart')
    S.pk = 'khalid'; S.resVal = F.res.khalid_a1c ?? null
    S.teachKey = kr ? (kr.b === 'refer' ? (F.res.khalid_a1c >= 6.5 ? 'dm' : 'prev_ref') : 'prev_ok') : 'prev_ok'
    S.route = kr ? { b: kr.b, t: kr.low, tCap: kr.text, team: kr.team, next: T('tokens.nextIfhas'), teach: S.teachKey } : null
    S.done[S.step] = true
    this.emit()
  }

  /* ---------------------------------------------------------------- journey actions */
  private markDone() {
    const S = this.S, st = this.cur()
    S.done[S.step] = true
    if (st.famOnDone && st.fam) this.feed(T(st.fam.who), T(st.fam.text))
  }
  /** Timeline step: reveal the next update. */
  tlNext() {
    const S = this.S, st = this.cur(), it = this.items(st), k = S.prog[S.step] || 0
    if (k >= it.length) return
    const r = it[k]
    S.clock = this.stepTime(st) + r.at
    if (st.mode === 'hosp') this.add('encounters', { encounter_id: 'E-' + pad2(this.seq.e++), when: clk(S.clock), type: T(st.label), summary: T('common.dotPair', { a: r.title, b: r.detail }), where: this.hosp() })
    else this.task(S.clock, r.title, r.detail)
    this.log(st.mode === 'hosp' ? 'RECORD' : 'STEP', st.mode === 'hosp' ? 'noa' : 'is', T('common.dotPair', { a: r.title, b: r.detail }))
    S.prog[S.step] = k + 1
    if (k + 1 >= it.length) {
      this.markDone()
      if (S.step === 1 && S.dec?.path && /_em$/.test(S.dec.path)) this.audit(this.actor('responder'), T('audit.call998'), T('audit.operatorTook'))
    }
    this.emit()
  }
  /** Button step ("act as the care team"). */
  btnAct() {
    const S = this.S, st = this.cur()
    if (S.done[S.step] || this.busy) return
    S.clock = this.stepTime(st)
    this.add('encounters', { encounter_id: 'E-' + pad2(this.seq.e++), when: clk(S.clock), type: T(st.label), summary: T(st.done!), where: this.hosp() })
    this.log('ACT', 'ok', T('common.dotPair', { a: T(st.btn!), b: T(st.done!) }))
    this.audit(this.actor('hospital'), T(st.btn!), T(st.done!))
    this.markDone()
    this.emit()
  }
  /** Send the plan home: the person has chosen (`setPlanShare`) who sees it. */
  sendPlan() {
    const S = this.S, st = this.cur()
    if (S.planSent || this.busy) return
    S.clock = this.stepTime(st) + 20
    const p = this.person
    const names = [S.fam.f1 ? T(p.t.f1s!) : null, S.fam.f2 ? T(p.t.f2s!) : null].filter((x): x is Txt => !!x)
    const shared = names.length === 2 ? this.pair(names[0], names[1]) : names.length === 1 ? names[0] : T('db.nobody')
    this.patchLast('consents', (c) => c.scope === 'family_circle', { shared_with: shared, changed_at: clkDate(S.clock) })
    this.task(S.clock, T('db.planInApp', { text: st.text ? T(st.text) : '' }), T('db.deliveredTo', { who: shared }))
    this.log('CONSENT', 'ok', T('log.chosePlan', { who: shared }))
    S.planSent = true
    if (S.tb === 'ok') this.markDone()
    this.emit()
  }
  /** The explanation to show (prepared text, or the live one the UI set with `applyLiveExplain`). */
  curExplain(): Explain | null {
    const S = this.S, tkey = this.teachKey()
    if (!tkey) return null
    if (S.explain && S.explain.lang === S.lang && S.explain.tkey === tkey) return S.explain
    const n = TEACH[tkey][S.lang]
    return { src: 'prepared', tkey, lang: S.lang, explain: T(n.explain), q: T(n.q), opts: n.opts.map((o) => T(o)), correct: 1, simpler: T(n.simpler), wrong: n.wrong.map((o) => T(o)) }
  }
  /** Which teach set the running journey uses. */
  teachKey() {
    const S = this.S
    if (!S.path) return null
    return S.path === 'prev' || S.path === 'fam' ? S.teachKey || 'prev_ok' : JOURNEYS[S.path].teach
  }
  /** Accept an explanation written live by an AI (validated like the prototype: 3 options, one correct). False when the shape is wrong. */
  applyLiveExplain(r: unknown): boolean {
    const o = r as { explain?: unknown; q?: unknown; opts?: unknown; correct?: unknown; simpler?: unknown } | null
    const tkey = this.teachKey()
    if (!o || !tkey || typeof o.explain !== 'string' || !Array.isArray(o.opts) || o.opts.length !== 3 || !Number.isInteger(o.correct) || (o.correct as number) < 0 || (o.correct as number) > 2) return false
    this.S.explain = { src: 'live', lang: this.S.lang, tkey, explain: o.explain, q: String(o.q || ''), opts: o.opts.map(String), correct: o.correct as number, simpler: String(o.simpler || '') }
    this.S.tb = null; this.S.tbWrong = null
    this.log('AI', 'is', T('log.aiWrote'))
    this.emit()
    return true
  }
  /** Teach-back: the person chose option `j`. */
  answerTeach(j: number) {
    const S = this.S, ex = this.curExplain()
    if (S.tb === 'ok' || !ex) return
    if (j === ex.correct) {
      S.tb = 'ok'
      this.add('checkins', { checkin_id: 'C-' + pad2(this.seq.c++), at: clk(S.clock), type: T('db.teachBack'), result: T('db.passed'), detail: T(S.tbWrong != null ? 'db.secondTry' : 'db.firstTry'), agent: this.actor('coach') })
      this.log('CHECK', 'ok', T(S.tbWrong != null ? 'log.teachBackSecond' : 'log.teachBackPassed'))
      if (S.planSent) this.markDone()
    } else {
      S.tbWrong = j
      this.log('CHECK', 'warn', T('log.teachBackNotYet'))
    }
    this.emit()
  }
  /** Low-sugar recheck: the glucose entered (`setRecheckVal`) 15 minutes later. Two low rechecks escalate to 998 (R6). */
  recheck() {
    const S = this.S
    if (S.done[S.step]) return
    const v = Number(S.rc.val)
    S.rc.n++; S.rc.vals.push(v); S.clock = (S.tAct ?? 0) + 15 * S.rc.n
    this.obs(T('db.glucoseRecheck', { v }), T('source.glucose'), S.clock)
    if (v >= 4) {
      this.log('CHECK', 'ok', T('log.recheckOk', { v }))
      this.feed(T(this.person.t.f1s!), T('feed.sugarBack', { v }))
      this.markDone()
      this.emit()
      return
    }
    if (S.rc.n < 2) { this.log('CHECK', 'warn', T('log.recheckLow', { v })); this.emit(); return }
    this.log('ESCALATE', 'bad', T('log.escalate'))
    S.dec = { path: 'hypo_em', rule: 'R6', name: T(JOURNEYS.hypo_em.name), escalated: true }
    S.path = 'hypo_em'; S.prog = {}; S.done = {}; S.tAct = S.clock
    this.alert('red', T('db.lowNotRecovering'), 'R6', T('teams.emergencyServices'), 'new', S.clock)
    this.emit()
  }
  /** Send today's reading (`setDailyVal`) at the Monitor step. Off target raises an alert for the clinician. */
  sendDaily() {
    const S = this.S, st = this.cur()
    if (S.daily.sent) return
    const meta = this.meta()
    if (!meta.daily) return
    const D = DAILY[meta.daily]
    const v = Number(S.daily.val != null ? S.daily.val : D.def)
    S.daily.val = v; S.clock = this.stepTime(st)
    this.obs(T('db.dailyReading', { label: T(D.label), v, unit: D.unit }), T('source.phoneApp'), S.clock)
    S.daily.sent = true
    const ok = D.ok.op === 'lt' ? v < D.ok.limit : D.ok.op === 'gte' ? v >= D.ok.limit : v <= D.ok.limit
    if (ok) this.log('CHECK', 'ok', T('log.dailyOk', { label: T(D.label), v, unit: D.unit, target: T(D.target) }))
    else {
      S.daily.alert = true
      const finding = T(D.finding, { v })
      this.alert('amber', finding, T('db.target', { t: T(D.target) }), T(D.team), 'new', S.clock)
      this.log('ROUTE', 'noa', T('log.dailyRoute', { finding, team: T(D.team) }))
      this.feed(T('feed.family'), T('feed.sentReadings', { team: T(D.team) }))
    }
    this.emit()
  }
  /** The care team accepts the alert and acts (Monitor follow-up). */
  accept() {
    const S = this.S, st = this.cur()
    if (S.done[S.step]) return
    const meta = this.meta()
    if (!meta.daily) return
    const D = DAILY[meta.daily]
    S.clock = this.stepTime(st)
    this.patchLast('alerts', (x) => this.statusIs(x, 'new') && x.level === 'amber', { status: T('status.accepted') })
    this.task(S.clock, T('db.actClinician', { act: T(D.act) }), T('db.explainedChange'))
    this.log('ACCEPT', 'ok', T('log.clinicAccepted', { team: T(D.team), act: T(D.act) }))
    this.feed(T('feed.family'), T('feed.planChanged'))
    this.markDone()
    this.emit()
  }
  /** Send the monthly report to the Department of Health. */
  report() {
    const S = this.S, st = this.cur()
    if (S.done[S.step] || this.busy) return
    S.clock = this.stepTime(st)
    const R0 = REPORT[this.meta().report]
    this.add('reports', { report_id: 'RPT-2026-10', from: this.hosp(), to: T('db.doh'), pathway: T(R0.title), content: T('db.measuresOnly'), includes_this_case: T('db.yesAnonymous') })
    this.log('POST', 'noa', T('log.reportSent', { title: T(R0.title) }))
    this.audit(this.actor('hospital'), T('audit.monthlyReport'), T(R0.title))
    S.noaTab = 'doh'
    this.markDone()
    this.flow((st.pipe ?? []).map((p): [number, Txt] => [p.node, T(p.text)]))
    this.emit()
  }

  /* ---------------------------------------------------------------- navigation */
  /** Open step `i` (only steps already reached). The first visit starts the pipeline animation. */
  go(i: number) {
    const S = this.S
    if (i > S.max || this.busy) return
    const first = i === S.max && i > 0 && !S.seen[i]
    S.step = i; S.seen[i] = true
    const st = this.cur()
    if (first) {
      S.clock = this.stepTime(st)
      this.fresh = new Set()
      if (st.fam && !st.famOnDone) this.feed(T(st.fam.who), T(st.fam.text))
    }
    S.dbTab = i === 0 ? 'observations' : st.mode === 'hosp' && st.kind === 'tl' ? 'encounters' : AUTO_DB[st.kind] ?? 'audit'
    S.noaTab = st.kind === 'report' && S.done[i] ? 'doh' : 'hosp'
    if (first && st.pipe && st.kind !== 'report') this.flow(st.pipe.map((p): [number, Txt] => [p.node, T(p.text)]))
    this.emit()
  }
  next() {
    if (!this.canNext()) return
    this.S.max = Math.max(this.S.max, this.S.step + 1)
    this.go(this.S.step + 1)
  }
  /** Checklist after the decision ("Right action, right time?"). */
  checks(): Txt[] { return this.isPrev ? prevChecks(this.S) : decisionChecks(this.S) }
  decisionChecks(): Txt[] { return decisionChecks(this.S) }
  prevChecks(): Txt[] { return prevChecks(this.S) }

  /* ---------------------------------------------------------------- autopilot */
  setAuto(on: boolean) { this.S.auto = on; this.emit() }
  /** One tick of "Run it for me". Returns the delay (ms) until the next tick, or null when the run is over. */
  autoStep(): number | null {
    const S = this.S
    if (!S.auto) return null
    if (this.busy) return 400
    const stop = runAutoStep(this)
    if (stop) { S.auto = false; this.emit(); return null }
    return 850
  }
  /** Autopilot only: the answer is already in `S.ans`; decide without the "answer" log line (as the prototype's autoTick does). */
  answerSilently() { this.decide(); this.emit() }
  /** Autopilot only: teach-back marked passed without a check-in row (as the prototype's autoTick does). */
  passTeachBack() { this.S.tb = 'ok'; this.log('CHECK', 'ok', T('log.teachBackPassedAuto')); this.emit() }
  /** Fast-forward every pending animation and playback (what the timers would do). */
  drain() {
    let n = 0
    while ((this.S.phase === 'playing' || this.busy) && n++ < 5000) { if (this.S.phase === 'playing') this.playTick(); else this.flowTick() }
  }
  /** Used by the autopilot: the case definition. */
  get caseDef() { return CASES[this.S.ck] }
  get pvDef() { return this.pv }
}
