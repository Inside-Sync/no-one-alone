import {
  FamilyHealthEngine, PreparedAi, SAMPLES, TEST_CASES, levelOf, scoreSpeech, type NoaAi, type PersonId, type SayRequest, type Scheduler, type TestCaseId, type Txt, WRITING, writingMs,
} from '@/features/familyHealth'
import { TAR, T, drive, engine, of, view } from './helpers'

const start = async (e: FamilyHealthEngine, who: PersonId) => { void e.startJourney(who); await e.whenIdle() }
const runCase = async (e: FamilyHealthEngine, id: TestCaseId) => { void e.runTestCase(id); await e.whenIdle() }

describe('Framingham heart pills', () => {
  test('match the prototype: Saeed 44% high, Khalid 10% moderate, Amna 1% low; none for Moza (after stroke) and the children', () => {
    const h = engine().getSnapshot().heart
    expect(h.saeed).toEqual({ pct: '44%', cat: 'high', tone: 'bad' })
    expect(h.khalid).toEqual({ pct: '10%', cat: 'moderate', tone: 'warn' })
    expect(h.amna).toEqual({ pct: '1%', cat: 'low', tone: 'good' })
    expect(h.moza).toBeNull()
    expect(h.hamdan).toBeNull()
    expect(h.hind).toBeNull()
  })
  test('BP 184/112 raises Khalid to 17% (k4)', async () => {
    const e = engine()
    await runCase(e, 'k4')
    expect(e.getSnapshot().heart.khalid?.pct).toBe('17%')
  })
})

describe('speech scoring', () => {
  test('samples score like the prototype (usual 1.00, slightly slurred 0.68 amber, clearly slurred 0.47 red)', () => {
    const u = scoreSpeech(...SAMPLES.usual.en, 'en'), a = scoreSpeech(...SAMPLES.unclear.en, 'en'), r = scoreSpeech(...SAMPLES.slurred.en, 'en')
    expect([u.score, u.lvl, u.matched, u.total]).toEqual([1, 'green', 7, 7])
    expect([a.score, a.lvl, a.matched]).toEqual([0.68, 'amber', 4])
    expect([r.score, r.lvl, r.matched]).toEqual([0.47, 'red', 2])
  })
  test('Arabic sentence and samples', () => {
    expect(scoreSpeech(...SAMPLES.usual.ar, 'ar').lvl).toBe('green')
    expect(scoreSpeech(...SAMPLES.slurred.ar, 'ar').lvl).toBe('red')
    expect(scoreSpeech('السماء زرقاء في أبوظبي', null, 'ar').total).toBe(4)
  })
  test('boundaries: green from 0.8, amber from 0.6, red below, nothing said = none; typed (no time) uses words only', () => {
    expect(levelOf(0.8, 'x')).toBe('green')
    expect(levelOf(0.79, 'x')).toBe('amber')
    expect(levelOf(0.6, 'x')).toBe('amber')
    expect(levelOf(0.59, 'x')).toBe('red')
    expect(levelOf(1, '')).toBe('none')
    expect(scoreSpeech('The sky is blue in Abu Dhabi', null, 'en').score).toBe(1)
    expect(scoreSpeech('The sky is blue in Abu Dhabi', 6, 'en').score).toBe(0.88) // 0.75 + 0.25 × 3.0/6
    expect(scoreSpeech('', 3, 'en').lvl).toBe('none')
  })
})

