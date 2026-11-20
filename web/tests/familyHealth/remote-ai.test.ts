import { vi } from 'vitest'
import { FamilyHealthEngine, TEST_CASES, type FeedItem, type TestCaseId } from '@/features/familyHealth'
import { NOA_AI_TIMEOUT_MS, RemoteAi, liveNoaAiEnabled } from '@/features/familyHealth/live/remoteAi'
import { T } from './helpers'

vi.mock('@/lib/firebase', () => ({ idToken: async () => 'token' }))

type Sent = { url: string; body: Record<string, unknown> }
let sent: Sent[] = []
let reply: (url: string, body: Record<string, unknown>) => Response | Promise<Response>
const record = async (url: string, init: RequestInit) => {
  const body = JSON.parse(String(init.body)) as Record<string, unknown>
  sent.push({ url, body })
  return reply(url, body)
}
const fetchMock = vi.fn(record)
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status })
beforeEach(() => {
  sent = []
  reply = (url) => (url.endsWith('/noa/say') ? json({ source: 'live', text: 'Live words.' }) : json({ choice: 'none' }))
  fetchMock.mockReset()
  fetchMock.mockImplementation(record)
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

/**
 * The respond-agent params models (PR #78, agents/respond/noa.py): required and optional keys per call id. The server forbids any
 * other key (pydantic extra="forbid"), so a journey that sends one more or one fewer field gets 422 and prepared text.
 */
const PARAMS: Record<string, { req: string[]; opt?: string[] }> = {
  'detect.guardian': { req: ['audience', 'name', 'signal', 'usual', 'rule'] },
  'detect.forecast': { req: ['audience', 'name', 'flags', 'family_effects'] },
  'protect.guardian': { req: ['audience', 'name', 'shared_with', 'genomic_used'] },
  'home.voice.intro': { req: ['audience', 'call', 'tests'] },
  'home.voice.retry': { req: ['audience', 'score'] },
  'home.voice.child': { req: ['audience', 'parent', 'child', 'age_months'] },
  'home.insight': { req: ['audience', 'name', 'results'], opt: ['symptom'] },
  'pathway.navigator.offer': { req: ['audience', 'name', 'population_priority', 'for_the_doctor'] },
  'pathway.forecast.why': { req: ['audience', 'name', 'flags', 'pathway'], opt: ['risk'] },
  'pathway.navigator.u1': { req: ['audience', 'name', 'urgent'] },
  'pathway.navigator.n3': { req: ['audience', 'name'] },
  'referral.courier': { req: ['audience', 'patient', 'age', 'booked', 'for_doctor_decision', 'home_screening', 'flags'] },
  'referral.analyst': { req: ['audience', 'segment', 'booked'] },
  'composer.reply': { req: ['audience', 'name', 'question'], opt: ['journey_stage'] },
  'family.chat': { req: ['audience', 'notifications', 'question'] },
}

const drive = async (e: FamilyHealthEngine, id: TestCaseId, script: Record<string, string> = {}) => {
  void e.runTestCase(id)
  await e.whenIdle()
  for (let i = 0; i < 80; i++) {
    const c = e.getSnapshot().pending
    if (!c) break
    const key = c.type === 'choice' ? c.qid : c.type
    if (script[key]) e.answer(c.id, script[key])
    else e.next()
    await e.whenIdle()
  }
  return e.getSnapshot()
}
const agents = (feed: FeedItem[]) => feed.filter((f): f is Extract<FeedItem, { kind: 'agent' }> => f.kind === 'agent')

test('every say goes to /api/noa/say as { callId, lang, params } only, with params the server accepts for that call id', async () => {
  const e = new FamilyHealthEngine({ ai: new RemoteAi() })
  for (const id of TEST_CASES.map((t) => t.id)) { e.reset(); await drive(e, id, { book: 'later' }) }
  e.reset(); await drive(e, 'k1', { book: 'why' })
  await e.reply('what happens next?')
  await e.askNoa('how is grandpa?')
  const says = sent.filter((s) => s.url.endsWith('/noa/say'))
  const seen = new Set(says.map((s) => s.body.callId as string))
  expect([...seen].sort()).toEqual(Object.keys(PARAMS).sort())
  for (const s of says) {
    expect(Object.keys(s.body).sort()).toEqual(['callId', 'lang', 'params'])
    const spec = PARAMS[s.body.callId as string]
    const keys = Object.keys(s.body.params as object)
    for (const k of spec.req) expect(keys, `${s.body.callId} needs ${k}`).toContain(k)
    for (const k of keys) expect([...spec.req, ...(spec.opt ?? [])], `${s.body.callId} sends ${k}`).toContain(k)
  }
})

test('live words are shown as Live AI; the fixed emergency script never reaches the server', async () => {
  const e = new FamilyHealthEngine({ ai: new RemoteAi() })
  const s = await drive(e, 's2')
  expect(s.emergency).toBe(true)
  const a = agents(s.feed)
  expect(a.filter((x) => x.source === 'live').every((x) => x.text === 'Live words.')).toBe(true)
  expect(a.some((x) => x.source === 'fixed')).toBe(true)
  expect(sent.map((x) => x.body.callId)).not.toContain('stop.voice.emergency')
})

test('a server guardrail shows the prepared text with its reason; a rate limit or a failure shows prepared text with a note', async () => {
  reply = (url) => (url.endsWith('/noa/say') ? json({ source: 'guardrail', reason: 'number' }) : json({ choice: 'none' }))
  let e = new FamilyHealthEngine({ ai: new RemoteAi() })
  let a = agents((await drive(e, 'k1')).feed)
  expect(a.filter((x) => x.source !== 'fixed').every((x) => x.source === 'guardrail' && T(x.note) === 'Guardrail: the AI text had a number that is not in the facts, so the prepared text replaced it.')).toBe(true)
  expect(e.getSnapshot().calls.guardrail).toBe(a.length)

  reply = () => json({ error: { code: 'RATE_LIMITED', message: 'slow down' } }, 429)
  e = new FamilyHealthEngine({ ai: new RemoteAi() })
  a = agents((await drive(e, 'k1')).feed)
  expect(a.every((x) => x.source === 'prepared' && T(x.note) === 'Live AI is busy; prepared text for now.')).toBe(true)

  reply = () => json({ error: { code: 'AGENT_FAILED', message: 'no' } }, 502)
  e = new FamilyHealthEngine({ ai: new RemoteAi() })
  a = agents((await drive(e, 'k1')).feed)
  expect(a.every((x) => x.source === 'prepared' && T(x.note) === 'Live AI did not answer; prepared text shown.')).toBe(true)
})

test('no answer within the timeout: prepared text (the request is aborted)', async () => {
  vi.useFakeTimers()
  try {
    reply = () => new Promise<Response>(() => {})
    fetchMock.mockImplementation((url: string, init: RequestInit) => new Promise<Response>((_res, rej) => {
      sent.push({ url, body: JSON.parse(String(init.body)) })
      init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))
    }))
    const ai = new RemoteAi()
    const p = ai.say({ callId: 'home.voice.retry', tier: 'fast', skill: 'voice', domain: 'care', audience: 'Saeed', lang: 'en', facts: { score: 0.7 }, task: '', fallback: 'Once more, slowly please.', maxWords: 55 })
    await vi.advanceTimersByTimeAsync(NOA_AI_TIMEOUT_MS + 10)
    await expect(p).resolves.toEqual({ text: 'Once more, slowly please.', source: 'prepared', reason: 'failed' })
  } finally {
    vi.useRealTimers()
  }
})

