import { FamilyHealthEngine, type NoaAi, type SayRequest } from '@/features/familyHealth'
import { T, drive, of } from './helpers'

/**
 * While the journey is on the emergency branch (rules: see a doctor now), the composer and the family messages never reach the AI.
 * A live model asked "book a home visit on Sunday" would offer a booking that contradicts the urgent advice; the fixed line repeats
 * the advice and says screening and bookings wait for the doctor.
 */
const spyAi = (calls: SayRequest[]): NoaAi => ({
  say: async (r) => { calls.push(r); return { text: 'Sure, I can book that for Sunday.', source: 'live' } },
  understand: async (r) => ({ choice: r.options[0]?.id ?? '', summary: '', source: 'live' }),
})

const toEmergency = async (calls: SayRequest[]) => {
  const e = new FamilyHealthEngine({ ai: spyAi(calls) })
  void e.runTestCase('s2')
  await drive(e, { speech: 'slurred' })
  expect(e.getSnapshot().emergency).toBe(true)
  calls.length = 0
  return e
}

test('in an emergency the composer answers with the fixed advice, never the AI', async () => {
  const calls: SayRequest[] = []
  const e = await toEmergency(calls)
  await e.reply('can you book a doctor to visit me at home this Sunday?')
  await e.whenIdle()
  const last = of(e.getSnapshot().feed, 'agent').at(-1)!
  expect(last.source).toBe('fixed')
  expect(T(last.text)).toBe('Saeed, please see a doctor now at the nearest emergency department; ask someone to take you, or call 998 if you cannot get there safely. Screening and bookings are paused until a doctor has seen you.')
  expect(calls.map((c) => c.callId)).not.toContain('composer.reply')
})

test('in an emergency the family messages get the fixed advice, never the AI', async () => {
  const calls: SayRequest[] = []
  const e = await toEmergency(calls)
  await e.askNoa('how is he doing?')
  expect(T(e.getSnapshot().notes[0].text)).toBe('Saeed has been advised to see a doctor now at the emergency department. Please help Saeed get there, or call 998 if that is not safe. Screening is paused until a doctor has seen Saeed.')
  expect(calls).toEqual([])
})

test('outside an emergency an ordinary question still goes to the AI', async () => {
  const calls: SayRequest[] = []
  const e = new FamilyHealthEngine({ ai: spyAi(calls) })
  void e.startJourney('khalid')
  await e.whenIdle()
  calls.length = 0
  await e.reply('what happens at the clinic visit?')
  await e.whenIdle()
  expect(calls.map((c) => c.callId)).toContain('composer.reply')
  expect(of(e.getSnapshot().feed, 'agent').at(-1)!.source).toBe('live')
})