describe('emergency branches (fixed script, no booking, Noa calls nobody)', () => {
  const emergency = async (setup: (e: FamilyHealthEngine) => Promise<void>, script = {}) => {
    const e = engine()
    await setup(e)
    const s = await drive(e, script)
    return { e, s }
  }
  test.each([
    ['Q1: speech clearly changed', 's2' as TestCaseId, {}, 'Q1'],
    ['V1: face or arm weakness', 's0' as TestCaseId, { rf: 'weak' }, 'V1'],
    ['V2: chest pain', 's0' as TestCaseId, { rf: 'chest' }, 'V2'],
    ['V2: faint', 's0' as TestCaseId, { rf: 'faint' }, 'V2'],
    ['L1: confused with low sugar', 's3' as TestCaseId, { hypo: 'confused' }, 'L1'],
    ['Q1: amber, then clearly slurred on the retry', 's0' as TestCaseId, { speech: ['unclear', 'slurred'] }, 'Q1'],
  ])('%s', async (_n, tc, script, rule) => {
    const { s } = await emergency((e) => runCase(e, tc), script)
    expect(s.emergency).toBe(true)
    expect(s.journey?.branch).toBe('em')
    expect(T(s.journey?.done as Txt)).toBe('Screening paused: see a doctor immediately (emergency department). Nothing was booked.')
    expect(of(s.feed, 'path')).toHaveLength(0)
    const fixed = of(s.feed, 'agent').filter((a) => a.source === 'fixed')
    expect(fixed).toHaveLength(1)
    expect(T(fixed[0].text as Txt)).toContain('Please see a doctor now at the nearest emergency department')
    expect(T(fixed[0].why as Txt)).toContain(`Rule ${rule}:`)
    expect(of(s.feed, 'sys').map((x) => T(x.text))).toContain(`Urgency: immediate (rule ${rule}). Routine screening paused. Noa does not call anyone; it advised an immediate doctor visit and keeps the result ready for the doctor. Noa follows up in 2 hours.`)
    expect(T(s.status.saeed.label)).toBe('See a doctor now')
    expect(s.gov.emergencies).toBe(1)
    expect(s.gov.booked).toBe(0)
    // The person and Amna (the family contact) are told.
    expect(s.notes.filter((n) => n.icon === 'stop').map((n) => n.to).sort()).toEqual(['amna', 'saeed'])
  })
  test('emergency advice never goes through the AI port', async () => {
    const seen: SayRequest[] = []
    const ai: NoaAi = { say: async (r) => { seen.push(r); return { text: r.fallback, source: 'prepared' } }, understand: (r) => new PreparedAi().understand(r) }
    const e = new FamilyHealthEngine({ ai })
    await runCase(e, 's2')
    await drive(e)
    expect(seen.map((r) => r.skill)).toEqual(['guardian', 'forecast', 'voice'])
    expect(seen.some((r) => /emergency department/.test(r.fallback))).toBe(false)
  })
  test('amber twice is not an emergency (prototype: one retry; only red or no answer stops)', async () => {
    const e = engine()
    await runCase(e, 's0')
    const s = await drive(e, { speech: ['unclear', 'unclear'] })
    expect(s.emergency).toBe(false)
    expect(T(s.journey?.done as Txt)).toMatch(/^Referred to the right pathway/)
  })
})

describe('reply loop', () => {
  test('“not now” with urgent items escalates them to the doctor (U1); routine only is respected (N3)', async () => {
    const a = engine()
    await start(a, 'moza')
    const sa = await drive(a, { book: 'later' })
    expect(sa.rulesHit.map((r) => r.rule)).toContain('U1')
    expect(T(sa.status.moza.label)).toBe('Escalated to doctor')
    expect(sa.notes.some((n) => n.to === 'moza' && /Urgent items were sent to Dr Fatima Al Ali/.test(T(n.text as Txt)))).toBe(true)
    const b = engine()
    await start(b, 'khalid')
    const sb = await drive(b, { book: 'later' })
    expect(sb.rulesHit.map((r) => r.rule)).toContain('N3')
    expect(sb.rulesHit.map((r) => r.rule)).not.toContain('U1')
    expect(T(sb.status.khalid.label)).toBe('Not now · door open')
    expect(sb.gov.notNow).toBe(1)
  })
  test('change the time rebuilds the same checks at the new slot (T2), then books', async () => {
    const e = engine()
    await start(e, 'amna')
    const s = await drive(e, { book: ['change', 'book'], time2: 'sat' })
    const paths = of(s.feed, 'path')
    expect(paths.map((p) => p.note && T(p.note))).toEqual([null, 'Updated: same checks, new time (Sat 28 Nov, 09:30).', 'Booked pathway for Amna.'])
    expect(paths[1].path.pop.map((x) => x.id)).toEqual(paths[0].path.pop.map((x) => x.id))
    expect(T(s.status.amna.label)).toBe('Booked · Sat 28 Nov')
    expect(s.rulesHit.find((r) => r.rule === 'T2')?.count).toBe(2)
  })
  test('“why?” is answered by Forecast with the person’s own reasons (N2) and the card comes back', async () => {
    const e = engine()
    await start(e, 'khalid')
    const s = await drive(e, { book: ['why', 'book'] })
    expect(s.gov.barriers).toBe(1)
    const words = of(s.feed, 'agent').map((a) => T(a.text as Txt))
    expect(words).toContain('These checks find problems before there are symptoms, when they are easiest to treat. For you: heart and stroke risk 10% in 10 years (moderate); 2 checks overdue; family health record: 1 finding that changes the plan.')
    expect(of(s.feed, 'card').filter((c) => c.card.type === 'choice' && c.card.qid === 'book')).toHaveLength(2)
  })
})

