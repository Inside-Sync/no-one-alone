import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import type { IncidentDoc, RecoveryDoc, RecoveryRequest } from '@/data/contract'
import { DischargePage } from '@/features/hospital/discharge/DischargePage'
import { EdPage } from '@/features/hospital/ed/EdPage'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { renderWithProviders } from '../../helpers/renderWithProviders'

const push = vi.hoisted(() => vi.fn())
vi.mock('@/app/navigation', () => ({ usePathname: () => '/hospital/discharge/', useRouter: () => ({ push, replace: vi.fn() }) }))

const recover = vi.fn<(b: RecoveryRequest) => Promise<void>>(async () => {})
const liveValue: LiveIncidentValue = {
  live: true, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
  start: async () => {}, reset: async () => {}, checkin: async () => {}, act: async () => {}, recover,
}
vi.mock('@/state/LiveIncident', () => ({ useLiveIncident: () => liveValue }))

const handoff = { hospitalId: 'h1', hospitalName: 'Camperdown', status: 'RECEIVED' } as const
const incident = (extra: Partial<IncidentDoc>) => ({ handoff, ...extra }) as unknown as IncidentDoc
const ready = () => screen.findByText('30-day follow-up board')
const finalise = () => fireEvent.click(screen.getByRole('button', { name: 'Finalise the plan' }))
const approve = () => screen.getByRole('button', { name: 'Approve and hand off to Noa' })
const sentDoc = (extra: Partial<RecoveryDoc> = {}) => ({
  createdAt: '2026-10-16T05:10:00Z', staffName: 'Dr Ross', diagnosis: 'd', notes: 'n', meds: [], activities: [], followUps: [],
  summary: 's', fallback: false, reminders: [{ time: '08:00', kind: 'MED', text: 'Time for your apixaban, 5 mg.' }], ...extra,
}) as RecoveryDoc

beforeEach(() => { recover.mockClear(); recover.mockResolvedValue(undefined); push.mockClear() })

test('Approve is disabled until the plan is finalised, and Edit again unlocks it', async () => {
  liveValue.incident = incident({})
  renderWithProviders(<DischargePage />, { who: 'family' })
  await ready()
  expect(approve()).toBeDisabled()
  expect(screen.getByLabelText('Medicine 1 name')).toBeEnabled()
  finalise()
  expect(approve()).toBeEnabled()
  expect(screen.getByLabelText('Medicine 1 name')).toBeDisabled()
  expect(screen.getByText(/^Finalised by Dr Amelia Ross, stroke registrar · \d\d:\d\d$/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Edit again' }))
  expect(approve()).toBeDisabled()
  expect(screen.getByLabelText('Medicine 1 name')).toBeEnabled()
})

test('posts the plan with each medicine change and its ticked slots, Stop with no times', async () => {
  liveValue.incident = incident({})
  renderWithProviders(<DischargePage />, { who: 'family' })
  await ready()
  fireEvent.click(screen.getByLabelText('Medicine 1 Evening'))
  fireEvent.change(screen.getByLabelText('Medicine 4 change'), { target: { value: 'Stop' } })
  finalise()
  fireEvent.click(approve())
  await waitFor(() => expect(recover).toHaveBeenCalledTimes(1))
  const body = recover.mock.calls[0][0]
  expect(body.staffName).toBe('Dr Amelia Ross, stroke registrar')
  expect(body.meds.map((m) => [m.name, m.times, m.change])).toEqual([
    ['Apixaban', ['08:00'], 'New'],
    ['Perindopril', ['08:00'], 'New'],
    ['Atorvastatin', ['21:00'], 'Increased'],
    ['Amlodipine', [], 'Stop'],
    ['Vitamin D', ['08:00'], 'Continue'],
    ['Aspirin', [], 'Stop'],
  ])
  expect(body.activities[1]).toEqual({
    text: 'Check blood pressure morning and evening, target under 130/80', times: ['08:15', '18:15'],
    reminder: 'Time to check your blood pressure. Aim for under 130/80.',
  })
  expect(body.activities.map((a) => a.reminder)).toEqual([
    'Time for your 20-minute walk.', 'Time to check your blood pressure. Aim for under 130/80.',
    'Time for your speech exercises, 15 minutes.', 'Time for a glass of water.', undefined, undefined, undefined,
  ])
  expect(body.followUps.map((f) => f.inDays)).toEqual([7, 4, 6, 45, 7])
})

test('is hidden when there is no handoff', async () => {
  liveValue.incident = { timeline: [] } as unknown as IncidentDoc
  renderWithProviders(<DischargePage />, { who: 'family' })
  await ready()
  expect(screen.queryByText('Discharge and recovery plan')).toBeNull()
})

test('a failed send toasts the message and keeps the form', async () => {
  liveValue.incident = incident({})
  recover.mockRejectedValue(new Error('A recovery plan already exists'))
  renderWithProviders(<DischargePage />, { who: 'family' })
  await ready()
  finalise()
  fireEvent.click(approve())
  expect(await screen.findByText('A recovery plan already exists')).toBeInTheDocument()
  expect(approve()).toBeEnabled()
})

test('shows the sent plan read-only once recovery exists', async () => {
  liveValue.incident = incident({ recovery: sentDoc() })
  renderWithProviders(<DischargePage />, { who: 'family' })
  await ready()
  expect(screen.getByText(/Sent home at/)).toBeInTheDocument()
  expect(screen.getByText('Time for your apixaban, 5 mg.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Approve and hand off to Noa' })).toBeNull()
  expect(screen.getByText("Plan is on Margaret's screen")).toBeInTheDocument()
})

test('after approval the delivery steps reveal one by one from the stored doc', async () => {
  const recovery = sentDoc({
    followUps: [{ text: 'GP check', inDays: 7, date: '2026-10-23' }],
    reminders: [
      { time: '08:00', kind: 'MED', text: 'Time for your apixaban, 5 mg.', audioPath: 'a.mp3' },
      { time: '10:00', kind: 'ACTIVITY', text: 'Time to walk 20 minutes daily.', audioPath: 'b.mp3' },
    ],
  })
  liveValue.incident = incident({})
  recover.mockImplementation(async () => { liveValue.incident = incident({ recovery }) })
  renderWithProviders(<DischargePage />, { who: 'family' })
  await ready()
  vi.useFakeTimers()
  try {
    finalise()
    fireEvent.click(approve())
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
      'Appointments: GP check (Fri 23 Oct)',
      "Plan is on Margaret's screen",
    ])
  } finally {
    vi.useRealTimers()
  }
})

test('the ED page shows the discharge banner while a handed-off case has no plan, and it opens Discharge', async () => {
  liveValue.incident = incident({})
  const { unmount } = renderWithProviders(<EdPage />, { who: 'family' })
  await screen.findByText('Pre-arrival inbox')
  expect(screen.getByText('Ready for discharge: Margaret Collins, 78')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Open her record and recovery plan' }))
  expect(push).toHaveBeenCalledWith('/hospital/discharge')
  unmount()
  liveValue.incident = incident({ recovery: sentDoc() })
  renderWithProviders(<EdPage />, { who: 'family' })
  await screen.findByText('Pre-arrival inbox')
  expect(screen.queryByText('Ready for discharge: Margaret Collins, 78')).toBeNull()
})
