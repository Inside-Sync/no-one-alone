import '@/i18n'
import { liveAiOn } from '@/features/familyHealth/ui/store'
import { RemoteAi, SAY_CALLS, type NoaTransport, type SayRequest, type UnderstandRequest } from '@/features/familyHealth'

const req = (lang: 'en' | 'ar' = 'en'): SayRequest => ({
  callId: 'detect.guardian', tier: SAY_CALLS['detect.guardian'].tier, skill: 'guardian', domain: 'care', audience: 'Saeed', lang,
  facts: { name: 'Saeed' }, task: 'never sent', fallback: 'Prepared words.', maxWords: 55,
})
const und: UnderstandRequest = { tier: 'fast', qid: 'rf', question: 'q', options: [{ id: 'none', label: 'No' }, { id: 'weak', label: 'Weak arm' }], reply: 'my arm is weak', lang: 'en' }
const net = (say: NoaTransport['say'], understand: NoaTransport['understand'] = async () => ({ choice: 'none' })): NoaTransport => ({ say, understand })
const never = () => new Promise<never>(() => {})

test('say sends callId, lang and facts plus audience, never task, fallback or maxWords', async () => {
  const sent: unknown[] = []
  await new RemoteAi(net(async (b) => { sent.push(b); return { source: 'live', text: 'Hi' } })).say(req())
  expect(sent).toEqual([{ callId: 'detect.guardian', lang: 'en', params: { name: 'Saeed', audience: 'Saeed' } }])
})
test('a live reply is trimmed and labelled live', async () => {
  expect(await new RemoteAi(net(async () => ({ source: 'live', text: '  Hello Saeed. ' }))).say(req())).toEqual({ text: 'Hello Saeed.', source: 'live' })
})
test('no answer within the timeout gives the prepared text with the timeout note', async () => {
  expect(await new RemoteAi(net(never), 20).say(req())).toEqual({ text: 'Prepared words.', source: 'prepared', note: 'Prepared text: the live AI took longer than 8 seconds.' })
})
test('the abort signal fires at the timeout', async () => {
  let signal: AbortSignal | undefined
  await new RemoteAi(net((_, s) => { signal = s; return never() }), 20).say(req())
  expect(signal?.aborted).toBe(true)
})
test('an error or a malformed reply gives the prepared text with the failed note, in the Noa-speaks language', async () => {
  const failed = { text: 'Prepared words.', source: 'prepared', note: 'النص المُعد: لم يكن الذكاء الاصطناعي متاحًا.' }
  expect(await new RemoteAi(net(async () => { throw new Error('502') })).say(req('ar'))).toEqual(failed)
  expect(await new RemoteAi(net(async () => ({ source: 'live', text: ' ' }))).say(req('ar'))).toEqual(failed)
  expect(await new RemoteAi(net(async () => 'nonsense' as never)).say(req('ar'))).toEqual(failed)
})
test('a server guardrail keeps the prepared text; known reasons get their note, others none', async () => {
  expect(await new RemoteAi(net(async () => ({ source: 'guardrail', reason: 'dose' }))).say(req())).toEqual({ text: 'Prepared words.', source: 'guardrail', note: 'Guardrail: the AI text contained a dose, so the prepared text replaced it.' })
  expect(await new RemoteAi(net(async () => ({ source: 'guardrail', reason: 'emergency' }))).say(req())).toEqual({ text: 'Prepared words.', source: 'guardrail', emergency: true })
  expect(await new RemoteAi(net(async () => ({ source: 'guardrail', reason: 'number' }))).say(req())).toEqual({ text: 'Prepared words.', source: 'guardrail', note: undefined })
})
test('understand: a listed id is live; a label, an unknown id, an error or a timeout falls back to the keyword reader', async () => {
  expect(await new RemoteAi(net(never, async () => ({ choice: 'weak' }))).understand(und)).toEqual({ choice: 'weak', summary: '', source: 'live' })
  const keyword = { choice: 'weak', summary: '', source: 'keyword' }
  expect(await new RemoteAi(net(never, async () => ({ choice: 'Weak arm' }))).understand(und)).toEqual(keyword)
  expect(await new RemoteAi(net(never, async () => ({ choice: 'banana' }))).understand(und)).toEqual(keyword)
  expect(await new RemoteAi(net(never, async () => { throw new Error('x') })).understand(und)).toEqual(keyword)
  expect(await new RemoteAi(net(never, never), 20).understand(und)).toEqual(keyword)
})
test('an Arabic red flag still reads chest when the transport throws', async () => {
  const ar: UnderstandRequest = { ...und, lang: 'ar', reply: 'أشعر بألم في الصدر' }
  expect(await new RemoteAi(net(never, async () => { throw new Error('502') })).understand(ar)).toEqual({ choice: 'chest', summary: '', source: 'keyword' })
})

test('live AI only on the firebase data source with VITE_NOA_AI=on, never in tests', () => {
  expect(liveAiOn({ MODE: 'production', VITE_DATA_SOURCE: 'firebase', VITE_NOA_AI: 'on' })).toBe(true)
  expect(liveAiOn({ MODE: 'production', VITE_DATA_SOURCE: 'firebase' })).toBe(false)
  expect(liveAiOn({ MODE: 'production', VITE_DATA_SOURCE: 'mock', VITE_NOA_AI: 'on' })).toBe(false)
  expect(liveAiOn({ MODE: 'test', VITE_DATA_SOURCE: 'firebase', VITE_NOA_AI: 'on' })).toBe(false)
  expect(liveAiOn()).toBe(false)
})