describe('genomic result and the family record', () => {
  test('switched off: the flag goes, the pathway follows the standard guideline, no note to the children', async () => {
    const e = engine()
    await start(e, 'khalid')
    const s = await drive(e, { protect: { genomic: false, contacts: ['amna'] } })
    const flags = of(s.feed, 'flags')
    expect(flags[0].flags.some((f) => f.rule === 'P1')).toBe(true)
    expect(flags[1].flags.some((f) => f.rule === 'P1')).toBe(false)
    expect(T(flags[1].note as Txt)).toMatch(/^Updated: Khalid switched the genomic result off/)
    const path = of(s.feed, 'path')[0].path
    expect(path.pop[0].id).toBe('ifhas')
    expect(path.clin.some((c) => c.id === 'genomic')).toBe(false)
    expect(T(s.status.hamdan.label)).toBe('5-year visit due')
  })
  test('shared with Amna: X1 note, the children’s pills change, and Hamdan’s later journey uses it', async () => {
    const e = engine()
    await start(e, 'khalid')
    let s = await drive(e)
    expect(T(s.status.hamdan.label)).toBe('Cholesterol note for paediatrician')
    expect(T(s.status.hind.label)).toBe('Cholesterol note for paediatrician')
    expect(s.notes.some((n) => n.to === 'amna' && n.icon === 'family')).toBe(true)
    await start(e, 'hamdan')
    s = await drive(e)
    const fam = of(s.feed, 'famw')[0].rows.find((r) => r.rel === 'father')
    expect(T(fam?.src as Txt)).toBe('Shared by Khalid with consent')
    expect(of(s.feed, 'path')[0].path.clin.map((c) => c.id)).toEqual(['childFh'])
  })
})

describe('children', () => {
  test('Hind with few words: development review and hearing test for the paediatrician (K2)', async () => {
    const e = engine()
    await runCase(e, 'h1')
    const s = await drive(e)
    const path = of(s.feed, 'path')[0].path
    expect(path.pop.map((x) => [x.id, x.u])).toEqual([['well', 'w2'], ['mchat', 'm1']])
    expect(path.clin.map((x) => [x.id, x.u])).toEqual([['childDev', 'm1']])
    expect(s.journey?.urgent).toBeNull()
    expect(of(s.feed, 'card').map((c) => c.card.who).every((w) => T(w).startsWith('Amna'))).toBe(true)
  })
  test('Hamdan squinting (d1): possible eye referral; recall 6-year visit', async () => {
    const e = engine()
    await runCase(e, 'd1')
    const s = await drive(e)
    expect(of(s.feed, 'path')[0].path.clin.map((x) => x.id)).toEqual(['childEye'])
    expect(of(s.feed, 'sys').map((x) => T(x.text))).toContain('Recall set: 6-year visit. One reminder before; if missed, Noa asks why once.')
  })
})

