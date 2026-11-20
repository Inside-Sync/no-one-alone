import i18next from 'i18next'
import { AGENTS } from '../data/agents'
import { EDIT_RANGES, GENOMIC, PEOPLE, PROFILES0, RECORDS, REL, STATUS0, bmiOf, cloneProfiles, type EditField, type ToggleField } from '../data/people'
import { PROGRAMME_COUNT, DEFAULT_TIME, ESCALATE_UP_TO, TIME_IDS } from '../data/programmes'
import { SEEDED_NOTES, testCase, type TestCase, type TestCaseAnswers } from '../data/testCases'
import { CHILD_DEV_UNDER_MONTHS, CHOICES, DIN_ROUNDS, FREE_TEXT, HYPO_RECHECK, SAMPLES, SENTENCE, type ChoiceQid, type QVals } from '../data/tests'
import { CLOCK_START, STAGE_MINUTES, WAIT, writingMs } from '../data/thresholds'
import type { AdultProfile, AgentId, ChildProfile, FhIcon, FhParams, Mode, NoaLang, PersonId, Profile, QsetId, RuleId, SampleKey, StageId, TestCaseId, TimeId, Tone, Txt, VtId } from '../data/types'
import { PERSON_IDS, RULE_IDS } from '../data/types'
import { FIXED_CALL, GUARD_REASONS, PREPARED_REASONS, PreparedAi, SAY_CALLS, UNDERSTAND_TIER, guard, moreUrgent, type NoaAi, type SayCallId, type SayRequest } from './ai'
import { detectFlags, famWorking, joinedTitles, scrCounts, scrStatus, signalRules, topFlags, urgentOf, type FamRow, type Flag, type Signal } from './flags'
import { forecast, pct, riskTone } from './framingham'
import { dinDefaults, qsetDefaults, qsetItems, scoreDin, scoreQ, selectTests, type DinResult, type QResult, type TestPlan } from './home'
import { buildPath, leadItem, urgencyIndex, type HomeAnswers, type Pathway } from './pathway'
import { patternCards } from './pattern'
import { SCENARIOS, SCENARIO_FIELDS, whatIf, type ScenarioId, type WhatIf } from './whatif'
import { instantScheduler, type Scheduler } from './scheduler'
import { scoreSpeech, type SpeechHow, type SpeechResult } from './speech'
import { FH_NS, fixed, hhmm, lc, list, resolveText, tx } from './text'
import type { AnswerValue, Card, ChoiceOption, Counters, FeedItem, GovCounters, HandoffLog, HeartPill, JourneyView, Note, PacketLine, ProtectValue, Snapshot, Source, SpeechValue, Status } from './types'

/**
 * The family-health journey engine: Detect → Protect → Home screening → (emergency stop) → Right pathway → Referral, exactly as
 * the prototype panel (noa.js) runs it, with the prototype bugs B1, B2, B6–B12 fixed (see the plan, section 5).
 *
 * A store like the Test case engine: `subscribe` / `getSnapshot` (a new immutable snapshot per change). Pure TypeScript: waits go
 * through the injected `Scheduler`, words through the `NoaAi` port, the clock is simulated. Every run has its own cancel token;
 * Reset, "Choose someone else" and starting another person cancel the running journey (B2).
 */
export interface EngineOptions {
  ai?: NoaAi
  /** Default: no waits (tests). The app passes `realScheduler({ reducedMotion })`. */
  scheduler?: Scheduler
  /** Resolves a descriptor in a language, for the AI port's facts and fallback. Default: the i18next `familyHealth` namespace. */
  translate?: (x: Txt | string | number | null | undefined, lang: NoaLang) => string
  /** "Noa speaks" language at the start. */
  lang?: NoaLang
  /** Seed the three family messages of the prototype (default true). */
  seedNotes?: boolean
}

class Cancelled extends Error { constructor() { super('journey cancelled') } }
interface Run { cancelled: boolean }
interface Pending { card: Card; item: Extract<FeedItem, { kind: 'card' }>; resolve: (v: unknown) => void; reject: (e: unknown) => void }
interface Journey {
  k: PersonId
  stage: StageId | null
  seen: StageId[]
  branch: 'em' | null
  done: Txt | null
  sig: Signal[]
  urgent: Signal | null
  flagList: Flag[]
  ans: HomeAnswers & Record<string, string | boolean | undefined>
  vt: Partial<Record<VtId, { txt: Txt; lvl: string; score?: number; refer?: boolean }>>
  tests: TestPlan | null
  speech: SpeechResult | null
  spN: number
  path: Pathway | null
  genomic: boolean
  share: PersonId[]
  tc: TestCaseId | null
}
interface ChoiceResult { id: string; label: Txt }

/** The AI port's question for each free-text card (English, for the model; prototype `free.q`). */
const FREE_QUESTION: Record<string, string> = {
  rf: 'Right now: face or arm weakness, chest pain, faint, just pounding heart, or none?',
  sym: 'Has the person noticed thirst/tiredness/frequent urination, blood in stool or bowel change, a breast lump, chest tightness on exertion, or none?',
  pref: 'How does the person want to do the checks: one visit, home kits, or a female clinician?',
  time: 'When suits the person: weekday evening, Saturday morning, weekday morning, or after 15:30?',
  book: 'The person was offered a screening pathway. Did they accept, ask to change the time, ask why, or say not now?',
  words: 'How many words does the child use?',
}

const defaultTranslate = (x: Txt | string | number | null | undefined, lang: NoaLang): string => {
  const t = i18next.getFixedT(lang, FH_NS) as unknown as (k: string, o?: Record<string, unknown>) => string
  return resolveText(x, (k) => t(k, { skipInterpolation: true }), lang)
}

const name = (k: PersonId): Txt => tx(`people.${k}.name`)
const call = (k: PersonId): Txt => tx(`people.${k}.call`)
const status0 = (k: PersonId): Status => ({ label: tx(`status0.${k}`), tone: STATUS0[k] })
const isAdult = (p: Profile): p is AdultProfile => !p.child

export class FamilyHealthEngine {
  /** A live AI port (anything but `PreparedAi`), or null; the header chip switches it on and off. */
  private liveAi: NoaAi | null
  private aiEnabled = true
  private readonly prepared = new PreparedAi()
  private get ai(): NoaAi { return this.liveAi && this.aiEnabled ? this.liveAi : this.prepared }
  private scheduler: Scheduler
  private translate: (x: Txt | string | number | null | undefined, lang: NoaLang) => string
  private listeners = new Set<() => void>()
  private version = 0
  private snap: Snapshot | null = null
  private idleWaiters: (() => void)[] = []

  private lang: NoaLang
  private profiles: Record<PersonId, Profile> = cloneProfiles()
  private status: Record<PersonId, Status> = Object.fromEntries(PERSON_IDS.map((k) => [k, status0(k)])) as Record<PersonId, Status>
  /** Khalid's genomic result was shared at a referral: relatives' family rules use it (prototype L.flags.fhShared). */
  private fhShared = false
  private j: Journey | null = null
  private feed: FeedItem[] = []
  private pending: Pending | null = null
  private hand: HandoffLog[] = []
  private rulesHit = new Map<RuleId, number>()
  private active: AgentId | null = null
  private calls: Counters = { live: 0, prepared: 0, guardrail: 0, overruled: 0 }
  private gov: GovCounters = { journeys: 0, booked: 0, barriers: 0, referrals: 0, notNow: 0, emergencies: 0, handoffs: 0 }
  private clock = CLOCK_START
  private notes: Note[] = []
  private tc: TestCase | null = null
  private run: Run = { cancelled: true }
  private running = false
  private aiBusy = false
  private nextId = 0

  constructor(opts: EngineOptions = {}) {
    this.liveAi = opts.ai && !(opts.ai instanceof PreparedAi) ? opts.ai : null
    this.scheduler = opts.scheduler ?? instantScheduler
    this.translate = opts.translate ?? defaultTranslate
    this.lang = opts.lang ?? 'en'
    if (opts.seedNotes !== false) for (const n of SEEDED_NOTES) this.notify(n.to, tx(`notes.seed.${n.id}`), n.icon, false)
  }

