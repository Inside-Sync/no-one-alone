import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import type { IncidentDoc, RecoveryDoc, RecoveryRequest } from '@/data/contract'
import { EdPage } from '@/features/hospital/ed/EdPage'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/hospital/ed/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const recover = vi.fn<(b: RecoveryRequest) => Promise<void>>(async () => {})
const liveValue: LiveIncidentValue = {
  live: true, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
  start: async () => {}, reset: async () => {}, checkin: async () => {}, act: async () => {}, recover,
}
vi.mock('@/state/LiveIncident', () => ({ useLiveIncident: () => liveValue }))

const handoff = { hospitalId: 'h1', hospitalName: 'Sydney', status: 'RECEIVED' } as const
const incident = (extra: Partial<IncidentDoc>) => ({ handoff, ...extra }) as unknown as IncidentDoc
const ready = () => screen.findByText('Pre-arrival inbox')

beforeEach(() => { recover.mockClear(); recover.mockResolvedValue(undefined) })

test('posts the parsed plan with times split and trimmed', async () => {
  liveValue.incident = incident({})
  renderWithProviders(<EdPage />, { who: 'family' })
  await ready()
  fireEvent.change(screen.getByLabelText('Medicine 1 times'), { target: { value: ' 08:00 ,12:00 ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send home with this plan' }))
  await waitFor(() => expect(recover).toHaveBeenCalledTimes(1))
  const body = recover.mock.calls[0][0]
  expect(body.meds[0]).toMatchObject({ name: 'aspirin', times: ['08:00', '12:00'] })
  expect(body.staffName).toBe('Dr Nguyen, Sydney Stroke Center')
  expect(body.followUps.map((f) => f.inDays)).toEqual([7, 42])
})

test('is hidden when there is no handoff', async () => {
  liveValue.incident = { timeline: [] } as unknown as IncidentDoc
  renderWithProviders(<EdPage />, { who: 'family' })
  await ready()
  expect(screen.queryByText('Recovery plan')).toBeNull()
})

test('a failed send toasts the message and keeps the form', async () => {
  liveValue.incident = incident({})
  recover.mockRejectedValue(new Error('A recovery plan already exists'))
  renderWithProviders(<EdPage />, { who: 'family' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: 'Send home with this plan' }))
  expect(await screen.findByText('A recovery plan already exists')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Send home with this plan' })).toBeInTheDocument()
})

test('shows the sent plan read-only once recovery exists', async () => {
  const recovery = {
    createdAt: '2026-10-16T05:10:00Z', staffName: 'Dr Nguyen', diagnosis: 'd', notes: 'n', meds: [], activities: [], followUps: [],
    summary: 's', fallback: false,
    reminders: [{ time: '08:00', kind: 'MED', text: 'Time for your aspirin, 100 mg.' }],
  } as RecoveryDoc
  liveValue.incident = incident({ recovery })
  renderWithProviders(<EdPage />, { who: 'family' })
  await ready()
  expect(screen.getByText(/Sent home at/)).toBeInTheDocument()
  expect(screen.getByText('Time for your aspirin, 100 mg.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Send home with this plan' })).toBeNull()
  expect(screen.getByText("Plan is on Margaret's screen")).toBeInTheDocument()
})

test('after a send the delivery steps reveal one by one from the stored doc', async () => {
  const recovery = {
    createdAt: '2026-10-16T05:10:00Z', staffName: 'Dr Nguyen', diagnosis: 'd', notes: 'n', meds: [], activities: [],
    followUps: [{ text: 'GP check', inDays: 7, date: '2026-10-23' }], summary: 's', fallback: false,
    reminders: [
      { time: '08:00', kind: 'MED', text: 'Time for your aspirin, 100 mg.', audioPath: 'a.mp3' },
      { time: '10:00', kind: 'ACTIVITY', text: 'Time to walk for 15 minutes with your stick.', audioPath: 'b.mp3' },
    ],
  } as RecoveryDoc
  liveValue.incident = incident({})
  recover.mockImplementation(async () => { liveValue.incident = incident({ recovery }) })
  renderWithProviders(<EdPage />, { who: 'family' })
  await ready()
  vi.useFakeTimers()
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Send home with this plan' }))
    await act(async () => {})
    const items = () => [...document.querySelectorAll('ol.steps li')].map((li) => li.querySelector('span')!.textContent)
    expect(items()).toEqual([])
    act(() => { vi.advanceTimersByTime(550) })
    expect(items()).toEqual(['Summary written in plain words'])
    for (let i = 0; i < 4; i++) act(() => { vi.advanceTimersByTime(550) })
    expect(items()).toEqual([
      'Summary written in plain words',
      '2 reminders set, 2 with a spoken reminder',
      'Check-in call dates added to her plan: Day 1, 3, 7, 14, 30',
      'Appointments: GP check (2026-10-23)',
      "Plan is on Margaret's screen",
    ])
  } finally {
    vi.useRealTimers()
  }
})