describe('cancel, reset and notifications', () => {
  test('Reset mid-run cancels the journey; the next person runs clean (B1, B2)', async () => {
    const e = engine()
    await runCase(e, 's0')
    expect(e.getSnapshot().pending?.type).toBe('speech')
    const notes = e.getSnapshot().notes.length
    e.reset()
    let s = e.getSnapshot()
    expect(s.journey).toBeNull()
    expect(s.feed).toHaveLength(0)
    expect(s.pending).toBeNull()
    expect(s.notes.length).toBe(notes)
    await start(e, 'khalid')
    s = await drive(e)
    expect(T(s.journey?.done as Txt)).toMatch(/^Referred to the right pathway: 4 checks booked/)
    expect(of(s.feed, 'flags').every((f) => f.person === 'khalid')).toBe(true)
    expect(s.gov.journeys).toBe(1)
  })
  test('starting another person cancels the running journey and restores the first one’s pill', async () => {
    const e = engine()
    await runCase(e, 's0')
    const old = e.getSnapshot().pending
    await start(e, 'amna')
    expect(e.answer(old?.id as number, { said: 'x', secs: 1, how: 'typed' })).toBe(false)
    expect(T(e.getSnapshot().status.saeed.label)).toBe('Eye and kidney checks overdue')
    const s = await drive(e)
    expect(s.journey?.person).toBe('amna')
    expect(of(s.feed, 'hand').filter((h) => h.rule === 'IN')).toHaveLength(1)
  })
  test('seeded family messages are unread, kept apart from the journey and can be marked read', () => {
    const e = engine()
    const s = e.getSnapshot()
    expect(s.notes.map((n) => n.to).sort()).toEqual(['amna', 'moza', 'saeed'])
    expect(s.unread).toBe(3)
    e.markNotesRead()
    expect(e.getSnapshot().unread).toBe(0)
  })
  test('Ask Noa in family messages: a prepared answer about the running screening', async () => {
    const e = engine()
    await start(e, 'khalid')
    await e.askNoa('what is happening?')
    expect(T(e.getSnapshot().notes[0].text as Txt)).toBe('I’m working on Khalid’s screening now (protect). I’ll message the family here when something is booked or needs action.')
  })
  test('snapshots are immutable: a new object per change', async () => {
    const e = engine()
    const a = e.getSnapshot()
    expect(e.getSnapshot()).toBe(a)
    await start(e, 'amna')
    const b = e.getSnapshot()
    expect(b).not.toBe(a)
    expect(a.feed).toHaveLength(0)
  })
})

describe('clock and timing', () => {
  test('the simulated clock starts 08:40 and advances per stage', async () => {
    const e = engine()
    await start(e, 'saeed')
    const s = await drive(e)
    const times = s.hand.map((h) => h.t)
    expect(times[0]).toBe('08:40')
    expect(new Set(times).size).toBeGreaterThan(2)
    expect(s.time > '08:40').toBe(true)
  })
  test('every wait goes through the scheduler (250 / 450 around words, 1100 per hand-off, 500 for the pattern, writing time)', async () => {
    const waits: number[] = []
    const sched: Scheduler = { wait: (ms) => { waits.push(ms); return Promise.resolve() } }
    const e = new FamilyHealthEngine({ scheduler: sched })
    await runCase(e, 's0')
    const fixed = new Set([1100, 500, 250, 450])
    expect(waits.filter((w) => fixed.has(w)).length).toBeGreaterThan(0)
    // The rest is the chat-like writing time of prepared turns: base + per word, capped.
    const writing = waits.filter((w) => !fixed.has(w))
    expect(writing.length).toBeGreaterThan(0)
    expect(writing.every((w) => w >= WRITING.base && w <= WRITING.max)).toBe(true)
  })
  test('prepared turns keep the writing dots up for a chat-like time; live turns add none', async () => {
    expect(writingMs(0)).toBe(WRITING.base)
    expect(writingMs(10)).toBe(WRITING.base + 10 * WRITING.perWord)
    expect(writingMs(500)).toBe(WRITING.max)
    const waits: number[] = []
    const sched: Scheduler = { wait: (ms) => { waits.push(ms); return Promise.resolve() } }
    const live: NoaAi = { say: async () => ({ text: 'Hello from Claude.', source: 'live' }), understand: async (r) => ({ choice: r.options[0]?.id ?? '', summary: '', source: 'live' }) }
    const e = new FamilyHealthEngine({ scheduler: sched, ai: live })
    await start(e, 'amna')
    expect(waits.some((w) => w >= WRITING.base && ![1100, 500, 250, 450].includes(w))).toBe(false)
  })
})

