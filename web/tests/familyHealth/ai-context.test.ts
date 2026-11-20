import { FamilyHealthEngine, type NoaAi, type SayRequest } from '@/features/familyHealth'
import { T, drive } from './helpers'

/**
 * The chat calls carry the case so far (server PR #86): the conversation, what Detect found, what is booked and what the person
 * can press. Routine family notices are worded by the AI (family.notify, PR #87); urgent ones never are.
 */
const recorder = (text = 'Live words.') => {
  const says: SayRequest[] = []
  const ai: NoaAi = {
    say: async (r) => { says.push(r); return { text, source: 'live' } },
    understand: async (r) => ({ choice: r.options[0]?.id ?? '', summary: '', source: 'live' }),
  }
  return { ai, says }
}
const facts = (says: SayRequest[], id: string) => says.filter((s) => s.callId === id).map((s) => s.facts)

test('Ask Noa after Detect sends the urgent rule, the signal, the flags and what the person can press', async () => {
  const { ai, says } = recorder()
  const e = new FamilyHealthEngine({ ai })
  void e.runTestCase('s0')
  await e.whenIdle()
  expect(e.getSnapshot().pending?.type).toBe('go')
  await e.reply('what did you find?')
  const f = facts(says, 'composer.reply')[0] as { detect: { urgent_rule: string; signal: string; flags: string[] }; can_do: string[]; history: unknown[]; pathway: unknown }
  expect(f.detect.urgent_rule).toBe('G1')
  expect(f.detect.signal).toMatch(/128/)
  expect(f.detect.flags.length).toBeGreaterThan(0)
  expect(f.detect.flags.length).toBeLessThanOrEqual(3)
  expect(f.can_do[0]).toMatch(/Start home screening/)
  expect(f.history).toEqual([])
  expect(f.pathway).toBeNull()
})

test('the composer remembers the conversation (at most 6 turns) and lists bookings only once they are made', async () => {
  const { ai, says } = recorder('A doctor decides; the pathway card has the booking buttons.')
  const e = new FamilyHealthEngine({ ai })
  void e.startJourney('khalid')
  await drive(e)
  for (const q of ['what is booked?', 'sunday?', '10am pls', 'thanks', 'ok']) await e.reply(q)
  const all = facts(says, 'composer.reply') as { history: { by: string; text: string }[]; pathway: { booked: { check: string; where: string; when: string }[]; for_the_doctor: string[] } }[]
  expect(all[1].history).toEqual([{ by: 'person', text: 'what is booked?' }, { by: 'noa', text: 'A doctor decides; the pathway card has the booking buttons.' }])
  expect(all[3].history).toHaveLength(6)
  expect(all[4].history).toHaveLength(6)
  expect(all[4].history[0].text).toBe('sunday?')
  expect(all[0].pathway.booked.length).toBeGreaterThan(0)
  for (const b of all[0].pathway.booked) expect(b.where && b.when).toBeTruthy()
})

test('a question answered with the fixed emergency line stays out of the history', async () => {
  const { ai, says } = recorder()
  const e = new FamilyHealthEngine({ ai })
  void e.startJourney('khalid')
  await e.whenIdle()
  await e.reply('my chest hurts')
  await e.reply('what happens next?')
  const all = facts(says, 'composer.reply') as { history: unknown[] }[]
  expect(all).toHaveLength(1)
  expect(all[0].history).toEqual([])
})

test('family chat sends each member’s state and the last turns', async () => {
  const { ai, says } = recorder('Saeed is fine.')
  const e = new FamilyHealthEngine({ ai })
  await e.askNoa('how is grandpa?')
  await e.askNoa('and grandma?')
  const all = facts(says, 'family.chat') as { family: { name: string; emergency: boolean }[]; history: unknown[] }[]
  expect(all[0].family).toHaveLength(6)
  expect(all[0].family.every((m) => m.emergency === false)).toBe(true)
  expect(all[0].history).toEqual([])
  expect(all[1].history).toEqual([{ by: 'person', text: 'how is grandpa?' }, { by: 'noa', text: 'Saeed is fine.' }])
  expect(e.getSnapshot().notes[0].source).toBe('live')
})

test('routine notices are worded by the AI and marked live; the page-open auto-run and urgent notices are not', async () => {
  const { ai, says } = recorder('Khalid, your checks are booked for Saturday.')
  const e = new FamilyHealthEngine({ ai, seedNotes: false })
  void e.startJourney('khalid')
  await drive(e)
  await Promise.resolve()
  const notify = says.filter((s) => s.callId === 'family.notify')
  expect(notify.length).toBeGreaterThan(0)
  for (const n of notify) expect(['routine', 'soon']).toContain(n.facts.urgency)
  expect(e.getSnapshot().notes.some((n) => n.source === 'live' && n.text === 'Khalid, your checks are booked for Saturday.')).toBe(true)

  const quiet = recorder()
  const q = new FamilyHealthEngine({ ai: quiet.ai, seedNotes: false })
  void q.runTestCase('k1', { prepared: true })
  await q.whenIdle()
  expect(q.getSnapshot().pending?.type).toBe('go')
  expect(quiet.says.filter((s) => s.callId === 'family.notify')).toEqual([])

  const urgent = recorder()
  const u = new FamilyHealthEngine({ ai: urgent.ai, seedNotes: false })
  void u.runTestCase('s2')
  await drive(u, { speech: 'slurred' })
  expect(u.getSnapshot().emergency).toBe(true)
  expect(urgent.says.filter((s) => s.callId === 'family.notify').map((s) => s.facts.event)).toEqual([])
})

test('a refusal blocked by the guardrail gets an answer that respects the choice, not "ask the doctor"', async () => {
  const ai: NoaAi = {
    say: async (r) => ({ text: r.fallback, source: 'guardrail', note: 'Guardrail: the AI text promised an action the app does not take, so the prepared text replaced it.' }),
    understand: async (r) => ({ choice: r.options[0]?.id ?? '', summary: '', source: 'live' }),
  }
  const e = new FamilyHealthEngine({ ai })
  void e.runTestCase('s0')
  await e.whenIdle()
  await e.reply('i dont want to start now')
  const last = e.getSnapshot().feed.filter((m) => m.kind === 'agent').at(-1) as { source: string; text: unknown }
  expect(last.source).toBe('guardrail')
  expect(T(last.text as never)).toMatch(/^That’s your choice, Saeed\. Nothing moves on until you choose/)
})