  /* ================================================================ store */
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  getSnapshot = (): Snapshot => {
    if (this.snap) return this.snap
    const feed = structuredClone(this.feed)
    const pend = this.pending ? feed.find((f) => f.id === this.pending?.item.id) : null
    const j = this.j
    const journey: JourneyView | null = j ? { person: j.k, stage: j.stage, seen: j.seen.slice(), branch: j.branch, done: j.done, testCase: j.tc, genomic: j.genomic, share: j.share.slice(), urgent: j.urgent?.rule ?? null } : null
    const heart = Object.fromEntries(PERSON_IDS.map((k) => {
      const f = forecast(this.profiles[k])
      return [k, f.ok ? { pct: pct(f.r), cat: f.cat, tone: riskTone(f.cat) } as HeartPill : null]
    })) as Record<PersonId, HeartPill | null>
    this.snap = {
      version: this.version,
      lang: this.lang,
      clock: this.clock,
      time: hhmm(this.clock),
      journey,
      feed,
      pending: pend && pend.kind === 'card' ? pend.card : null,
      canNext: !!this.pending,
      busy: this.running && !this.pending,
      emergency: j?.branch === 'em',
      active: this.active,
      hand: structuredClone(this.hand),
      rulesHit: [...this.rulesHit].map(([rule, count]) => ({ rule, count })),
      calls: { ...this.calls },
      gov: { ...this.gov },
      status: structuredClone(this.status),
      heart,
      profiles: structuredClone(this.profiles),
      notes: structuredClone(this.notes),
      unread: this.notes.filter((n) => !n.read).length,
      thinking: this.aiBusy,
      ai: !this.liveAi ? 'none' : this.aiEnabled ? 'live' : 'off',
    }
    return this.snap
  }
  /** The header chip: switch a live AI port off (prepared text) or back on. No effect without a live port. */
  setAiEnabled(on: boolean) { if (!this.liveAi || this.aiEnabled === on) return; this.aiEnabled = on; this.emit() }
  /** True while the AI port is answering (the UI shows "thinking…"). */
  get thinking(): boolean { return this.aiBusy }
  private emit() {
    this.version++
    this.snap = null
    this.listeners.forEach((l) => l())
    if (!this.running || this.pending) { const w = this.idleWaiters; this.idleWaiters = []; w.forEach((r) => r()) }
  }
  /** Resolves when the journey waits for an answer, has finished or was cancelled (tests and scripted demos). */
  whenIdle(): Promise<void> {
    if (!this.running || this.pending) return Promise.resolve()
    return new Promise((r) => this.idleWaiters.push(r))
  }

  /* ================================================================ commands */
  /** "Noa speaks": the agents' language, the speech sentence and samples. */
  setLang(lang: NoaLang) { this.lang = lang; this.emit() }

  /** Start (or re-run) a journey for a person with their current data and no test-case answers (tree node, drawer). */
  startJourney(k: PersonId): Promise<void> {
    this.tc = null
    return this.begin(k)
  }
  /** Load a quick test case: the person's start data plus the preset, and the case's default answers. */
  runTestCase(id: TestCaseId): Promise<void> {
    const t = testCase(id)
    const base = structuredClone(PROFILES0[t.person])
    const p = { ...base, ...t.preset } as Profile
    if (isAdult(p)) p.bmi = bmiOf(p)
    this.profiles[t.person] = p
    this.tc = t
    return this.begin(t.person)
  }
  /** "Choose someone else": end the journey view (notifications stay). */
  clearJourney() {
    this.cancel()
    if (this.j && !this.j.done) this.status[this.j.k] = status0(this.j.k)
    this.j = null
    this.feed = []
    this.hand = []
    this.rulesHit = new Map()
    this.active = null
    this.emit()
  }
  /** Reset everything except the family messages and the "Noa speaks" language (B1: messages live outside the journey). */
  reset() {
    this.cancel()
    this.profiles = cloneProfiles()
    this.status = Object.fromEntries(PERSON_IDS.map((k) => [k, status0(k)])) as Record<PersonId, Status>
    this.fhShared = false
    this.j = null
    this.feed = []
    this.hand = []
    this.rulesHit = new Map()
    this.active = null
    this.calls = { live: 0, prepared: 0, guardrail: 0, overruled: 0 }
    this.gov = { journeys: 0, booked: 0, barriers: 0, referrals: 0, notNow: 0, emergencies: 0, handoffs: 0 }
    this.clock = CLOCK_START
    this.tc = null
    this.emit()
  }

  /** Answer the open card. Values: choice option id; protect {genomic, contacts}; speech {said, secs, how}; qset answers; din digits. */
  answer(cardId: number, value: AnswerValue): boolean {
    const p = this.pending
    if (!p || p.card.id !== cardId) return false
    const c = p.card
    if (c.type === 'choice' && typeof value === 'string') return this.pickChoice(value)
    if (c.type === 'protect' && typeof value === 'object' && !Array.isArray(value) && 'contacts' in value) return this.confirmProtect(value as ProtectValue)
    if (c.type === 'speech' && typeof value === 'object' && !Array.isArray(value) && 'said' in value) { const v = value as SpeechValue; return this.submitSpeech(v.said, v.secs, v.how) }
    if (c.type === 'qset' && typeof value === 'object' && !Array.isArray(value)) return this.answerQset({ ...c.vals, ...(value as QVals) })
    if (c.type === 'din' && Array.isArray(value)) return this.answerDin(value)
    if (c.type === 'go' && typeof value === 'string') return this.answerGo(value)
    return false
  }
  /** Next ▸ (or →): answer the open card with its default (the test case's answer, the person's default, or what is on the card). */
  next(): boolean {
    const p = this.pending
    if (!p) return false
    const c = p.card
    if (c.type === 'choice') return this.pickChoice(c.opts.some((o) => o.id === c.def) ? c.def : c.opts[0].id)
    if (c.type === 'protect') return this.confirmProtect({ genomic: c.gen, contacts: c.sel.slice() })
    if (c.type === 'speech') {
      const sq = this.tc && this.j && this.tc.person === this.j.k ? this.tc.answers.speech : undefined
      const key: SampleKey = Array.isArray(sq) ? sq[Math.min(this.j?.spN ?? 0, sq.length - 1)] : (sq ?? 'usual')
      return this.useSample(key)
    }
    if (c.type === 'qset') return this.answerQset(c.vals)
    if (c.type === 'go') return this.answerGo('go', true)
    return this.answerDin(c.answers)
  }
  /** Edit the open card before confirming (protect checkboxes, questionnaire answers, digits). */
  updateCard(cardId: number, patch: { gen?: boolean; sel?: PersonId[]; vals?: QVals; answers?: string[] }): boolean {
    const p = this.pending
    if (!p || p.card.id !== cardId) return false
    const c = p.card
    if (c.type === 'protect') { if (patch.gen != null && c.genomic) c.gen = patch.gen; if (patch.sel) c.sel = patch.sel.filter((k) => c.contacts.includes(k)) }
    if (c.type === 'qset' && patch.vals) c.vals = { ...c.vals, ...patch.vals }
    if (c.type === 'din' && patch.answers) c.answers = patch.answers.slice(0, DIN_ROUNDS.length)
    this.emit()
    return true
  }
  /** Use one of the speech samples (usual, slightly slurred, clearly slurred) in the current "Noa speaks" language. */
  useSample(key: SampleKey): boolean {
    const s = SAMPLES[key][this.lang]
    return this.submitSpeech(s[0], s[1], 'sample')
  }
  /** What the person said for the speech check (typed: no time; spoken: seconds from the microphone). */
  submitSpeech(said: string, secs: number | null, how: SpeechHow): boolean {
    const p = this.pending
    if (!p || p.card.type !== 'speech' || !this.j) return false
    this.j.spN++
    const r = scoreSpeech(said, secs, this.lang, how)
    p.card.result = r
    const level = tx(`speech.level.${r.lvl}`)
    this.add({ kind: 'me', who: tx('me.speechWho', { name: name(this.j.k), how: tx(`speech.how.${how}`) }), text: said || '…', chip: tx(secs ? 'me.speechChipSecs' : 'me.speechChip', { level, score: fixed(r.score, 2), m: r.matched, total: r.total, secs: secs ? fixed(secs, 1) : null }) })
    this.close(tx('card.speech.picked', { how: tx(`speech.how.${how}`), level }), r)
    return true
  }
  /**
   * The composer: a typed speech answer, a free-text reply to a card that accepts one (read by `NoaAi.understand`), or a question
   * to Noa (answered by the agent holding the case, or Coach).
   */
  async reply(text: string): Promise<void> {
    text = text.trim()
    if (!text) return
    const p = this.pending
    if (p && p.card.type === 'speech') { this.submitSpeech(text, null, 'typed'); return }
    const run = this.run
    if (p && p.card.type === 'choice' && p.card.free) {
      const c = p.card
      this.add({ kind: 'me', who: c.who, text, chip: null })
      this.aiBusy = !(this.ai instanceof PreparedAi)
      this.emit()
      let u: { choice: string; summary: string; source: 'live' | 'keyword' }
      const qid = c.qid === 'time2' ? 'time' : c.qid
      const keyword = await this.prepared.understand({ tier: UNDERSTAND_TIER, qid, question: '', options: [], reply: text, lang: this.lang })
      try {
        // understand(): `question` is the card's question in plain English, `options` its choices in the "Noa speaks" language.
        u = await this.ai.understand({ tier: UNDERSTAND_TIER, qid, question: FREE_QUESTION[c.qid] ?? '', options: c.opts.map((o) => ({ id: o.id, label: this.str(o.label) })), reply: text, lang: this.lang })
      } catch {
        u = keyword
      }
      this.aiBusy = false
      if (this.pending !== p || run.cancelled) { this.emit(); return }
      if (u.source === 'live') this.calls.live++
      else this.calls.prepared++
      // The engine, not the model, keeps the choice valid and safe: an answer outside the options falls back to the keyword reading,
      // and on the risky questions (red flags, symptoms, a child's words) the more urgent of the two readings wins.
      const valid = (x: string) => c.opts.some((o) => o.id === x)
      // A missing or invalid model choice is never taken as an answer (on rf, 'none' would mean "no red flags"): the keyword
      // reader decides, and the reply is shown as read by keywords.
      const byAi = u.source === 'live' && valid(u.choice)
      let pick = byAi ? u.choice : keyword.choice
      if (byAi && valid(keyword.choice)) pick = moreUrgent(qid, pick, keyword.choice)
      const id = valid(pick) ? pick : c.def
      const label = (c.opts.find((o) => o.id === id) as ChoiceOption).label
      const summary = byAi ? u.summary : ''
      this.add({ kind: 'sys', icon: byAi ? 'bot' : 'type', text: tx(byAi ? (summary ? 'sys.readAiSummary' : 'sys.readAi') : (summary ? 'sys.readKeywordSummary' : 'sys.readKeyword'), { label, summary }) })
      this.pickChoice(id, byAi ? 'ai' : 'keywords')
      return
    }
    const k: PersonId = this.j?.k ?? 'khalid'
    const qrun: Run = this.running ? run : { cancelled: false }
    const agent: AgentId = this.active && this.active !== 'orch' ? this.active : 'coach'
    this.add({ kind: 'me', who: name(k), text, chip: null })
    const emergency = /weak|speech|chest|faint|pain/.test(text.toLowerCase())
    try {
      // say(): a question typed in the composer. facts: name, question, journey_stage. Emergency words get the fixed safety line,
      // which never goes through the AI port (`fixed`).
      await this.say(qrun, agent, { callId: 'composer.reply',
        fixed: emergency, emergency: tx('coach.emergency'),
        facts: { name: this.str(name(k)), question: text, journey_stage: this.j?.stage ?? null },
        audience: this.str(name(k)),
        task: 'Answer the person’s question briefly, within your role. If it needs a clinician, say so and offer to book. If it sounds like an emergency (weakness, speech trouble, chest pain, fainting), tell them to see a doctor immediately at the emergency department.',
        fallback: emergency ? tx('coach.emergency') : tx('coach.pass', { doctor: tx(`people.${k}.doc`) }),
      })
    } catch (e) { if (!(e instanceof Cancelled)) throw e }
  }