describe('AI port', () => {
  const toQuestion = async (e: FamilyHealthEngine, qid: string) => {
    await e.whenIdle()
    for (let i = 0; i < 40; i++) {
      const c = e.getSnapshot().pending
      if (!c || (c.type === 'choice' && c.qid === qid)) return c
      e.next(); await e.whenIdle()
    }
    return null
  }
  const downplays = (calls: string[] = []): NoaAi => ({
    say: async (r) => { calls.push(r.skill); return { text: 'Live words.', source: 'live' } },
    understand: async () => ({ choice: 'none', summary: 'nothing serious', source: 'live' }),
  })
  test('two readers: a model that reads "my arm is weak" as nothing is overruled by the keyword reader (V1 emergency)', async () => {
    const e = new FamilyHealthEngine({ ai: downplays() })
    void e.runTestCase('s0')
    expect((await toQuestion(e, 'rf'))?.type).toBe('choice')
    await e.reply('my arm feels weak')
    await e.whenIdle()
    expect(e.getSnapshot().emergency).toBe(true)
    expect(e.getSnapshot().rulesHit.map((r) => r.rule)).toContain('V1')
  })
  test('an answer outside the options falls back to the keyword reading, not the default', async () => {
    const odd: NoaAi = { say: async (r) => ({ text: r.fallback, source: 'prepared' }), understand: async () => ({ choice: 'banana', summary: '', source: 'live' }) }
    const e = new FamilyHealthEngine({ ai: odd })
    void e.runTestCase('s0')
    await toQuestion(e, 'rf')
    await e.reply('chest pain')
    await e.whenIdle()
    expect(e.getSnapshot().rulesHit.map((r) => r.rule)).toContain('V2')
  })
  test('emergency words in the composer and in family messages get the fixed line and never reach the AI port', async () => {
    const calls: string[] = []
    const e = new FamilyHealthEngine({ ai: downplays(calls) })
    await e.reply('I have chest pain')
    const last = of(e.getSnapshot().feed, 'agent').at(-1)
    expect(last?.source).toBe('fixed')
    await e.askNoa('his speech is slurred')
    expect(calls).toEqual([])
  })
  test('without a live port the chip state is none and nothing reads as thinking', async () => {
    const e = new FamilyHealthEngine()
    expect(e.getSnapshot().ai).toBe('none')
    await start(e, 'amna')
    expect(e.getSnapshot().thinking).toBe(false)
    e.setAiEnabled(false)
    expect(e.getSnapshot().ai).toBe('none')
  })
  test('a live port can be switched off (prepared text) and on again from the chip', async () => {
    const live: NoaAi = { say: async () => ({ text: 'Hello from the agent.', source: 'live' }), understand: async (r) => ({ choice: r.options[0]?.id ?? '', summary: '', source: 'live' }) }
    const e = new FamilyHealthEngine({ ai: live })
    expect(e.getSnapshot().ai).toBe('live')
    e.setAiEnabled(false)
    expect(e.getSnapshot().ai).toBe('off')
    await start(e, 'amna')
    expect(of(e.getSnapshot().feed, 'agent').every((x) => x.source === 'prepared')).toBe(true)
    e.setAiEnabled(true)
    expect(e.getSnapshot().ai).toBe('live')
  })
  const liveAi = (text: string, extra: Partial<{ handoffTo: 'navigator' }> = {}): NoaAi => ({
    say: async () => ({ text, source: 'live', ...extra }),
    understand: async (r) => ({ choice: r.options[1]?.id ?? '', summary: 'read by the model', source: 'live' }),
  })
  test('live text is shown as Live AI and counted', async () => {
    const e = new FamilyHealthEngine({ ai: liveAi('Hello from Claude.') })
    await start(e, 'amna')
    const s = e.getSnapshot()
    const a = of(s.feed, 'agent')
    expect(a.every((x) => x.source === 'live' && x.text === 'Hello from Claude.')).toBe(true)
    expect(s.calls.live).toBe(a.length)
  })
  test('the guardrail swaps a dose for the prepared text', async () => {
    const e = new FamilyHealthEngine({ ai: liveAi('Take 5 mg now.') })
    await start(e, 'amna')
    const a = of(e.getSnapshot().feed, 'agent')[0]
    expect(a.source).toBe('guardrail')
    expect(T(a.text as Txt)).toMatch(/^Amna, Noa read your devices/)
    expect(T(a.note as Txt)).toBe('Guardrail: the AI text contained a dose, so the prepared text replaced it.')
    expect(e.getSnapshot().calls.guardrail).toBe(1)
  })
  test('the rule wins when the model suggests another agent (AI overruled)', async () => {
    const e = new FamilyHealthEngine({ ai: liveAi('Fine.', { handoffTo: 'navigator' }) })
    await start(e, 'amna')
    const s = e.getSnapshot()
    expect(s.calls.overruled).toBe(1)
    expect(of(s.feed, 'sys').map((x) => T(x.text))).toContain('Orchestrator: the AI suggested “Navigator”, but rule P1 routes to Guardian. Rule wins.')
  })
  test('free text on a card is read by understand(); the keyword reader is the default', async () => {
    const e = engine()
    await runCase(e, 's0')
    await drive(e, { speech: ['usual'] }, 1)
    expect(e.getSnapshot().pending?.type).toBe('choice')
    await e.reply('my face feels numb')
    await e.whenIdle()
    const s = e.getSnapshot()
    expect(of(s.feed, 'sys').map((x) => T(x.text))).toContain('Keyword reader (AI off) read it as: My face or arm feels weak')
    expect(of(s.feed, 'card').map((c) => T(c.picked)).at(-1)).toBe('My face or arm feels weak (read by keywords)')
    expect(s.emergency).toBe(true)
  })
  test('a typed answer to the speech card is scored without time', async () => {
    const e = engine()
    await runCase(e, 's0')
    await e.reply('The sky is blue in Abu Dhabi')
    await e.whenIdle()
    const me = of(e.getSnapshot().feed, 'me')[0]
    expect(T(me.who)).toBe('Saeed (typed)')
    expect(T(me.chip as Txt)).toBe('Noa Voice: as usual · score 1.00 · 7/7 words')
  })
})

