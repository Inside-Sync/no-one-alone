import { FamilyHealthEngine, TEST_CASES, type NoaAi, type TestCaseId } from '@/features/familyHealth'
import { URGENCY } from '@/features/familyHealth/engine/ai'
import { view } from './helpers'

const BAD_TEXT = ['Take 500 mg aspirin now.', 'You do not need to call 998, just rest.', 'Live words.']
/** A live port that does everything wrong: unsafe text, a wrong next agent, a rule id, and the least urgent reading of every reply. */
function hostile(): NoaAi {
  let n = 0
  return {
    say: async () => ({ text: BAD_TEXT[n++ % BAD_TEXT.length], source: 'live', handoffTo: 'analyst', ruleId: 'U1' }),
    understand: async (r) => {
      const u = URGENCY[r.qid] ?? {}
      const least = [...r.options].sort((a, b) => (u[a.id] ?? 0) - (u[b.id] ?? 0))[0]
      return { choice: least?.id ?? 'none', summary: '', source: 'live' }
    },
  }
}
const REPLY: Record<string, string> = { rf: 'my arm feels weak', sym: 'I have chest pain', words: 'one or two words' }

async function run(id: TestCaseId, ai?: NoaAi, lang: 'en' | 'ar' = 'en') {
  const e = new FamilyHealthEngine({ ai })
  e.setLang(lang)
  void e.runTestCase(id)
  await e.whenIdle()
  for (let i = 0; i < 80; i++) {
    const c = e.getSnapshot().pending
    if (!c) break
    if (c.type === 'choice' && c.free && REPLY[c.qid]) await e.reply(REPLY[c.qid])
    else e.next()
    await e.whenIdle()
  }
  const s = e.getSnapshot()
  const v = view(s)
  // Wording, counters and the "read by" label may differ; everything else is the outcome.
  const outcome = { ...v, agents: undefined, counters: undefined, sys: undefined, picks: v.picks.map((p) => p.replace(/ \(read by (AI|keywords)\)$/, '')) }
  return { outcome, agents: v.agents, picks: v.picks, status: s.status }
}

describe('a live AI changes wording only, never a test case outcome', () => {
  test.each(TEST_CASES.flatMap((t) => (['en', 'ar'] as const).map((lang) => [t.id, lang] as const)))('%s (%s)', async (id, lang) => {
    const prepared = await run(id, undefined, lang), live = await run(id, hostile(), lang)
    expect(live.outcome).toEqual(prepared.outcome)
    expect(live.status).toEqual(prepared.status)
    expect(live.agents.length).toBe(prepared.agents.length)
    expect(live.agents.some((a) => /mg|do not need to call/.test(a.text))).toBe(false)
  })
  test('s0: a weak arm typed in reply is read as weak, by keywords, when the model says none', async () => {
    const live = await run('s0', hostile())
    expect(live.picks).toContain('My face or arm feels weak (read by keywords)')
  })
})