  /* ---------------------------------------------------------------- record drawer and "Try different data" */
  /** Change one number of a person's data (the drawer's "Try different data"). Out of range: refused. Re-run to use it. */
  editProfile(k: PersonId, field: EditField, value: number): { ok: boolean; min: number; max: number } {
    const r = EDIT_RANGES[field], p = this.profiles[k]
    const ok = Number.isFinite(value) && value >= r.min && value <= r.max && (field === 'ageM' || field === 'overdueW' ? !!p.child : !p.child)
    if (ok) {
      (p as unknown as Record<string, number>)[field] = value
      if (isAdult(p) && (field === 'wt')) p.bmi = bmiOf(p)
      this.emit()
    }
    return { ok, min: r.min, max: r.max }
  }
  /** Switch Smokes / BP tablets / Diabetes for an adult. */
  toggleProfile(k: PersonId, field: ToggleField): boolean {
    const p = this.profiles[k]
    if (!isAdult(p)) return false
    p[field] = !p[field]
    this.emit()
    return p[field]
  }
  /** "Try it": a scenario's readings (racing heart, BP crisis…), or `normal` to put the readings back to the person's own. */
  applyScenario(k: PersonId, id: ScenarioId): boolean {
    const p = this.profiles[k]
    if (!isAdult(p)) return false
    const patch = SCENARIOS[id]
    if (patch) Object.assign(p, patch)
    else {
      const base = PROFILES0[k] as AdultProfile
      for (const f of SCENARIO_FIELDS) (p as unknown as Record<string, unknown>)[f] = base[f]
    }
    p.bmi = bmiOf(p)
    this.emit()
    return true
  }
  /** "Try it" Reset: the person's data back to the start (nothing else changes; re-run to use it). */
  resetProfile(k: PersonId) {
    const p = structuredClone(PROFILES0[k])
    if (isAdult(p)) p.bmi = bmiOf(p)
    this.profiles[k] = p
    this.emit()
  }
  /** What Noa would do with a person's current readings (the "Try it" answer card). */
  whatIf(k: PersonId): WhatIf {
    const m = PEOPLE[k]
    return whatIf(k, this.profiles[k], this.fam(k), name(k), m.child ? name(m.parent as PersonId) : null)
  }
  /** Everything the record drawer shows for a person (texts are descriptors; the UI adds its labels). */
  recordView(k: PersonId) {
    const p = this.profiles[k], m = PEOPLE[k], scr = scrStatus(k, p), counts = scrCounts(scr)
    return {
      person: k, icon: m.icon, child: m.child, profile: structuredClone(p),
      age: p.child ? (p.ageM < 24 ? tx('age.months', { n: p.ageM }) : tx('age.years', { n: Math.floor(p.ageM / 12) })) : tx('age.years', { n: p.age }),
      sex: tx(p.child ? (m.sex === 'F' ? 'sex.F' : 'sex.M') : (p.sex === 'F' ? 'sex.F' : 'sex.M')),
      bmi: p.child ? null : bmiOf(p),
      overdue: counts.overdue, due: counts.due, status: this.status[k], current: this.j?.k === k,
      screening: scr, family: famWorking(k, this.profiles, this.famCtx()),
      genomic: RECORDS[k].genomic, pref: RECORDS[k].pref,
      heart: forecast(p),
    }
  }

  /* ---------------------------------------------------------------- family messages */
  markNotesRead() { this.notes.forEach((n) => { n.read = true }); this.emit() }
  /** Ask Noa in the family messages panel. */
  async askNoa(text: string): Promise<void> {
    text = text.trim()
    if (!text) return
    this.notes.unshift({ id: ++this.nextId, to: 'me', icon: 'message-circle', text, t: hhmm(this.clock), read: true })
    this.emit()
    const j = this.j
    const fallback = /slur|speech|weak|chest|confus|faint/i.test(text) ? tx('chat.emergency')
      : j ? tx('chat.working', { name: name(j.k), stage: j.stage ? lc(tx(`stages.${j.stage}.name`)) : tx('chat.starting') }) : tx('chat.idle')
    let out: string | Txt = fallback
    // Emergency words: the fixed safety line only, never the AI port.
    if (/slur|speech|weak|chest|confus|faint/i.test(text)) { this.notify('noa', out, 'bot', true); return }
    try {
      // say(): the family messages panel. facts: recent notifications ("To <name>: <text>", newest first, at most 6).
      const r = await this.ai.say({
        callId: 'family.chat', tier: SAY_CALLS['family.chat'].tier, skill: 'familyChat', domain: 'care', audience: 'Moza’s family', lang: this.lang, maxWords: 45,
        facts: { notifications: this.notes.filter((n) => n.to !== 'me' && n.to !== 'noa').slice(0, 6).map((n) => `To ${this.str(name(n.to as PersonId))}: ${this.str(n.text)}`), question: text },
        task: 'Answer the family’s question in at most 45 plain words. Never diagnose or name a dose; a doctor decides treatment; for stroke signs, chest pain or confusion advise seeing a doctor immediately.',
        fallback: this.str(fallback),
      })
      if (r.source === 'live' && !guard(r.text)) out = r.text
      else if (r.source === 'guardrail' && r.reason === 'emergency') out = tx('chat.emergency')
    } catch { /* prepared text */ }
    this.notify('noa', out, 'bot', true)
  }

  /* ================================================================ internals: feed, cards, agents */
  private str(x: Txt | string | number | null | undefined): string { return this.translate(x, this.lang) }
  private add<T extends Omit<FeedItem, 'id' | 't'>>(o: T): FeedItem {
    const it = { ...o, id: ++this.nextId, t: hhmm(this.clock) } as unknown as FeedItem
    this.feed.push(it)
    this.emit()
    return it
  }
  private hit(rule: RuleId) { this.rulesHit.set(rule, (this.rulesHit.get(rule) ?? 0) + 1) }
  private setSt(k: PersonId, key: string, tone: Tone, p?: FhParams) { this.status[k] = { label: tx(key, p), tone } }
  private notify(to: PersonId | 'noa', text: Txt | string, icon: FhIcon, emit = true) {
    this.notes.unshift({ id: ++this.nextId, to, icon, text, t: hhmm(this.clock), read: false })
    if (emit) this.emit()
  }
  private live(run: Run) { if (run.cancelled) throw new Cancelled() }
  private async wait(run: Run, ms: number) { await this.scheduler.wait(ms); this.live(run) }
  private cancel() {
    this.run.cancelled = true
    const p = this.pending
    this.pending = null
    this.running = false
    this.aiBusy = false
    if (p) p.reject(new Cancelled())
  }
  private famCtx() { const j = this.j; return { fhShared: this.fhShared || !!(j && j.k === 'khalid' && j.genomic && j.share.length) } }
  private fam(k: PersonId): FamRow[] { return famWorking(k, this.profiles, this.famCtx()) }
  private stage(k: StageId) {
    const j = this.j as Journey
    this.clock += STAGE_MINUTES[k] * 60000
    j.stage = k
    if (!j.seen.includes(k)) j.seen.push(k)
    this.add({ kind: 'stage', stage: k })
  }
  private finish(run: Run, text: Txt) {
    if (run.cancelled || !this.j) return
    this.j.done = text
    this.add({ kind: 'done', text })
    this.active = null
    this.running = false
    this.emit()
  }

