import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import type { TestCaseEngine } from '@/features/testcase/engine'
import { StepCard } from '@/features/testcase/ui/app/StepCard'
import type { TestCaseSession } from '@/features/testcase/ui/app/useTestCaseEngine'
import { TeachCard } from '@/features/testcase/ui/kinds/safety/TeachCard'
import { make, text } from './helpers'
import { useEngine } from './safetyHarness'
import { advanceTo, renderKind } from './uiSafetyHelpers'

let live = true
vi.mock('@/data/repo', async (orig) => ({ ...(await orig<typeof import('@/data/repo')>()), get LIVE() { return live } }))
const explain = vi.fn<(body: unknown, signal?: AbortSignal) => Promise<unknown>>()
vi.mock('@/data/api', () => ({ explain: (body: unknown, signal?: AbortSignal) => explain(body, signal) }))

beforeEach(() => { live = true; explain.mockReset() })
afterEach(() => { vi.useRealTimers() })

const ANOTHER = 'Explain it another way'
const atTeach = () => { const e = make('stroke'); advanceTo(e, 'teach'); return e }
const hang = (_b: unknown, signal?: AbortSignal) => new Promise<never>((_, reject) => {
  signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
})
function Card({ e, running }: { e: TestCaseEngine; running: boolean }) {
  const { snap, r } = useEngine(e)
  return <TeachCard engine={e} snap={snap} step={snap.step} r={r} running={running} />
}

describe('Explain it another way', () => {
  test('a reply replaces the explanation; the question stays prepared', async () => {
    explain.mockResolvedValue({ explain: 'Your heart sometimes beats unevenly, which likely caused the clot.', simpler: 'Take apixaban twice a day.' })
    const e = atTeach()
    renderKind(e)
    const q = text(e, e.curExplain()!.q)
    fireEvent.click(screen.getByRole('button', { name: ANOTHER }))
    await waitFor(() => expect(e.curExplain()!.src).toBe('live'))
    expect(explain).toHaveBeenCalledWith({ tkey: 'stroke', lang: 'en' }, expect.any(AbortSignal))
    expect(screen.getByText('Your heart sometimes beats unevenly, which likely caused the clot.')).toBeInTheDocument()
    expect(screen.getByText(q)).toBeInTheDocument()
  })

  test('the request carries the teach language, not the app language', async () => {
    explain.mockResolvedValue({ explain: 'x', simpler: 'y' })
    const e = atTeach()
    e.setLang('ar')
    renderKind(e)
    fireEvent.click(screen.getByRole('button', { name: ANOTHER }))
    await waitFor(() => expect(explain).toHaveBeenCalledTimes(1))
    expect(explain.mock.calls[0][0]).toEqual({ tkey: 'stroke', lang: 'ar' })
  })

  test('after 8 s the request is cancelled, the prepared text stays and a GUARD line is logged', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] })
    explain.mockImplementation(hang)
    const e = atTeach()
    renderKind(e)
    const prepared = text(e, e.curExplain()!.explain)
    fireEvent.click(screen.getByRole('button', { name: ANOTHER }))
    await waitFor(() => expect(explain).toHaveBeenCalledTimes(1))
    const signal = explain.mock.calls[0][1]!
    expect(signal.aborted).toBe(false)
    act(() => { vi.advanceTimersByTime(8000) })
    expect(signal.aborted).toBe(true)
    await waitFor(() => expect(e.logs[0].m).toBe('GUARD'))
    expect(e.curExplain()!.src).toBe('prepared')
    expect(screen.getByText(prepared)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: ANOTHER })).toBeEnabled()
  })

  test('a failed call keeps the prepared text and logs GUARD', async () => {
    explain.mockRejectedValue(new Error('502'))
    const e = atTeach()
    renderKind(e)
    fireEvent.click(screen.getByRole('button', { name: ANOTHER }))
    await waitFor(() => expect(e.logs[0].m).toBe('GUARD'))
    expect(e.curExplain()!.src).toBe('prepared')
    expect(screen.getByText(text(e, e.curExplain()!.simpler))).toBeInTheDocument()
  })

  test('leaving the step cancels the request and logs nothing', async () => {
    explain.mockImplementation(hang)
    const e = atTeach()
    renderKind(e)
    fireEvent.click(screen.getByRole('button', { name: ANOTHER }))
    await waitFor(() => expect(explain).toHaveBeenCalledTimes(1))
    act(() => { e.go(e.S.step - 1) })
    expect(explain.mock.calls[0][1]!.aborted).toBe(true)
    await act(async () => { await Promise.resolve() })
    expect(e.logs.some((l) => l.m === 'GUARD')).toBe(false)
  })

  test('starting "Run it for me" cancels the request', async () => {
    explain.mockImplementation(hang)
    const e = atTeach()
    renderKind(e)
    fireEvent.click(screen.getByRole('button', { name: ANOTHER }))
    await waitFor(() => expect(explain).toHaveBeenCalledTimes(1))
    act(() => { e.setAuto(true) })
    expect(explain.mock.calls[0][1]!.aborted).toBe(true)
  })

  test('the step card passes the run state down: no button while a run is playing', () => {
    const e = atTeach()
    function Step({ active }: { active: boolean }) {
      const { snap, r } = useEngine(e)
      return <StepCard s={{ engine: e, snap, r, playback: { active } } as unknown as TestCaseSession} />
    }
    const on = render(<Step active />)
    expect(screen.queryByRole('button', { name: ANOTHER })).toBeNull()
    on.unmount()
    render(<Step active={false} />)
    expect(screen.getByRole('button', { name: ANOTHER })).toBeInTheDocument()
  })

  test('no button without LIVE, during "Run it for me", or while a run is on', () => {
    live = false
    const e = atTeach()
    const { unmount } = renderKind(e)
    expect(screen.queryByRole('button', { name: ANOTHER })).toBeNull()
    unmount()
    live = true
    e.setAuto(true)
    const auto = renderKind(e)
    expect(screen.queryByRole('button', { name: ANOTHER })).toBeNull()
    auto.unmount()
    e.setAuto(false)
    render(<Card e={e} running />)
    expect(screen.queryByRole('button', { name: ANOTHER })).toBeNull()
    expect(explain).not.toHaveBeenCalled()
  })
})
