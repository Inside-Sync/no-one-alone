import { vi } from 'vitest'
import { chat, startDemo } from '@/data/api'

vi.mock('@/lib/firebase', () => ({ idToken: async () => 'token' }))

const fetchMock = vi.fn(async () => new Response('{"incidentId":"i1"}', { status: 200 }))
beforeEach(() => { fetchMock.mockClear(); vi.stubGlobal('fetch', fetchMock) })
afterEach(() => vi.unstubAllGlobals())

const sentBody = () => JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)

test('startDemo without overrides sends the default timers only', async () => {
  await startDemo('stroke', 'margaret')
  expect(sentBody()).toEqual({ timerSeconds: 5, noReplySeconds: 10, personId: 'margaret' })
})

test('startDemo sends hr, movementMin and noReplySeconds when given', async () => {
  await startDemo('stroke', 'margaret', { hr: 142, movementMin: 4, noReplySeconds: 15 })
  expect(sentBody()).toEqual({ timerSeconds: 5, noReplySeconds: 15, personId: 'margaret', hr: 142, movementMin: 4 })
})

test('chat posts the question body to /api/chat and returns the answer', async () => {
  fetchMock.mockResolvedValueOnce(new Response('{"answer":"She is resting."}', { status: 200 }))
  const body = { question: 'How is she?', mode: 'fam' as const, viewer: 'james', history: [{ by: 'me' as const, text: 'Hi' }] }
  await expect(chat(body)).resolves.toEqual({ answer: 'She is resting.' })
  expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('/api/chat')
  expect(sentBody()).toEqual(body)
})