  /** Ask a card and wait for its answer. A test case's answer for this question becomes the card default. */
  private ask<T>(run: Run, card: Card): Promise<T> {
    this.live(run)
    if (card.type === 'choice' && this.tc && this.j && this.tc.person === this.j.k) {
      const v = (this.tc.answers as TestCaseAnswers)[card.qid]
      if (typeof v === 'string' && card.opts.some((o) => o.id === v)) card.def = v
    }
    return new Promise<T>((resolve, reject) => {
      const item = this.add({ kind: 'card', card, open: true, picked: null }) as Extract<FeedItem, { kind: 'card' }>
      this.pending = { card, item, resolve: resolve as (v: unknown) => void, reject }
      this.emit()
    })
  }
  private close(picked: Txt, value: unknown) {
    const p = this.pending
    if (!p) return
    this.pending = null
    p.item.open = false
    p.item.picked = picked
    this.emit()
    p.resolve(value)
  }
  private pickChoice(id: string, readBy?: 'ai' | 'keywords'): boolean {
    const p = this.pending
    if (!p || p.card.type !== 'choice') return false
    const c = p.card, o = c.opts.find((x) => x.id === id)
    if (!o) return false
    if (!readBy) this.add({ kind: 'me', who: c.who, text: o.label, chip: null })
    this.close(readBy ? tx(readBy === 'ai' ? 'card.choice.readAi' : 'card.choice.readKeywords', { label: o.label }) : o.label, { id, label: o.label } satisfies ChoiceResult)
    return true
  }
  private confirmProtect(v: ProtectValue): boolean {
    const p = this.pending
    if (!p || p.card.type !== 'protect') return false
    const c = p.card, contacts = v.contacts.filter((k) => c.contacts.includes(k)), gen = c.genomic ? !!v.genomic : false
    const names = contacts.length ? list(contacts.map(name), ', ') : tx('common.nobody')
    this.close(tx(c.genomic ? (gen ? 'card.protect.pickedOn' : 'card.protect.pickedOff') : 'card.protect.picked', { names }), { genomic: gen, contacts })
    return true
  }
  private answerQset(vals: QVals): boolean {
    const p = this.pending
    if (!p || p.card.type !== 'qset') return false
    const c = p.card
    c.vals = { ...vals }
    const r = scoreQ(c.test, c.items, c.vals)
    this.close(tx('card.qset.picked', { test: tx(`vt.${c.test}.name`), result: r.txt }), r)
    return true
  }
  /** The go card: a button picks its own label; Next ▸ starts it ("Started", as the prototype). */
  private answerGo(id: string, byNext = false): boolean {
    const p = this.pending
    if (!p || p.card.type !== 'go') return false
    const o = p.card.opts.find((x) => x.id === id)
    if (!o) return false
    this.close(byNext ? tx('card.go.started') : o.label, id)
    return true
  }
  private answerDin(answers: string[]): boolean {
    const p = this.pending
    if (!p || p.card.type !== 'din') return false
    p.card.answers = answers.slice(0, DIN_ROUNDS.length)
    const r = scoreDin(p.card.answers)
    this.close(tx('card.din.picked', { n: r.n }), r)
    return true
  }
  private choiceCard(qid: ChoiceQid, who: Txt, q: Txt, ids: readonly string[], def: string): Card {
    const opts = ids.map((id) => ({ id, label: qid === 'time' || qid === 'time2' ? tx(`times.${id}`) : tx(`choice.${qid}.opt.${id}`) }))
    return { type: 'choice', id: ++this.nextId, qid, who, q, opts, def, free: FREE_TEXT.has(qid) }
  }
  private async choose(run: Run, qid: ChoiceQid, who: Txt, q: Txt, ids: readonly string[], def: string): Promise<ChoiceResult> {
    const r = await this.ask<ChoiceResult>(run, this.choiceCard(qid, who, q, ids, def))
    this.live(run)
    return r
  }

  /**
   * One agent turn through the AI port. `fallback` is the prepared text (a descriptor, kept so the UI can re-translate it);
   * `fixed` turns are the clinician-approved emergency script and never reach the AI.
   */
  private async say(run: Run, agent: AgentId, o: {
    callId: SayCallId | typeof FIXED_CALL
    facts: Record<string, unknown>; task: string; fallback: Txt; audience: string; tag?: Txt; mode?: Mode; why?: Txt
    fixed?: boolean; max?: number; route?: SayRequest['route']
    /** Free-text calls: the fixed safety line shown when the server finds emergency words (reason `emergency`); never AI text. */
    emergency?: Txt
  }) {
    const item = this.add({ kind: 'agent', agent, mode: o.mode ?? AGENTS[agent].mode, audience: o.tag ?? null, typing: true, text: null, lang: this.lang, source: null, note: null, why: o.why ?? null }) as Extract<FeedItem, { kind: 'agent' }>
    await this.wait(run, WAIT.typing)
    let text: Txt | string = o.fallback, source: Source = 'prepared', note: Txt | string | null = null
    if (o.fixed) { source = 'fixed'; this.calls.prepared++ }
    else {
      const callId = o.callId as SayCallId
      const req: SayRequest = { callId, tier: SAY_CALLS[callId].tier, skill: agent, domain: AGENTS[agent].domain, audience: o.audience, lang: this.lang, facts: o.facts, task: o.task, fallback: this.str(o.fallback), maxWords: o.max ?? 55, route: o.route }
      this.aiBusy = !(this.ai instanceof PreparedAi)
      this.emit()
      let r: Awaited<ReturnType<NoaAi['say']>>
      try { r = await this.ai.say(req) } catch { r = { text: req.fallback, source: 'prepared', note: undefined } }
      this.aiBusy = false
      this.live(run)
      if (r.source === 'live') {
        const g = guard(r.text)
        if (g) { source = 'guardrail'; note = tx(`ai.guardrail.${g}`); this.calls.guardrail++ }
        else {
          source = 'live'; text = r.text; this.calls.live++
          // The rule a live turn explains: shown in its why line when it is a real Orchestrator code; it never routes or decides.
          if (r.ruleId && (RULE_IDS as readonly string[]).includes(r.ruleId)) item.why = tx('say.why.rule', { rule: r.ruleId, text: tx(`rules.${r.ruleId}`) })
        }
        if (o.route && r.handoffTo && r.handoffTo !== o.route.to) {
          this.calls.overruled++
          this.add({ kind: 'sys', icon: 'puzzle', text: tx('sys.overruled', { agent: tx(`agents.${r.handoffTo}.name`), rule: o.route.rule, to: tx(`agents.${o.route.to}.name`) }) })
        }
      } else if (r.source === 'guardrail' && r.reason === 'emergency' && o.emergency) {
        // Emergency words in a typed question: the fixed, clinician-approved safety line, never the model's words.
        source = 'fixed'; text = o.emergency; this.calls.prepared++
      } else if (r.source === 'guardrail') {
        source = 'guardrail'; this.calls.guardrail++
        note = r.reason && GUARD_REASONS.includes(r.reason) ? tx(`ai.guardrail.${r.reason}`) : r.note ?? tx('ai.guardrail.other')
      } else { this.calls.prepared++; note = r.reason && PREPARED_REASONS.includes(r.reason) ? tx(`ai.note.${r.reason}`) : r.note ?? null }
    }
    if (source !== 'live') {
      const words = (typeof text === 'string' ? text : this.str(text)).split(/\s+/).filter(Boolean).length
      await this.wait(run, writingMs(words))
    }
    item.typing = false
    item.text = text
    item.source = source
    item.note = note
    item.lang = this.lang
    this.emit()
    await this.wait(run, WAIT.afterSay)
  }
  private async handoff(run: Run, from: AgentId, to: AgentId, rule: RuleId, reason: Txt, packet: PacketLine[]) {
    this.live(run)
    this.hit(rule)
    this.gov.handoffs++
    this.hand.push({ from, to, rule, reason, t: hhmm(this.clock) })
    this.active = to
    this.add({ kind: 'hand', from, to, rule, reason, packet })
    await this.wait(run, WAIT.handoff)
  }

  /* ================================================================ the journey */
  private begin(k: PersonId): Promise<void> {
    if (this.j && !this.j.done && this.j.k !== k) this.status[this.j.k] = status0(this.j.k)
    this.cancel()
    const run: Run = { cancelled: false }
    this.run = run
    if (this.tc && this.tc.person !== k) this.tc = null
    this.feed = []
    this.hand = []
    this.rulesHit = new Map()
    this.active = 'orch'
    this.clock = CLOCK_START
    this.j = { k, stage: null, seen: [], branch: null, done: null, sig: [], urgent: null, flagList: [], ans: {}, vt: {}, tests: null, speech: null, spN: 0, path: null, genomic: true, share: [], tc: this.tc?.id ?? null }
    this.gov.journeys++
    this.running = true
    this.emit()
    return this.journey(run).catch((e: unknown) => {
      if (e instanceof Cancelled) return
      if (this.run === run) { this.running = false; this.emit() }
      throw e
    })
  }

  private async journey(run: Run) {
    await this.detect(run)
    if (!(await this.waitUser(run))) return
    await this.protect(run)
    const go = await this.home(run)
    if (!go) return
    await this.pathway(run)
  }