describe('Try different data', () => {
  test('a resting heart of 130 makes Noa prompt a check by itself; out-of-range values are refused', async () => {
    const e = engine()
    expect(e.editProfile('khalid', 'hr', 130).ok).toBe(true)
    expect(e.editProfile('khalid', 'hr', 500).ok).toBe(false)
    expect(e.editProfile('hind', 'hr', 100).ok).toBe(false)
    await start(e, 'khalid')
    const s = e.getSnapshot()
    expect(s.journey?.urgent).toBe('G1')
    expect(of(s.feed, 'push')).toHaveLength(1)
  })
  test('toggles and weight change the flags (BMI is worked out again)', async () => {
    const e = engine()
    e.toggleProfile('amna', 'smoker')
    e.editProfile('amna', 'wt', 90)
    expect(e.recordView('amna').bmi).toBe(34.3)
    await start(e, 'amna')
    await drive(e, {}, 1)
    const rules = of(e.getSnapshot().feed, 'flags')[0].flags.map((f) => f.rule)
    expect(rules.slice(0, 2)).toEqual(['W1', 'K1'])
  })
  test('the record view counts what is overdue and due', () => {
    const r = engine().recordView('hind')
    expect([r.overdue, r.due, T(r.age)]).toEqual([3, 0, '18 months'])
    expect(engine().recordView('moza').screening.find((x) => x.prog === 'breast')?.st).toBe('ended')
  })
})

