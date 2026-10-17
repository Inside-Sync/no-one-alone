import { vi } from 'vitest'
import { startDemo } from '@/data/api'

vi.mock('@/lib/firebase', () => ({ idToken: async () => 'token' }))

const fetchMock = vi.fn(async () => new Response('{"incidentId":"i1"}', { status: 200 }))
beforeEach(() => { fetchMock.mockClear(); vi.stubGlobal('fetch', fetchMock) })
afterEach(() => vi.unstubAllGlobals())

const sentBody = () => JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)

test('startDemo without overrides sends the default timers only', async () => {
  await startDemo('stroke', 'margaret')
  expect(sentBody()).toEqual({ timerSeconds: 3, noReplySeconds: 10, personId: 'margaret' })
})

test('startDemo sends hr, movementMin and noReplySeconds when given', async () => {
  await startDemo('stroke', 'margaret', { hr: 142, movementMin: 4, noReplySeconds: 15 })
  expect(sentBody()).toEqual({ timerSeconds: 3, noReplySeconds: 15, personId: 'margaret', hr: 142, movementMin: 4 })
})