  /* ---------------------------------------------------------------- 1 · Detect */
  private async detect(run: Run) {
    const j = this.j as Journey, k = j.k, m = PEOPLE[k], p = this.profiles[k]
    this.stage('detect')
    this.setSt(k, 'status.watching', 'info')
    if (isAdult(p)) {
      p.bmi = bmiOf(p)
      const F = signalRules(k, p)
      j.sig = F
      F.forEach((x) => this.hit(x.rule))
      j.urgent = urgentOf(F)
      await this.handoff(run, 'orch', 'guardian', 'IN', tx('hand.in.adult', { name: name(k), devices: tx(`people.${k}.dev`) }), [
        { label: tx('packet.heart'), value: tx('packet.v.bpm', { n: p.hr }) }, { label: tx('packet.bp'), value: `${p.sbp}/${p.dbp}` },
        { label: tx('packet.oxygen'), value: tx('packet.v.pct', { n: p.spo2 }) }, { label: tx('packet.steps'), value: tx('packet.v.perDay', { n: p.steps }) },
        { label: tx('packet.consent'), value: tx('packet.v.consentOnFile') },
      ])
      this.add({ kind: 'pattern', person: k, cards: patternCards(k, p) })
      await this.wait(run, WAIT.pattern)
      const u = j.urgent
      if (u) {
        this.setSt(k, 'status.unusual', 'bad')
        const kind = u.rule === 'L1' ? 'L1' : u.rule === 'G1' ? 'G1' : u.rule === 'G3' ? 'G3' : 'other'
        // B6: the auto-prompt says what was actually seen (racing, slow heart, low glucose or another reading).
        this.notify(k, tx(`notes.urgent.${kind}`, { glu: p.glu, hr: p.hr, mins: 22, signal: u.text }), 'bell')
        this.add({ kind: 'push', to: tx('push.to', { name: name(k) }), text: tx(`push.${kind}`, { call: call(k), glu: p.glu, hr: p.hr, mins: 22, signal: u.text }), why: tx('push.why', { rule: u.rule }) })
        // say(): Guardian tells the person what it noticed. facts: name, signal, usual (own heart band), rule (its text).
        await this.say(run, 'guardian', { callId: 'detect.guardian',
          facts: { name: this.str(name(k)), signal: this.str(u.text), usual: this.str(tx(`people.${k}.usual`)), rule: this.str(tx(`rules.${u.rule}`)) },
          audience: this.str(name(k)),
          task: `Tell ${this.str(call(k))} calmly what you noticed compared with their own usual, that you started a one-minute check, and that a doctor review today goes first in the pathway.`,
          fallback: tx(u.rule.startsWith('G') ? 'say.guardian.urgentHeart' : 'say.guardian.urgent', { call: call(k), signal: lc(u.text), usual: tx(`people.${k}.usual`) }),
          why: tx('say.why.rule', { rule: u.rule, text: tx(`rules.${u.rule}`) }),
          route: { rule: 'D1', to: 'forecast', options: ['forecast', 'voice'] },
        })
      } else this.add({ kind: 'sys', icon: 'check', text: tx('sys.noPattern', { name: name(k) }) })
    } else {
      const parent = m.parent as PersonId
      await this.handoff(run, 'orch', 'guardian', 'IN', tx('hand.in.child', { name: name(k), parent: name(parent) }), [
        { label: tx('packet.age'), value: tx('packet.v.months', { n: p.ageM }) },
        { label: tx('packet.nextVisit'), value: p.overdueW ? tx('packet.v.weeksOverdue', { n: p.overdueW }) : tx('packet.v.onTime') },
      ])
    }
    const fam = this.fam(k)
    await this.handoff(run, 'guardian', 'forecast', 'D1', tx(j.urgent ? 'hand.d1.parallel' : 'hand.d1.plain'), [
      { label: tx('packet.lastRecord'), value: tx(`people.${k}.lastDate`) },
      { label: tx('packet.history'), value: tx('packet.v.items', { n: RECORDS[k].scr.length }) },
      { label: tx('packet.familyRecord'), value: tx('packet.v.facts', { n: fam.length }) },
      { label: tx('packet.genomic'), value: tx(GENOMIC[k] ? 'packet.v.consented' : 'packet.v.none') },
    ])
    this.add({ kind: 'famw', person: k, rows: fam })
    this.hit('X1')
    j.flagList = detectFlags(k, this.profiles, j.sig, { genomic: j.genomic, fam })
    this.hit('D1')
    this.add({ kind: 'flags', person: k, flags: j.flagList, note: null })
    const top = topFlags(j.flagList)
    const child = !!m.child, to = child ? (m.parent as PersonId) : k
    // say(): Forecast explains the flags. facts: name, flags [{flag, factors, source, certainty}] (not the muted T2), family_effects.
    await this.say(run, 'forecast', { callId: 'detect.forecast',
      facts: {
        name: this.str(name(k)),
        flags: j.flagList.filter((x) => x.lvl !== 'muted').map((x) => ({ flag: this.str(x.title), factors: x.factors.map((f) => this.str(f)), source: this.str(x.src), certainty: this.str(x.cert) })),
        family_effects: fam.filter((r) => r.eff).map((r) => this.str(r.rule)),
      },
      audience: this.str(name(to)),
      task: `Explain to ${child ? `${this.str(name(to))} (parent of ${this.str(name(k))})` : this.str(call(k))} in plain words what Noa found from the readings, the last record and the family health record, most important first, naming the reason for each and how sure Noa is. Say these are priorities for checks, not a diagnosis.`,
      fallback: tx(child ? 'say.forecast.flagsChild' : 'say.forecast.flags', {
        call: call(k), parent: name(to), name: name(k), date: tx(`people.${k}.lastDate`),
        top: top.length ? joinedTitles(top, 3) : tx('say.forecast.nothingOverdue'),
      }),
      why: tx('say.why.rule', { rule: 'D1', text: tx('rules.D1') }),
      route: { rule: 'P1', to: 'guardian', options: ['guardian', 'navigator'] },
    })
  }

  /* ---------------------------------------------------------------- after Detect: the person decides when to start */
  /**
   * Noa stops at Detect: an urgent alert has sent the person a prompt, a routine case is ready. Nothing moves on until the person
   * (or the parent, for a child) starts it. "Not now" on an alert keeps it open and Noa asks again (U1); "Later" on a routine case
   * respects it (N3).
   */
  private async waitUser(run: Run): Promise<boolean> {
    const j = this.j as Journey, k = j.k, m = PEOPLE[k], u = !!j.urgent
    const whoK: PersonId = m.child ? (m.parent as PersonId) : k
    this.setSt(k, u ? 'status.promptSent' : 'status.ready', u ? 'bad' : 'info')
    this.emit()
    const opts: ChoiceOption[] = [{ id: 'go', label: tx(u ? 'go.startNow' : 'go.startHome') }, { id: 'later', label: tx(u ? 'go.notNow' : 'go.later') }]
    const r = await this.ask<string>(run, { type: 'go', id: ++this.nextId, who: name(whoK), urgent: u, opts, def: 'go', msg: tx(u ? 'go.msgUrgent' : 'go.msg', { name: name(k), who: name(whoK) }) })
    this.live(run)
    const label = (opts.find((o) => o.id === r) ?? opts[0]).label
    this.add({ kind: 'me', who: name(whoK), text: label, chip: null })
    if (r === 'go') return true
    if (u) {
      this.hit('U1')
      this.add({ kind: 'sys', icon: 'timer', text: tx('sys.goU1', { contact: j.share[0] ? name(j.share[0]) : tx('go.familyContact') }) })
      this.setSt(k, 'status.promptPending', 'warn')
      this.finish(run, tx('done.goWait', { name: name(k) }))
    } else {
      this.hit('N3')
      this.setSt(k, 'status.notNow', 'muted')
      this.finish(run, tx('done.goLater'))
    }
    return false
  }

  /* ---------------------------------------------------------------- 2 · Protect */
  private async protect(run: Run) {
    const j = this.j as Journey, k = j.k, m = PEOPLE[k]
    this.stage('protect')
    const r = REL[k]
    const fam: PersonId[] = m.child ? ['khalid'] : [r.spouse, ...(r.kids ?? []), ...(r.parents ?? [])].filter((x): x is PersonId => !!x && !PEOPLE[x].child)
    if (j.urgent) {
      this.hit('P1')
      j.genomic = !!GENOMIC[k]
      j.share = fam.slice(0, 1)
      await this.handoff(run, 'forecast', 'guardian', 'P1', tx('hand.p1.urgent'), [
        { label: tx('packet.consent'), value: tx('packet.v.consentEnrol') },
        { label: tx('packet.told'), value: j.share.length ? list(j.share.map(name), ', ') : tx('common.nobody') },
      ])
      // B8: nothing was asked now, so the line no longer says "as Saeed chose".
      this.add({ kind: 'sys', icon: 'lock', text: fam[0] ? tx('sys.protectUrgent', { name: name(fam[0]) }) : tx('sys.protectUrgentNobody') })
      return
    }
    const parent = m.parent as PersonId | undefined
    await this.handoff(run, 'forecast', 'guardian', 'P1', tx('hand.p1.ask'), [
      { label: tx('packet.optional'), value: tx(GENOMIC[k] ? 'packet.v.genomicResult' : 'packet.v.none') },
      { label: tx('packet.decides'), value: m.child ? tx('packet.v.parent', { name: name(parent as PersonId) }) : name(k) },
    ])
    const genomic = !!GENOMIC[k]
    const pr = await this.ask<ProtectValue>(run, {
      type: 'protect', id: ++this.nextId, who: m.child ? tx('who.parentDecides', { parent: name(parent as PersonId), child: name(k) }) : name(k),
      genomic, gen: genomic && !(this.tc && this.tc.person === k && this.tc.answers.genomic === false), contacts: fam, sel: fam.slice(0, 1),
    })
    this.live(run)
    this.hit('P1')
    j.genomic = pr.genomic
    j.share = pr.contacts
    if (genomic && !pr.genomic) {
      j.flagList = detectFlags(k, this.profiles, j.sig, { genomic: false, fam: this.fam(k) })
      this.add({ kind: 'flags', person: k, flags: j.flagList, note: tx('flags.genomicOff', { name: name(k) }) })
    }
    const share = pr.contacts.length ? tx('say.guardian.share', { names: list(pr.contacts.map(name), tx('join.and')) }) : tx('say.guardian.shareNobody')
    // say(): Guardian confirms the data and who may see the pathway. facts: name, shared_with (names), genomic_used.
    await this.say(run, 'guardian', { callId: 'protect.guardian',
      facts: { name: this.str(name(k)), shared_with: pr.contacts.map((x) => this.str(name(x))), genomic_used: pr.genomic },
      audience: this.str(name(m.child ? (parent as PersonId) : k)),
      task: 'Confirm which data Noa will use and who may see the pathway, then say a short home screening comes next.',
      fallback: m.child
        ? tx('say.guardian.protectChild', { parent: name(parent as PersonId), name: name(k), share })
        : tx(genomic ? (pr.genomic ? 'say.guardian.protectGenOn' : 'say.guardian.protectGenOff') : 'say.guardian.protect', { call: call(k), share }),
      route: { rule: m.child ? 'K2' : 'Q1', to: 'voice', options: ['voice', 'navigator'] },
    })
  }