describe('quick test cases', () => {
  const END: Record<TestCaseId, RegExp> = {
    s0: /^Referred to the right pathway: 5 checks booked, 2 items/,
    s2: /^Screening paused/,
    s3: /^Referred to the right pathway: 5 checks booked, 2 items/,
    k1: /^Referred to the right pathway: 4 checks booked, 2 items/,
    k3: /^Routine checks paused/,
    k4: /^Referred to the right pathway: 4 checks booked, 3 items/,
    a1: /^Referred to the right pathway: 2 checks booked, 1 item for/,
    m1: /^Referred to the right pathway: 3 checks booked, 5 items/,
    h1: /^Referred to the right pathway: 2 checks booked, 1 item for/,
    d1: /^Referred to the right pathway: 2 checks booked, 1 item for/,
  }
  test.each(TEST_CASES.map((t) => t.id))('%s runs to its expected end with Next only', async (id) => {
    const e = engine()
    await runCase(e, id)
    const s = await drive(e)
    expect(T(s.journey?.done as Txt)).toMatch(END[id])
    expect(T({ k: `testCases.${id}.title` })).not.toContain('testCases.')
  })
  test('k1 and a1 are the prototype’s Khalid and Amna journeys', async () => {
    const k = engine(); await runCase(k, 'k1')
    const n = engine(); await start(n, 'khalid')
    expect(view(await drive(k)).agents).toEqual(view(await drive(n)).agents)
  })
  test('k3: chest tightness is a doctor’s appointment within 1 week, escalated on “not now” (B11)', async () => {
    const e = engine()
    await runCase(e, 'k3')
    const s = await drive(e)
    const clin = of(s.feed, 'path')[0].path.clin[0]
    expect([clin.id, clin.u]).toEqual(['symChest', 'w1'])
    expect(s.rulesHit.map((r) => r.rule)).toEqual(expect.arrayContaining(['H2', 'U1']))
  })
})

describe('every text resolves in English and Arabic', () => {
  const texts = (x: unknown, out: Txt[] = []): Txt[] => {
    if (x && typeof x === 'object') {
      if ('k' in (x as object) && typeof (x as Txt).k === 'string') out.push(x as Txt)
      for (const v of Object.values(x as object)) texts(v, out)
    }
    return out
  }
  test.each(['s0', 's3', 'k3', 'k4', 'm1', 'h1', 'd1', 'a1'] as TestCaseId[])('%s', async (id) => {
    const e = engine()
    await runCase(e, id)
    const s = await drive(e)
    const all = texts([s.feed, s.status, s.notes, e.recordView(s.journey?.person as PersonId)])
    expect(all.length).toBeGreaterThan(50)
    for (const t of all) {
      for (const [lang, R] of [['en', T], ['ar', TAR]] as const) {
        const out = R(t)
        expect(out, `${lang} ${t.k}`).not.toContain('{{')
        expect(out, `${lang} ${t.k}`).not.toBe(t.k)
      }
    }
  })
})

describe('card edits and live box', () => {
  test('updateCard: the protect card’s switches and a questionnaire answer are what Next confirms', async () => {
    const e = engine()
    await start(e, 'khalid')
    let c = e.getSnapshot().pending
    expect(c?.type).toBe('protect')
    e.updateCard(c?.id as number, { gen: false, sel: ['amna', 'moza'] })
    e.next()
    await e.whenIdle()
    expect(e.getSnapshot().journey?.genomic).toBe(false)
    expect(e.getSnapshot().journey?.share).toEqual(['amna', 'moza'])
    c = e.getSnapshot().pending
    expect(c?.type === 'qset' && c.test).toBe('dmrisk')
    e.updateCard(c?.id as number, { vals: { act: true } })
    e.next()
    await e.whenIdle()
    expect(of(e.getSnapshot().feed, 'card').filter((x) => x.picked).map((x) => T(x.picked)).at(-1)).toBe('Diabetes risk test: Score 2: below 5')
  })
  test('digits in noise: wrong digits refer for a full hearing test', async () => {
    const e = engine()
    await start(e, 'saeed')
    const s = await drive(e, { din: (c) => (c.type === 'din' ? ['472', '000', '386'] : []) }, 2)
    expect(of(s.feed, 'card').map((x) => T(x.picked))).toContain('Hearing: 2 of 3 correct')
  })
  test('the live box shows the recorded blood pressure (B10) and today’s heart only for a heart alert', async () => {
    const { syncValues, PROFILES0 } = await import('@/features/familyHealth')
    const p = PROFILES0.saeed as Exclude<typeof PROFILES0.saeed, { child: true }>
    expect(syncValues('saeed', p, null)).toMatchObject({ hr: 71, sbp: 138, dbp: 82, glu: 6.8 })
    expect(syncValues('saeed', { ...p, hr: 128 }, 'G1')).toMatchObject({ hr: 128, hot: true })
  })
})
