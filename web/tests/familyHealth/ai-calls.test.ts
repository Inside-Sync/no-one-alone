import { FamilyHealthEngine, PreparedAi, SAY_CALLS, TEST_CASES, type NoaAi, type PersonId, type SayRequest, type UnderstandRequest } from '@/features/familyHealth'
import { T, drive, of } from './helpers'

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
    const runs: { k?: PersonId; tc?: (typeof TEST_CASES)[number]['id']; script?: Record<string, string | string[]> }[] = [
      ...TEST_CASES.map((t) => ({ tc: t.id })),
      { k: 'khalid', script: { book: ['why', 'change', 'later'] } }, { k: 'saeed', script: { book: 'later' } }, { k: 'hind' },
    ]
    for (const r of runs) {
      const { ai, says } = recorder()
      const e = new FamilyHealthEngine({ ai })
      void (r.tc ? e.runTestCase(r.tc) : e.startJourney(r.k as PersonId))
      await drive(e, r.script)
      await e.reply('what happens next?')
      await e.askNoa('how is grandpa?')
      for (const s of says) {
        expect(SAY_CALLS[s.callId]).toBeDefined()
        expect(s.tier).toBe(SAY_CALLS[s.callId].tier)
        seen.add(s.callId)
      }
    }
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