  /* ---------------------------------------------------------------- 3 · Home screening */
  private async home(run: Run): Promise<boolean> {
    const j = this.j as Journey, k = j.k, p = this.profiles[k]
    this.stage('home')
    this.setSt(k, j.urgent ? 'status.checking' : 'status.home', 'info')
    if (!isAdult(p)) return this.childHome(run, p)
    const fam = this.fam(k)
    const T = selectTests(k, p, j.urgent, fam)
    j.tests = T
    j.vt = {}
    const names = T.use.map((x) => tx(`vt.${x.id}.name`))
    const shorts = list(T.use.map((x) => lc(tx(`vt.${x.id}.short`))), ', ')
    // B6: the hand-off says speech first only when a heart alert calls for the speech check.
    const q1 = j.urgent?.rule.startsWith('G') ? tx('hand.q1.urgent') : j.urgent?.rule === 'L1' ? tx('hand.q1.urgentLow') : tx('hand.q1.plain', { name: name(k) })
    await this.handoff(run, 'guardian', 'voice', 'Q1', q1, [
      { label: tx('packet.tests'), value: list(names, ', ') }, { label: tx('packet.notUsed'), value: tx('packet.v.reasons', { n: T.skip.length }) },
    ])
    this.add({ kind: 'vtplan', person: k, use: T.use, skip: T.skip })
    if (!j.urgent) this.notify(k, tx('notes.homeCheck', { tests: shorts }), 'speech')
    const u = j.urgent
    // B6: the opening line follows the alert: racing or slow heart (speech first), low glucose (how you feel), other (doctor first).
    const intro = !u ? 'say.voice.intro' : u.rule === 'G1' ? 'say.voice.introRacing' : u.rule === 'G3' ? 'say.voice.introSlow' : u.rule === 'L1' ? 'say.voice.introLow' : 'say.voice.introOther'
    // say(): Voice says what the check covers. facts: call (how Noa addresses the person), tests (names).
    await this.say(run, 'voice', { callId: 'home.voice.intro',
      facts: { call: this.str(call(k)), tests: names.map((n) => this.str(n)) },
      audience: this.str(name(k)),
      task: `Tell ${this.str(call(k))} what the voice check will cover today, in one or two sentences, and that it takes a few minutes.`,
      fallback: tx(intro, { call: call(k), sentence: SENTENCE[this.lang], tests: shorts }),
    })
    if (u && u.rule === 'L1') {
      const h = await this.choose(run, 'hypo', name(k), tx('choice.hypo.q', { glu: HYPO_RECHECK }), CHOICES.hypo, 'ok')
      j.ans.hypo = h.id
      if (h.id === 'confused') return this.stopUrgent(run, 'L1', 'stop.L1')
      j.vt.hypo = { txt: tx(h.id === 'ok' ? 'vt.result.hypoOk' : 'vt.result.hypoStill', { glu: HYPO_RECHECK }), lvl: h.id === 'ok' ? 'warn' : 'bad' }
      this.add({ kind: 'sys', icon: 'check', text: tx('sys.hypoOk', { glu: HYPO_RECHECK }) })
    }
    for (const { id } of T.use) {
      if (id === 'speech') {
        let sp = await this.ask<SpeechResult>(run, { type: 'speech', id: ++this.nextId, who: name(k), retry: false, person: k, result: null })
        this.live(run)
        if (sp.lvl === 'amber') {
          this.hit('Q1')
          // say(): Voice asks for one more try. facts: score.
          await this.say(run, 'voice', { callId: 'home.voice.retry', facts: { score: sp.score }, audience: this.str(name(k)), task: `Kindly ask ${this.str(call(k))} to say the sentence once more, slowly.`, fallback: tx('say.voice.retry') })
          const s2 = await this.ask<SpeechResult>(run, { type: 'speech', id: ++this.nextId, who: name(k), retry: true, person: k, result: null })
          this.live(run)
          sp = s2.lvl === 'green' ? s2 : { ...s2, lvl: s2.lvl === 'none' ? 'red' : s2.lvl }
        }
        j.speech = sp
        j.vt.speech = { txt: tx('vt.result.speech', { score: fixed(sp.score, 2), level: tx(`speech.level.${sp.lvl}`) }), lvl: sp.lvl === 'green' ? 'good' : sp.lvl === 'amber' ? 'warn' : 'bad', score: sp.score }
        if (sp.lvl === 'red' || sp.lvl === 'none') return this.stopUrgent(run, 'Q1', 'stop.Q1')
        if (!j.urgent) {
          // Recovery check after a stroke: saved for the speech therapist, no red-flag questions.
          this.add({ kind: 'sys', icon: sp.lvl === 'green' ? 'check' : 'speech', text: tx(sp.lvl === 'green' ? 'sys.speechRecovery' : 'sys.speechRecoveryAmber', { name: name(k) }) })
          continue
        }
        const rf = await this.choose(run, 'rf', name(k), tx('choice.rf.q'), CHOICES.rf, 'palp')
        j.ans.rf = rf.id
        if (rf.id === 'weak') return this.stopUrgent(run, 'V1', 'stop.V1')
        if (rf.id === 'chest' || rf.id === 'faint') return this.stopUrgent(run, 'V2', 'stop.V2')
        this.add({ kind: 'sys', icon: 'check', text: tx('sys.v4') })
        continue
      }
      if (id === 'din') {
        const tcDin = this.tc && this.tc.person === k ? this.tc.answers.din : undefined
        const r = await this.ask<DinResult>(run, { type: 'din', id: ++this.nextId, who: name(k), rounds: DIN_ROUNDS.map((x) => ({ digits: x.digits, noise: tx(`din.noise.${x.noise}`) })), answers: dinDefaults(k, tcDin) })
        this.live(run)
        j.vt.din = { txt: r.txt, lvl: r.lvl, score: r.n, refer: r.refer }
        continue
      }
      const qid = id as QsetId
      const items = qsetItems(qid, p, fam)
      const tcq = this.tc && this.tc.person === k ? this.tc.answers.q?.[qid] : undefined
      const r = await this.ask<QResult>(run, { type: 'qset', id: ++this.nextId, test: qid, who: name(k), items, vals: qsetDefaults(k, qid, tcq) })
      this.live(run)
      j.vt[qid] = { txt: r.txt, lvl: r.lvl, score: r.score }
    }
    const F = p.sex === 'F'
    if (!j.urgent) {
      const sym = await this.choose(run, 'sym', name(k), tx('choice.sym.q'), CHOICES.sym.filter((x) => F || x !== 'breast'), 'none')
      j.ans.sym = sym.id
      if (sym.id !== 'none') {
        this.hit('H2')
        this.add({ kind: 'sys', icon: 'clinic', text: tx('sys.h2', { label: sym.label }) })
      }
    } else j.ans.sym = 'none'
    if (p.smoker) {
      const q = await this.choose(run, 'quit', name(k), tx('choice.quit.q'), CHOICES.quit, 'yes')
      j.ans.quit = q.id
    }
    const pref = await this.choose(run, 'pref', name(k), tx('choice.pref.q'), CHOICES.pref.filter((x) => F || x !== 'female'), k === 'moza' ? 'female' : k === 'saeed' ? 'one' : 'home')
    j.ans.pref = pref.id
    const tm = await this.choose(run, 'time', name(k), tx('choice.time.q'), TIME_IDS, DEFAULT_TIME[k] ?? 'sat')
    j.ans.time = tm.id as TimeId
    const results = (Object.keys(j.vt) as VtId[]).map((t) => ({ test: t, txt: (j.vt[t] as { txt: Txt }).txt, lvl: (j.vt[t] as { lvl: string }).lvl }))
    this.add({ kind: 'vtres', person: k, results })
    await this.handoff(run, 'voice', 'insight', 'Q1', tx('hand.q1.results'), results.map((r) => ({ label: tx(`vt.${r.test}.short`), value: r.txt })))
    // say(): Insight sums up the home screening. facts: name, results [{test, result}], symptom (option id).
    await this.say(run, 'insight', { callId: 'home.insight',
      facts: { name: this.str(name(k)), results: results.map((r) => ({ test: this.str(tx(`vt.${r.test}.name`)), result: this.str(r.txt) })), symptom: j.ans.sym },
      audience: this.str(name(k)),
      task: `Tell ${this.str(call(k))} in two sentences what the voice checks showed and what they change in the plan. Not a diagnosis.`,
      fallback: tx(results.length ? 'say.insight.results' : 'say.insight.none', { call: call(k), results: list(results.map((r) => tx('say.insight.line', { test: tx(`vt.${r.test}.short`), result: lc(r.txt) })), '; ') }),
      route: { rule: 'T1', to: 'navigator', options: ['navigator', 'courier'] },
    })
    return true
  }

