import { act, screen } from '@testing-library/react'
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