test('emergency words the server catches (e.g. in Arabic) get the fixed safety line, in the composer and in family messages', async () => {
  reply = (url) => (url.endsWith('/noa/say') ? json({ source: 'guardrail', reason: 'emergency' }) : json({ choice: 'none' }))
  const e = new FamilyHealthEngine({ ai: new RemoteAi() })
  await e.reply('أشعر بدوخة') // "I feel dizzy": no English keyword, the server's Arabic list catches it
  const last = agents(e.getSnapshot().feed).at(-1)!
  expect(last.source).toBe('fixed')
  expect(T(last.text)).toBe('If your face or arm is weak, your speech changes, or you have chest pain or feel faint, call 998 now.')
  await e.askNoa('جدي يتكلم بصعوبة')
  expect(T(e.getSnapshot().notes[0].text)).toBe('If anyone has slurred speech, face or arm weakness, chest pain or confusion, they should see a doctor immediately at the emergency department.')
})

test('understand: a valid live choice is taken; an unknown one or an error falls back to the keyword reader', async () => {
  const ai = new RemoteAi()
  const req = { tier: 'fast' as const, qid: 'rf', question: 'Right now?', options: [{ id: 'none', label: 'No' }, { id: 'weak', label: 'Weak' }], reply: 'my arm is weak', lang: 'en' as const }
  reply = () => json({ choice: 'none' })
  await expect(ai.understand(req)).resolves.toEqual({ choice: 'none', summary: '', source: 'live' })
  expect(sent[0].url).toBe('/api/noa/understand')
  expect(sent[0].body).toEqual({ qid: 'rf', lang: 'en', options: req.options, reply: 'my arm is weak' })
  reply = () => json({ choice: 'banana' })
  await expect(ai.understand(req)).resolves.toMatchObject({ choice: 'weak', source: 'keyword' })
  reply = () => json({ error: { code: 'AGENT_FAILED', message: 'x' } }, 502)
  await expect(ai.understand(req)).resolves.toMatchObject({ choice: 'weak', source: 'keyword' })
})

test('the engine still takes the more urgent reading when the live model says "none" for "my arm is weak"', async () => {
  reply = (url) => (url.endsWith('/noa/say') ? json({ source: 'live', text: 'Live words.' }) : json({ choice: 'none' }))
  const e = new FamilyHealthEngine({ ai: new RemoteAi() })
  void e.runTestCase('s0')
  await e.whenIdle()
  for (let i = 0; i < 40; i++) {
    const c = e.getSnapshot().pending
    if (!c || (c.type === 'choice' && c.qid === 'rf')) break
    e.next(); await e.whenIdle()
  }
  await e.reply('my arm feels weak')
  await e.whenIdle()
  expect(e.getSnapshot().rulesHit.map((r) => r.rule)).toContain('V1')
})

test('live AI is on only with live data and VITE_NOA_AI=on', () => {
  expect(liveNoaAiEnabled({ VITE_DATA_SOURCE: 'firebase', VITE_NOA_AI: 'on' })).toBe(true)
  expect(liveNoaAiEnabled({ VITE_DATA_SOURCE: 'firebase', VITE_NOA_AI: 'off' })).toBe(false)
  expect(liveNoaAiEnabled({ VITE_DATA_SOURCE: 'firebase' })).toBe(false)
  expect(liveNoaAiEnabled({ VITE_DATA_SOURCE: 'mock', VITE_NOA_AI: 'on' })).toBe(false)
})