  private async childHome(run: Run, p: ChildProfile): Promise<boolean> {
    const j = this.j as Journey, k = j.k, m = PEOPLE[k], parent = m.parent as PersonId
    await this.handoff(run, 'guardian', 'voice', 'K2', tx('hand.k2', { parent: name(parent), name: name(k) }), [
      { label: tx('packet.age'), value: tx('packet.v.months', { n: p.ageM }) }, { label: tx('packet.askedOf'), value: tx('packet.v.parent', { name: name(parent) }) },
    ])
    const age = p.ageM < CHILD_DEV_UNDER_MONTHS ? tx('age.months', { n: p.ageM }) : tx('age.years', { n: Math.round(p.ageM / 12) })
    // say(): Voice opens the child's check with the parent. facts: parent, child, age_months.
    await this.say(run, 'voice', { callId: 'home.voice.child',
      facts: { parent: this.str(name(parent)), child: this.str(name(k)), age_months: p.ageM },
      audience: this.str(name(parent)),
      task: `Tell ${this.str(name(parent))} this is a two-minute home check for ${this.str(name(k))}, a few questions for their age, and that a doctor decides anything that needs follow-up.`,
      fallback: tx('say.voice.child', { parent: name(parent), name: name(k), age }),
    })
    const her = m.sex === 'F' ? 'F' : 'M'
    if (p.ageM < CHILD_DEV_UNDER_MONTHS) {
      const w = await this.choose(run, 'words', name(parent), tx('choice.words.q', { name: name(k) }), CHOICES.words, 'some')
      const pt = await this.choose(run, 'point', name(parent), tx('choice.point.q', { name: name(k) }), CHOICES.point, 'yes')
      const nm = await this.choose(run, 'name', name(parent), tx(`choice.name.q${her}`, { name: name(k) }), CHOICES.name, 'yes')
      j.ans = { words: w.id, point: pt.id, name: nm.id }
      this.hit('K2')
      const flag = w.id === 'few' || pt.id === 'no' || nm.id === 'no'
      j.ans.dev = flag
      this.add({ kind: 'sys', icon: 'child', text: tx(flag ? 'sys.childDevFlag' : 'sys.childDevOk', { n: p.ageM }) })
    } else {
      const v = await this.choose(run, 'vision', name(parent), tx(`choice.vision.q${her}`, { name: name(k) }), CHOICES.vision, 'none')
      const h = await this.choose(run, 'hearing', name(parent), tx('choice.hearing.q', { name: name(k) }), CHOICES.hearing, 'none')
      j.ans = { vision: v.id, hearing: h.id }
      this.hit('K2')
    }
    const tm = await this.choose(run, 'time', name(parent), tx('choice.timeChild.q', { name: name(k) }), TIME_IDS, 'sat')
    j.ans.time = tm.id as TimeId
    j.ans.pref = 'one'
    return true
  }

  /** Emergency: fixed script, no booking, the person and the shared relative are told; Noa calls nobody. */
  private async stopUrgent(run: Run, rule: RuleId, why: string): Promise<false> {
    const j = this.j as Journey, k = j.k
    this.hit(rule)
    j.branch = 'em'
    this.gov.emergencies++
    this.setSt(k, 'status.seeDoctor', 'bad')
    this.emit()
    // Fixed, clinician-approved script: never sent to the AI (source "fixed").
    await this.say(run, 'voice', { callId: 'stop.voice.emergency',
      fixed: true, facts: {}, task: '', audience: this.str(name(k)),
      why: tx('say.why.fixed', { rule, text: tx(`rules.${rule}`) }),
      // B7: the reason continues the sentence in lower case ("Abu Rashid, your speech…").
      fallback: tx('say.voice.emergency', { call: call(k), why: lc(tx(why)) }),
    })
    this.add({ kind: 'sys', icon: 'stop', text: tx('sys.emergency', { rule }) })
    this.notify(k, tx('notes.emergencySelf'), 'stop')
    for (const x of j.share) this.notify(x, tx('notes.emergencyFamily', { name: name(k) }), 'stop')
    this.finish(run, tx('done.emergency'))
    return false
  }

  /* ---------------------------------------------------------------- 4 · Right pathway */
  private pathInput() {
    const j = this.j as Journey
    const V = j.vt
    return {
      k: j.k, p: this.profiles[j.k] as AdultProfile | ChildProfile, urgent: j.urgent, ans: j.ans, genomic: j.genomic, fam: this.fam(j.k),
      vt: { dmrisk: V.dmrisk ? { score: V.dmrisk.score ?? 0, txt: V.dmrisk.txt, lvl: 'good' as const } : undefined, din: V.din ? { ok: [], n: V.din.score ?? 0, refer: !!V.din.refer, txt: V.din.txt, lvl: 'good' as const } : undefined, falls: V.falls ? { score: V.falls.score ?? 0, txt: V.falls.txt, lvl: 'good' as const } : undefined, stopbang: V.stopbang ? { score: V.stopbang.score ?? 0, txt: V.stopbang.txt, lvl: 'good' as const } : undefined, phq2: V.phq2 ? { score: V.phq2.score ?? 0, txt: V.phq2.txt, lvl: 'good' as const } : undefined },
    }
  }
  private offerText(path: Pathway, k: PersonId): Txt {
    const m = PEOPLE[k], lead = leadItem(path)
    const to = m.child ? tx('say.navigator.toChild', { parent: name(m.parent as PersonId), name: name(k) }) : tx('say.navigator.to', { call: call(k) })
    // An item that already says when ("Doctor review today", "within 24 hours") does not repeat its urgency.
    const when = lead && /today|24 hours/i.test(this.translate(lead.short, 'en'))
    const first = lead ? tx(when ? 'say.navigator.firstNoUrg' : 'say.navigator.first', { item: lc(lead.short), urg: lc(tx(`urgency.${lead.u}`)) }) : ''
    const checks = list(path.pop.map((x) => tx('say.navigator.check', { name: lc(x.short), urg: lc(tx(`urgency.${x.u}`)) })), ', ')
    const doctor = path.clin.length ? tx('say.navigator.doctor', { items: tx(path.clin.length > 1 ? 'count.items' : 'count.item1', { n: path.clin.length }) }) : ''
    return tx(path.pop.length ? 'say.navigator.offer' : 'say.navigator.offerNone', { to, first, checks, slot: path.slot, doctor })
  }

