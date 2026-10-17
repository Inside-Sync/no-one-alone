import { act as flush, renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import type { AssignmentDoc, IncidentDoc } from '@/data/contract'
import type { LiveView } from '@/domain/incident'
import { presetSettings, type SimSettings } from '@/domain/simulator'
import { useAutopilot, type AutopilotOptions } from '@/features/individual/live/useAutopilot'

const play = vi.fn(() => Promise.resolve())
const fetchMock = vi.fn(() => Promise.resolve({ blob: () => Promise.resolve(new Blob(['mp3'])) }))

beforeEach(() => {
  vi.useFakeTimers()
  play.mockClear()
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('Audio', vi.fn(function Audio() { return { play } }))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const agentTurns = (n: number) => Array.from({ length: n }, () => ({ by: 'AGENT' as const, at: '', text: 'q' }))
const incidentWith = (turns: number, assignments: AssignmentDoc[] = []) =>
  ({ checkIn: { turns: agentTurns(turns) }, assignments }) as unknown as IncidentDoc
const viewWith = (key: string | null) => ({ id: 'inc-1', phone: { voice: !!key, questionKey: key } }) as unknown as LiveView
const david = (state: AssignmentDoc['state']) => ({ memberId: 'david', state }) as AssignmentDoc

function setup(settings: SimSettings, incident: IncidentDoc, view: LiveView) {
  const checkin = vi.fn(() => Promise.resolve())
  const act = vi.fn(() => Promise.resolve())
  const props: AutopilotOptions = { enabled: true, settings, incident, view, checkin, act }
  const hook = renderHook((p: AutopilotOptions) => useAutopilot(p), { initialProps: props })
  return { checkin, act, rerender: (o: Partial<AutopilotOptions>) => hook.rerender({ ...props, ...o }) }
}

const clear = { ...presetSettings('stairs'), speech: 'clear' } as SimSettings

test('sends one clip per question key across re-renders, after 8 s for the first question', async () => {
  const { checkin, rerender } = setup(clear, incidentWith(1), viewWith('1:0:Can you hear me?'))
  await flush(() => vi.advanceTimersByTimeAsync(7900))
  expect(checkin).not.toHaveBeenCalled()
  rerender({ incident: incidentWith(1) })
  rerender({ view: viewWith('1:0:Can you hear me?') })
  await flush(() => vi.advanceTimersByTimeAsync(8000))
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith('/sim/clear-0.mp3')
  expect(play).toHaveBeenCalledTimes(1)
  expect(checkin).toHaveBeenCalledTimes(1)
  expect(checkin.mock.calls[0]).toEqual([{ audio: expect.any(Blob) }])
  rerender({ view: viewWith(null) })
  rerender({ incident: incidentWith(1), view: viewWith('1:0:Can you hear me?') })
  await flush(() => vi.advanceTimersByTimeAsync(10000))
  expect(checkin).toHaveBeenCalledTimes(1)
})

test("speech 'none' sends nothing", async () => {
  const { checkin } = setup({ ...clear, speech: 'none' }, incidentWith(1), viewWith('1:0:Can you hear me?'))
  await flush(() => vi.advanceTimersByTimeAsync(20000))
  expect(fetchMock).not.toHaveBeenCalled()
  expect(checkin).not.toHaveBeenCalled()
})

test('accepts for David 1.5 s after he is notified, only when he picks up', async () => {
  for (const davidPicksUp of [true, false]) {
    const { act, rerender } = setup({ ...clear, davidPicksUp }, incidentWith(0, [david('QUEUED')]), viewWith(null))
    await flush(() => vi.advanceTimersByTimeAsync(3000))
    rerender({ incident: incidentWith(0, [david('NOTIFIED')]) })
    await flush(() => vi.advanceTimersByTimeAsync(1400))
    expect(act).not.toHaveBeenCalled()
    await flush(() => vi.advanceTimersByTimeAsync(200))
    expect(act.mock.calls).toEqual(davidPicksUp ? [['david', 'ACCEPT']] : [])
  }
})
