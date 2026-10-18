import { act, fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { vi } from 'vitest'
import type { LivePhone, LiveView } from '@/domain/incident'
import { LivePhoneCard } from '@/features/individual/live/LivePhoneCard'
import { NoaLogCard } from '@/features/individual/live/NoaLogCard'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/live/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock('@/data/repo', async (orig) => ({ ...(await orig<typeof import('@/data/repo')>()), audioUrl: (p: string) => Promise.resolve(p) }))

const ended: Record<string, () => void> = {}
beforeEach(() => {
  vi.stubGlobal('Audio', vi.fn(function Audio(url: string) {
    return { play: () => Promise.resolve(), pause: () => {}, addEventListener: (ev: string, f: () => void) => { if (ev === 'ended') ended[url] = f } }
  }))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

const row = (d: string) => ({ kind: 'NOTIFIED', t: '02:03', ph: 'Escalate', d, s: 'System' })
const view = (n: number) => ({ timeline: Array.from({ length: n }, (_, k) => row(`entry ${k}`)), sla: [] }) as unknown as LiveView

test('timeline entries that arrive after mount appear one every 1.5 s', () => {
  vi.useFakeTimers()
  let grow = () => {}
  function Harness() {
    const [n, setN] = useState(1)
    grow = () => setN(3)
    return <NoaLogCard view={view(n)} time="02:03" />
  }
  renderWithProviders(<Harness />)
  act(() => grow())
  expect(screen.queryByText('entry 1')).toBeNull()
  act(() => { vi.advanceTimersByTime(1500) })
  expect(screen.getByText('entry 1')).toBeInTheDocument()
  expect(screen.queryByText('entry 2')).toBeNull()
  act(() => { vi.advanceTimersByTime(1500) })
  expect(screen.getByText('entry 2')).toBeInTheDocument()
})

const phone: LivePhone = {
  time: '02:04', q: 'Please sit still.', flash: false, yn: false, voice: false, busy: false, help: null, helperName: null,
  callerName: null, noReplySeconds: 10, questionKey: 'instruction', audioPath: '/noa/instr.mp3',
  status: { text: "I'm calling James now.", clip: '/noa/calling-james.mp3', key: 'calling-james' },
}

test('the helper status shows only once the instruction audio has finished', async () => {
  const onSpoken = vi.fn()
  renderWithProviders(<LivePhoneCard phone={phone} name="Margaret" helpInitials="DM" checkin={() => Promise.resolve()} onSpoken={onSpoken} />)
  await act(async () => {})
  expect(screen.queryByText("I'm calling James now.")).toBeNull()
  expect(onSpoken).not.toHaveBeenCalled()
  await act(async () => { ended['/noa/instr.mp3']?.() })
  expect(screen.getByText("I'm calling James now.")).toBeInTheDocument()
  expect(onSpoken).toHaveBeenCalledWith('instruction')
})

test('pressing record calls onManual once', async () => {
  const onManual = vi.fn()
  const ask = { ...phone, voice: true, status: null, audioPath: null, questionKey: '1:0:Can you hear me?' }
  renderWithProviders(<LivePhoneCard phone={ask} name="Margaret" helpInitials="DM" checkin={() => Promise.resolve()} onManual={onManual} />)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Tap to answer/ })) })
  expect(onManual).toHaveBeenCalledTimes(1)
})

test('a goodbye already there at mount does not play again', async () => {
  const bye = { ...phone, status: null, questionKey: 'closing', audioPath: '/noa/closing.mp3' }
  renderWithProviders(<LivePhoneCard phone={bye} name="Margaret" helpInitials="DM" checkin={() => Promise.resolve()} />)
  await act(async () => {})
  expect(Audio).not.toHaveBeenCalled()
})

test('a goodbye that arrives while the card is open plays once', async () => {
  const ask = { ...phone, status: null, audioPath: null, questionKey: '2:0:How are you feeling?' }
  let close = () => {}
  function Harness() {
    const [p, setP] = useState<LivePhone>(ask)
    close = () => setP({ ...ask, questionKey: 'closing', audioPath: '/noa/closing.mp3' })
    return <LivePhoneCard phone={p} name="Margaret" helpInitials="DM" checkin={() => Promise.resolve()} />
  }
  renderWithProviders(<Harness />)
  await act(async () => { close() })
  expect(Audio).toHaveBeenCalledWith('/noa/closing.mp3')
})

test('the automatic 000 entry waits in the log until the dial ends', () => {
  const auto = { kind: 'CALLED_115', t: '02:03', ph: 'Escalate', d: 'Calling 000 automatically with the call script (demo call)', s: 'System' }
  const v = { timeline: [row('entry 0'), auto], sla: [] } as unknown as LiveView
  vi.useFakeTimers()
  const { rerender } = renderWithProviders(<NoaLogCard view={v} time="02:03" dialling />)
  expect(screen.queryByText(/Calling 000 automatically/)).toBeNull()
  rerender(<NoaLogCard view={v} time="02:03" dialling={false} />)
  act(() => { vi.advanceTimersByTime(1500) })
  expect(screen.getByText(/Calling 000 automatically/)).toBeInTheDocument()
})
