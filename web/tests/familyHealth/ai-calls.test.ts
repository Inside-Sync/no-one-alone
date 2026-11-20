import { EMERGENCY, FamilyHealthEngine, PreparedAi, SAY_CALLS, TEST_CASES, type NoaAi, type PersonId, type SayRequest, type SayResult, type UnderstandRequest } from '@/features/familyHealth'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { T, drive, of } from './helpers'

const SAMPLES = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/noa-say-params.json'), 'utf8')) as Record<string, Record<string, unknown>>
// Server QUESTIONS option sets in agents/respond/noa.py.
const SERVER_IDS: Record<string, string[]> = {
  rf: ['chest', 'faint', 'none', 'palp', 'weak'], sym: ['bowel', 'breast', 'chest', 'none', 'thirst'], pref: ['female', 'home', 'one'],
  time: ['am', 'eve', 'pm', 'sat'], book: ['book', 'change', 'later', 'why'], words: ['few', 'many', 'some'],
}
const strings = (x: unknown): string[] => typeof x === 'string' ? [x] : Array.isArray(x) ? x.flatMap(strings) : x && typeof x === 'object' ? Object.values(x).flatMap(strings) : []
// Server models in agents/respond/noa.py: Short 120 chars, Text 300, Question 500, list caps, integer fields.
const SHORT = new Set(['audience', 'name', 'call', 'parent', 'child', 'patient', 'age', 'segment', 'certainty', 'test', 'journey_stage', 'symptom', 'risk', 'tests', 'shared_with'])
const CAPS: Record<string, number> = {
  'detect.forecast.flags': 12, 'detect.forecast.flags[].factors': 8, 'detect.forecast.family_effects': 8, 'protect.guardian.shared_with': 8,
  'home.voice.intro.tests': 8, 'home.insight.results': 8, 'pathway.navigator.offer.population_priority': 10, 'pathway.navigator.offer.for_the_doctor': 10,
  'pathway.forecast.why.flags': 6, 'pathway.forecast.why.pathway': 10, 'pathway.navigator.u1.urgent': 10, 'referral.courier.booked': 10,
  'referral.courier.for_doctor_decision': 10, 'referral.courier.flags': 12, 'family.chat.notifications': 6,
}
const OPTIONAL = new Set(['symptom', 'risk', 'journey_stage'])
const INTEGERS = new Set(['home.voice.child.age_months', 'referral.analyst.booked'])
/** Where `value` differs from the server-shape sample in keys, types, string length, list size or integer-ness (null only for the optional fields). */
function shapeErrors(sample: unknown, value: unknown, path: string): string[] {
  const key = path.replace(/\[\d+\]/g, '[]'), name = key.split('.').pop()!.replace(/\[\]/g, '')
  if (value === null || value === undefined) return OPTIONAL.has(name) ? [] : [`${path}: null`]
  if (Array.isArray(sample)) {
    if (!Array.isArray(value)) return [`${path}: expected an array`]
    const cap = CAPS[key] === undefined ? [] : value.length > CAPS[key] ? [`${path}: ${value.length} items, cap ${CAPS[key]}`] : []
    return [...cap, ...(sample.length ? value.flatMap((v, i) => shapeErrors(sample[0], v, `${path}[${i}]`)) : [])]
  }
  if (sample && typeof sample === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${path}: expected an object`]
    if (path.endsWith('home_screening')) {
      const e = Object.entries(value)
      return [...(e.length > 12 ? [`${path}: ${e.length} keys, cap 12`] : []),
        ...e.flatMap(([k, v]) => !['string', 'number', 'boolean'].includes(typeof v) ? [`${path}.${k}: ${typeof v}`] : typeof v === 'string' && v.length > 120 ? [`${path}.${k}: longer than 120`] : [])]
    }
    const want = Object.keys(sample).sort(), got = Object.keys(value).sort()
    return want.join() === got.join() ? want.flatMap((k) => shapeErrors((sample as Record<string, unknown>)[k], (value as Record<string, unknown>)[k], `${path}.${k}`)) : [`${path}: keys ${got} want ${want}`]
  }
  if (typeof value !== typeof sample) return [`${path}: ${typeof value} want ${typeof sample}`]
  if (INTEGERS.has(key) && !Number.isInteger(value)) return [`${path}: not an integer`]
  if (typeof value === 'string') {
    const max = name === 'question' ? 500 : SHORT.has(name) ? 120 : 300
    if (value.length > max) return [`${path}: ${value.length} chars, max ${max}`]
  }
  return []
}

/** A recording port: live text (optionally with a rule id), and a fixed `understand` choice. */
function recorder(opts: { ruleId?: string; choice?: string } = {}) {
  const says: SayRequest[] = [], reads: UnderstandRequest[] = []
  const ai: NoaAi = {
    say: async (r) => { says.push(r); return { text: 'Live words.', source: 'live', ruleId: opts.ruleId } },
    understand: async (r) => { reads.push(r); return { choice: opts.choice ?? r.options[0]?.id ?? '', summary: '', source: 'live' } },
  }
  return { ai, says, reads }
}
const FAST = ['detect.guardian', 'protect.guardian', 'home.voice.intro', 'home.voice.retry', 'home.voice.child', 'composer.reply', 'family.chat']

describe('AI port: call ids and model tiers', () => {
  test('SAY_CALLS lists the 15 call sites; fast = Guardian, Voice, composer, family chat; the rest strong', () => {
    expect(Object.keys(SAY_CALLS)).toHaveLength(15)
    for (const [id, c] of Object.entries(SAY_CALLS)) {
      expect(c.tier).toBe(FAST.includes(id) ? 'fast' : 'strong')
      expect(c.purpose.length).toBeGreaterThan(10)
    }
  })
  test('every say of every journey carries a known callId and its tier; every understand is fast', async () => {
    const seen = new Set<string>()
    const keys = new Map<string, Set<string>>()
    const runs: { k?: PersonId; tc?: (typeof TEST_CASES)[number]['id']; script?: Record<string, string | string[]> }[] = [
      ...TEST_CASES.map((t) => ({ tc: t.id })),
      { k: 'khalid', script: { book: ['why', 'change', 'later'] } }, { k: 'saeed', script: { book: 'later' } }, { k: 'hind' },
    ]
    for (const lang of ['en', 'ar'] as const) for (const r of runs) {
      const { ai, says } = recorder()
      const e = new FamilyHealthEngine({ ai })
      e.setLang(lang)
      void (r.tc ? e.runTestCase(r.tc) : e.startJourney(r.k as PersonId))
      await drive(e, r.script)
      await e.reply('what happens next?')
      await e.askNoa('how is grandpa?')
      for (const s of says) {
        expect(SAY_CALLS[s.callId]).toBeDefined()
        expect(s.tier).toBe(SAY_CALLS[s.callId].tier)
        seen.add(s.callId)
        keys.set(s.callId, new Set([...(keys.get(s.callId) ?? []), ...Object.keys(s.facts), 'audience']))
        for (const v of strings(s.facts)) expect(v.length, `${lang} ${s.callId}`).toBeLessThanOrEqual(300)
        expect(shapeErrors(SAMPLES[s.callId], { ...s.facts, audience: s.audience }, s.callId), `${lang} ${s.callId}`).toEqual([])
      }
      for (const c of of(e.getSnapshot().feed, 'card')) {
        if (c.card.type !== 'choice' || !c.card.free) continue
        const qid = c.card.qid === 'time2' ? 'time' : c.card.qid
        for (const o of c.card.opts) expect(SERVER_IDS[qid], `${lang} ${qid}`).toContain(o.id)
      }
    }
    for (const [id, k] of keys) expect([...k].sort(), id).toEqual(Object.keys(SAMPLES[id]).sort())
    // The amber retry needs the slightly slurred sample (s0 uses it); every other site is reached by the runs above.
    expect([...seen].sort()).toEqual(Object.keys(SAY_CALLS).sort())
  })
  test('understand gets the fast tier', async () => {
    const { ai, reads } = recorder({ choice: 'none' })
    const e = new FamilyHealthEngine({ ai })
    void e.runTestCase('s0')
    await drive(e, { speech: ['usual'] }, 2)
    await e.reply('my heart is pounding')
    expect(reads.length).toBeGreaterThan(0)
    expect(reads.every((r) => r.tier === 'fast')).toBe(true)
  })
})

describe('AI port: ruleId from a live turn', () => {
  const firstAgentWhy = async (ruleId: string) => {
    const e = new FamilyHealthEngine({ ai: recorder({ ruleId }).ai })
    void e.startJourney('khalid')
    await e.whenIdle()
    return of(e.getSnapshot().feed, 'agent').map((a) => (a.why ? T(a.why) : null))
  }
  test('a valid rule code is shown in the why line', async () => {
    const why = await firstAgentWhy('G1')
    expect(why[0]).toMatch(/^Rule G1: /)
  })
  test('an unknown code is ignored (the prepared why line stays)', async () => {
    const valid = await firstAgentWhy('D1'), bad = await firstAgentWhy('ZZ9')
    expect(bad.some((w) => w?.startsWith('Rule ZZ9'))).toBe(false)
    expect(bad[0]).toBe('Rule D1: Every flag shows its main factors, its data source and how certain it is. A flag is a population priority, not a diagnosis')
    expect(valid[0]).toBe(bad[0])
  })
  test('a rule id never changes routing or decisions', async () => {
    const plain = new FamilyHealthEngine({ ai: recorder().ai }), ruled = new FamilyHealthEngine({ ai: recorder({ ruleId: 'U1' }).ai })
    void plain.startJourney('khalid'); void ruled.startJourney('khalid')
    const a = await drive(plain), b = await drive(ruled)
    expect(b.hand.map((h) => `${h.from}>${h.to}:${h.rule}`)).toEqual(a.hand.map((h) => `${h.from}>${h.to}:${h.rule}`))
    expect(b.rulesHit).toEqual(a.rulesHit)
    expect(T(b.journey?.done ?? null)).toBe(T(a.journey?.done ?? null))
  })
})

describe('understand: an invalid model choice never becomes "none"', () => {
  const atRf = async (choice: string) => {
    const e = new FamilyHealthEngine({ ai: recorder({ choice }).ai })
    void e.runTestCase('s0')
    await drive(e, { speech: ['usual'] }, 2)
    expect(e.getSnapshot().pending?.type === 'choice' && e.getSnapshot().pending).toMatchObject({ qid: 'rf' })
    return e
  }
  test('“I feel faint” with an invalid choice ends in the emergency stop (V2)', async () => {
    const e = await atRf('banana')
    await e.reply('I feel faint')
    await e.whenIdle()
    const s = e.getSnapshot()
    expect(s.emergency).toBe(true)
    expect(s.rulesHit.map((r) => r.rule)).toContain('V2')
  })
  test('“fine” with an invalid choice stays non-urgent', async () => {
    const e = await atRf('')
    await e.reply('fine')
    await e.whenIdle()
    const s = e.getSnapshot()
    expect(s.emergency).toBe(false)
    expect(of(s.feed, 'card').map((c) => c.card.type === 'choice' && c.card.qid === 'rf' ? T(c.picked) : null).filter(Boolean)).toEqual(['No, I feel OK (read by keywords)'])
  })
})

describe('Arabic emergency words never reach the AI port', () => {
  test('composer: the fixed safety line, no composer.reply call', async () => {
    const { ai, says } = recorder()
    const e = new FamilyHealthEngine({ ai })
    await e.reply('أشعر بألم في الصدر')
    await e.whenIdle()
    expect(says.filter((s) => s.callId === 'composer.reply')).toHaveLength(0)
    expect(of(e.getSnapshot().feed, 'agent').at(-1)?.source).toBe('fixed')
  })
  test('composer and family chat: the wider English and Arabic emergency words also stay off the AI port', async () => {
    for (const w of ['I feel dizzy', 'he is unconscious', 'she collapsed', 'my face droops', 'trouble with breathing', 'صعوبة في التنفس', 'فقد الوعي', 'عنده نزيف']) {
      const { ai, says } = recorder()
      const e = new FamilyHealthEngine({ ai })
      await e.reply(w)
      await e.askNoa(w)
      expect(says, w).toHaveLength(0)
    }
  })
  test('a server emergency refusal shows the fixed safety line in the composer and in family chat', async () => {
    const ai: NoaAi = { say: async () => ({ text: 'Prepared.', source: 'guardrail', emergency: true }), understand: async () => ({ choice: 'none', summary: '', source: 'live' }) }
    const e = new FamilyHealthEngine({ ai })
    await e.reply('my arm feels strange')
    await e.askNoa('grandpa is acting strange')
    const last = of(e.getSnapshot().feed, 'agent').at(-1)
    expect(last?.source).toBe('fixed')
    expect(T(last?.text ?? null)).toBe('If your face or arm is weak, your speech changes, or you have chest pain or feel faint, call 998 now.')
    expect(T(e.getSnapshot().notes[0].text)).toBe('If anyone has slurred speech, face or arm weakness, chest pain or confusion, they should see a doctor immediately at the emergency department.')
  })
  test('family chat: the fixed safety line, no family.chat call', async () => {
    const { ai, says } = recorder()
    const e = new FamilyHealthEngine({ ai })
    await e.askNoa('جدي يشعر بدوخة')
    expect(says.filter((s) => s.callId === 'family.chat')).toHaveLength(0)
    expect(T(e.getSnapshot().notes[0].text)).toBe('If anyone has slurred speech, face or arm weakness, chest pain or confusion, they should see a doctor immediately at the emergency department.')
  })
})

describe('the keyword reader reads Arabic replies', () => {
  const read = async (qid: string, reply: string) => (await new PreparedAi().understand({ tier: 'fast', qid, question: '', options: [], reply, lang: 'ar' })).choice
  test('rf: weakness, chest, faint, palpitations, none', async () => {
    expect(await read('rf', 'ذراعي فيها ضعف')).toBe('weak')
    expect(await read('rf', 'أشعر بألم في الصدر')).toBe('chest')
    expect(await read('rf', 'أشعر بدوخة')).toBe('faint')
    expect(await read('rf', 'عندي خفقان')).toBe('palp')
    expect(await read('rf', 'لا، أنا بخير')).toBe('none')
  })
  test('sym: thirst, bowel, breast, chest, none', async () => {
    expect(await read('sym', 'أشعر بعطش دائم')).toBe('thirst')
    expect(await read('sym', 'لاحظت تغيرا في البراز')).toBe('bowel')
    expect(await read('sym', 'وجدت كتلة في الثدي')).toBe('breast')
    expect(await read('sym', 'ضيق في الصدر عند المشي')).toBe('chest')
    expect(await read('sym', 'لا شيء من هذا')).toBe('none')
  })
  test('words: few, many, some', async () => {
    expect(await read('words', 'لا يتكلم بعد')).toBe('few')
    expect(await read('words', 'يقول كلمات كثيرة')).toBe('many')
    expect(await read('words', 'بعض الكلمات')).toBe('some')
  })
})

describe('the page-open auto-run and the thinking flag', () => {
  test('runTestCase with prepared: no say reaches the AI port; a typed reply on a free card still does', async () => {
    const { ai, says, reads } = recorder({ choice: 'none' })
    const e = new FamilyHealthEngine({ ai })
    void e.runTestCase('s0', { prepared: true })
    await drive(e, { speech: ['usual'] }, 2)
    expect(says).toHaveLength(0)
    await e.reply('my heart is pounding')
    expect(reads).toHaveLength(1)
  })
  test('a late answer from a cancelled journey does not clear thinking for the new one', async () => {
    const answers: ((r: SayResult) => void)[] = []
    const ai: NoaAi = { say: () => new Promise((res) => answers.push(res)), understand: async () => ({ choice: 'none', summary: '', source: 'live' }) }
    const e = new FamilyHealthEngine({ ai })
    void e.startJourney('saeed')
    await vi.waitFor(() => expect(answers).toHaveLength(1))
    e.reset()
    void e.startJourney('saeed')
    await vi.waitFor(() => expect(answers).toHaveLength(2))
    answers[0]({ text: 'Old words.', source: 'live' })
    await new Promise((r) => setTimeout(r, 0))
    expect(e.thinking).toBe(true)
  })
})

describe('one emergency word list, the same as the server one', () => {
  test('the web pattern is the server EMERGENCY pattern', () => {
    const py = readFileSync(join(import.meta.dirname, '../../../agents/respond/noa.py'), 'utf8')
    const server = /^EMERGENCY = re\.compile\(r"(.*)", re\.I\)$/m.exec(py)?.[1]
    expect(EMERGENCY.source).toBe(server)
    expect(EMERGENCY.flags).toBe('i')
  })
  test('composer: slurring, confused, numb, stroke give the fixed safety line with the AI off', async () => {
    for (const w of ['he is slurring', 'she looks confused', 'my hand is numb', 'maybe a stroke']) {
      const e = new FamilyHealthEngine()
      await e.reply(w)
      await e.whenIdle()
      expect(of(e.getSnapshot().feed, 'agent').at(-1)?.source, w).toBe('fixed')
    }
  })
  test('family chat: pain gives the fixed safety line with the AI off', async () => {
    const e = new FamilyHealthEngine()
    await e.askNoa('grandpa has pain')
    expect(T(e.getSnapshot().notes[0].text)).toBe('If anyone has slurred speech, face or arm weakness, chest pain or confusion, they should see a doctor immediately at the emergency department.')
  })
})

describe('cancelled runs', () => {
  const held = () => {
    const answers: ((r: SayResult) => void)[] = []
    const ai: NoaAi = { say: () => new Promise((res) => answers.push(res)), understand: async () => ({ choice: 'none', summary: '', source: 'live' }) }
    return { ai, answers }
  }
  test('reset cancels a composer question asked with no journey running', async () => {
    const { ai, answers } = held()
    const e = new FamilyHealthEngine({ ai })
    void e.reply('what happens next?')
    await vi.waitFor(() => expect(answers).toHaveLength(1))
    e.reset()
    answers[0]({ text: 'Late words.', source: 'live' })
    await new Promise((r) => setTimeout(r, 0))
    expect(e.getSnapshot().calls.live).toBe(0)
  })
  test('a typed reply read after reset is dropped, not applied', async () => {
    let release: (r: { choice: string; summary: string; source: 'live' }) => void = () => {}
    const ai: NoaAi = { say: async () => ({ text: 'Words.', source: 'live' }), understand: () => new Promise((res) => { release = res }) }
    const e = new FamilyHealthEngine({ ai })
    void e.runTestCase('s0')
    await drive(e, { speech: ['usual'] }, 2)
    const typed = e.reply('my heart is pounding')
    await new Promise((r) => setTimeout(r, 0))
    e.reset()
    release({ choice: 'none', summary: '', source: 'live' })
    await typed
    expect(e.getSnapshot().calls.live).toBe(0)
  })
})