  private async pathway(run: Run) {
    const j = this.j as Journey, k = j.k, m = PEOPLE[k], p = this.profiles[k]
    this.stage('pathway')
    this.setSt(k, 'status.pathReady', 'info')
    await this.handoff(run, 'insight', 'navigator', 'T1', tx('hand.t1', { name: name(k) }), [
      { label: tx('packet.flags'), value: topFlags(j.flagList).length }, { label: tx('packet.answers'), value: Object.keys(j.ans).length },
      { label: tx('packet.preference'), value: String(j.ans.pref ?? '') }, { label: tx('packet.time'), value: j.ans.time ? tx(`times.${j.ans.time}`) : '' },
    ])
    await this.handoff(run, 'navigator', 'analyst', 'N1', tx('hand.n1.ask'), [
      { label: tx('packet.person'), value: p.child ? tx('packet.v.months', { n: p.ageM }) : tx('packet.v.person', { age: p.age, sex: tx(p.sex === 'F' ? 'packet.v.female' : 'packet.v.male') }) },
      { label: tx('packet.names'), value: tx('packet.v.notSent') },
    ])
    await this.handoff(run, 'analyst', 'navigator', 'N1', tx('hand.n1.list'), [
      { label: tx('packet.programmes'), value: PROGRAMME_COUNT }, { label: tx('packet.new'), value: tx('packet.v.newSlots') },
    ])
    let path = buildPath(this.pathInput())
    j.path = path
    this.hit('T1')
    this.hit('T2')
    this.add({ kind: 'path', person: k, path, note: null })
    const lead = path.clin[0] && urgencyIndex(path.clin[0].u) <= urgencyIndex(ESCALATE_UP_TO) ? path.clin[0].short : path.pop[0] ? path.pop[0].name : tx('notes.nothingUrgent')
    this.notify(m.child ? 'amna' : k, tx('notes.pathReady', {
      whose: m.child ? tx('notes.whoseChild', { name: name(k) }) : tx('notes.whoseYour'),
      checks: tx(path.pop.length === 1 ? 'count.check1' : 'count.checks', { n: path.pop.length }),
      doctor: path.clin.length ? tx('notes.forDoctor', { n: path.clin.length }) : '',
      top: lead,
    }), 'compass')
    const audience = this.str(name(m.child ? (m.parent as PersonId) : k))
    // say(): Navigator offers the pathway and asks to book. facts: name, population_priority [{check, why_for_you, where, when}], for_the_doctor.
    await this.say(run, 'navigator', { callId: 'pathway.navigator.offer',
      facts: { name: this.str(name(k)), population_priority: path.pop.map((x) => ({ check: this.str(x.name), why_for_you: this.str(x.you), where: this.str(x.where), when: this.str(x.when) })), for_the_doctor: path.clin.map((x) => this.str(x.t)) },
      audience,
      task: `Offer ${m.child ? `${audience} the pathway for ${this.str(name(k))}` : `${this.str(call(k))} their pathway`} in plain words: the checks the guideline offers, in order, where and when (fitted to them), and separately what only the doctor will decide. Ask if Noa can book.`,
      fallback: this.offerText(path, k),
    })
    const who = name(m.child ? (m.parent as PersonId) : k)
    for (let t = 0; t < 4; t++) {
      const r = await this.choose(run, 'book', who, tx('choice.book.q', { name: who }), CHOICES.book, 'book')
      if (r.id === 'book') break
      const urgentItems = [...path.clin.map((x) => ({ name: x.short, u: x.u })), ...path.pop.map((x) => ({ name: x.name, u: x.u }))].filter((x) => urgencyIndex(x.u) <= urgencyIndex(ESCALATE_UP_TO))
      const doctor = tx(`people.${k}.doc`)
      if (r.id === 'later' && urgentItems.length) {
        this.hit('U1')
        // say(): Navigator respects "not now" for routine checks but escalates the urgent ones. facts: name, urgent ["item (urgency)"].
        await this.say(run, 'navigator', { callId: 'pathway.navigator.u1',
          facts: { name: this.str(name(k)), urgent: urgentItems.map((x) => `${this.str(x.name)} (${this.str(tx(`urgency.${x.u}`))})`) },
          audience,
          task: 'Respect the choice for the routine checks, but explain kindly that these items cannot wait, with their urgency, and that you have told the doctor.',
          fallback: tx('say.navigator.u1', { items: list(urgentItems.map((x) => tx('say.navigator.check', { name: lc(x.name), urg: lc(tx(`urgency.${x.u}`)) })), tx('join.and')), doctor }),
        })
        this.notify(k, tx('notes.u1', { doctor }), 'arrow-up')
        this.add({ kind: 'sys', icon: 'arrow-up', text: tx('sys.u1', { items: tx(urgentItems.length > 1 ? 'count.urgentItems' : 'count.urgentItem1', { n: urgentItems.length }), doctor }) })
        this.gov.notNow++
        this.setSt(k, 'status.escalated', 'warn')
        this.finish(run, tx('done.u1'))
        return
      }
      if (r.id === 'later') {
        this.hit('N3')
        this.gov.notNow++
        this.setSt(k, 'status.notNow', 'muted')
        // say(): Navigator respects "not now". facts: name.
        await this.say(run, 'navigator', { callId: 'pathway.navigator.n3', facts: { name: this.str(name(k)) }, audience, task: 'Respect the choice warmly; no reminders for 3 months; they can book any time.', fallback: tx('say.navigator.n3') })
        this.finish(run, tx('done.n3'))
        return
      }
      if (r.id === 'why') {
        this.hit('N2')
        this.gov.barriers++
        const f = forecast(p), top = topFlags(j.flagList)
        // say(): Forecast explains why these checks, now. facts: name, flags (titles), risk (10-year %), pathway (programme names).
        await this.say(run, 'forecast', { callId: 'pathway.forecast.why',
          facts: { name: this.str(name(k)), flags: top.map((x) => this.str(x.title)), risk: f.ok ? pct(f.r) : null, pathway: path.pop.map((x) => this.str(x.name)) },
          audience,
          task: 'Explain briefly why these checks, for this person, now: what they find before symptoms, and the person’s own reasons from the flags. No pressure.',
          fallback: tx('say.forecast.why', { reasons: top.length ? joinedTitles(top, 3) : tx('say.forecast.dueByAge') }),
        })
        continue
      }
      // change
      this.hit('T2')
      const others = TIME_IDS.filter((x) => x !== j.ans.time)
      const tm = await this.choose(run, 'time2', who, tx('choice.time2.q'), others, others[0])
      j.ans.time = tm.id as TimeId
      path = buildPath(this.pathInput())
      j.path = path
      this.add({ kind: 'path', person: k, path, note: tx('path.noteUpdated', { slot: path.slot }) })
    }
    await this.referral(run)
  }

  /* ---------------------------------------------------------------- 5 · Referral */
  private async referral(run: Run) {
    const j = this.j as Journey, k = j.k, m = PEOPLE[k], p = this.profiles[k], path = j.path as Pathway
    this.stage('referral')
    this.gov.booked++
    this.gov.referrals++
    await this.handoff(run, 'navigator', 'courier', 'C1', tx('hand.c1'), [
      { label: tx('packet.bookings'), value: path.pop.length }, { label: tx('packet.forDoctor'), value: path.clin.length },
      { label: tx('packet.sharedWith'), value: j.share.length ? list(j.share.map(name), ', ') : tx('common.nobody') },
    ])
    this.add({ kind: 'path', person: k, path, note: tx('path.noteBooked', { name: name(k) }) })
    const owner: PersonId = m.child ? 'amna' : k
    this.notify(owner, tx('notes.booked', { name: name(k), list: list(path.pop.map((x) => x.short), ', '), slot: path.slot }), 'calendar')
    for (const x of j.share.filter((y) => y !== owner)) this.notify(x, tx('notes.bookedFamily', { name: name(k), checks: tx(path.pop.length === 1 ? 'count.check1' : 'count.checks', { n: path.pop.length }), by: name(m.child ? (m.parent as PersonId) : k) }), 'calendar')
    for (const x of path.pop) this.add({ kind: 'sys', icon: x.kit ? 'package' : 'calendar', text: tx('sys.booking', { name: x.name, where: x.where, when: x.when }) })
    const age: Txt | number = p.child ? (p.ageM < 24 ? tx('age.months', { n: p.ageM }) : tx('age.years', { n: Math.floor(p.ageM / 12) })) : p.age
    const speech = j.speech ? tx('say.courier.speech', { score: fixed(j.speech.score, 2), level: tx(`speech.level.${j.speech.lvl}`) }) : ''
    // say(): Courier writes the referral note for the clinic (up to 80 words). facts: patient, age, booked, for_doctor_decision, home_screening, flags.
    await this.say(run, 'courier', { callId: 'referral.courier',
      facts: {
        patient: this.str(tx(`people.${k}.full`)), age: this.str(age), booked: path.pop.map((x) => this.str(x.name)), for_doctor_decision: path.clin.map((x) => this.str(x.t)),
        home_screening: j.speech ? { speech_score: j.speech.score } : j.ans, flags: j.flagList.filter((x) => x.lvl !== 'muted').map((x) => this.str(x.title)),
      },
      audience: `the clinic team (${this.str(tx(`people.${k}.doc`))})`, tag: tx('say.tag.referral'), mode: 'hosp', max: 80,
      task: 'Write a short referral note for the clinic: who, what is booked (population programme), what needs the doctor’s decision (clinical), and the home screening result. Facts only.',
      fallback: tx('say.courier.note', {
        full: tx(`people.${k}.full`), age,
        booked: path.pop.length ? list(path.pop.map((x) => x.name), '; ') : tx('common.none'),
        clin: path.clin.length ? list(path.clin.map((x) => x.t), '; ') : tx('common.nothing'),
        speech,
      }),
    })
    if (GENOMIC[k] && j.genomic && j.share.length) {
      this.fhShared = true
      this.hit('X1')
      for (const kid of REL[k].kids ?? []) this.setSt(kid, 'status.cholNote', 'warn')
      this.notify('amna', tx('notes.x1'), 'family')
      this.add({ kind: 'sys', icon: 'family', text: tx('sys.x1') })
    }
    const rec = m.child ? (k === 'hind' ? 'recall.hind' : 'recall.hamdan') : path.pop.some((x) => x.id === 'a1c') ? 'recall.a1c' : path.pop.some((x) => x.id === 'ifhas') ? 'recall.ifhas' : 'recall.guideline'
    this.add({ kind: 'sys', icon: 'recall', text: tx('sys.recall', { rec: tx(rec) }) })
    this.setSt(k, 'status.booked', 'good', { day: path.slotDay })
    this.hit('S1')
    const n = path.pop.length
    // say(): Analyst counts the case for the Department, no names. facts: segment ("men 60s", "children 0–6"), booked (count).
    await this.say(run, 'analyst', { callId: 'referral.analyst',
      facts: { segment: p.child ? 'children 0–6' : `${p.sex === 'F' ? 'women' : 'men'} ${Math.floor(p.age / 10) * 10}s`, booked: n },
      audience: 'Department of Health programme team', tag: tx('say.tag.department'), mode: 'gov',
      task: 'One sentence: an anonymous case was referred; it is counted in reach, recommendation and uptake by segment, with small groups hidden. No names.',
      fallback: tx('say.analyst.counted', { who: tx(p.child ? 'say.analyst.child' : 'say.analyst.adult'), checks: tx(n === 1 ? 'count.check1' : 'count.checks', { n }) }),
    })
    this.finish(run, tx('done.referred', {
      checks: tx(n === 1 ? 'count.check1' : 'count.checks', { n }),
      items: tx(path.clin.length === 1 ? 'count.item1' : 'count.items', { n: path.clin.length }),
    }))
  }
}

