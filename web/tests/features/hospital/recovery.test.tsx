import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import type { IncidentDoc, RecoveryDoc, RecoveryRequest } from '@/data/contract'
import { DischargePage } from '@/features/hospital/discharge/DischargePage'
import { EdPage } from '@/features/hospital/ed/EdPage'
import { PatientPage } from '@/features/hospital/patient/PatientPage'
import { addDays, localDay } from '@/domain/recovery'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { renderWithProviders } from '../../helpers/renderWithProviders'

const push = vi.hoisted(() => vi.fn())
vi.mock('@/app/navigation', () => ({ usePathname: () => '/hospital/discharge/', useRouter: () => ({ push, replace: vi.fn() }) }))

const recover = vi.fn<(b: RecoveryRequest) => Promise<void>>(async () => {})
const liveValue: LiveIncidentValue = {
  live: true, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
  start: async () => {}, reset: async () => {}, checkin: async () => {}, act: async () => {}, recover,
  get recovery() { return this.incident?.recovery },
}
vi.mock('@/state/LiveIncident', () => ({ useLiveIncident: () => liveValue }))

const handoff = { hospitalId: 'h1', hospitalName: 'Camperdown', status: 'RECEIVED' } as const
const incident = (extra: Partial<IncidentDoc>) => ({ handoff, ...extra }) as unknown as IncidentDoc
const ready = () => screen.findByText('Admission summary')
const finalise = () => fireEvent.click(screen.getByRole('button', { name: 'Finalise the plan' }))
const approve = () => screen.getByRole('button', { name: 'Approve and hand off to Noa' })
const sentDoc = (extra: Partial<RecoveryDoc> = {}) => ({
  createdAt: '2026-10-16T05:10:00Z', staffName: 'Dr Ross', diagnosis: 'd', notes: 'n', meds: [], activities: [], followUps: [],
  summary: 's', fallback: false, reminders: [{ time: '08:00', kind: 'MED', text: 'Time for your apixaban, 5 mg.' }], ...extra,
}) as RecoveryDoc

beforeEach(() => { recover.mockClear(); recover.mockResolvedValue(undefined); push.mockClear() })

test('Approve is disabled until the plan is finalised, and Edit again unlocks it', async () => {
  liveValue.incident = incident({})
  renderWithProviders(<PatientPage />, { who: 'family' })
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
  renderWithProviders(<PatientPage />, { who: 'family' })
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
  expect(body.meds[0].note).toBe('Stops clots forming because of the uneven heartbeat. Replaces aspirin.')
})

test('Note for patient is sent as written, and left out when empty', async () => {
  liveValue.incident = incident({})
  renderWithProviders(<PatientPage />, { who: 'family' })
  await ready()
  fireEvent.change(screen.getByLabelText('Medicine 2 note for patient'), { target: { value: 'Keeps your blood pressure down.' } })
  fireEvent.change(screen.getByLabelText('Medicine 3 note for patient'), { target: { value: ' ' } })
  finalise()
  fireEvent.click(approve())
  await waitFor(() => expect(recover).toHaveBeenCalledTimes(1))
  const meds = recover.mock.calls[0][0].meds
  expect(meds[1].note).toBe('Keeps your blood pressure down.')
  expect(meds[2]).not.toHaveProperty('note')
})

test('Discharge follow-up shows the ready banner, and the plan lives on the patient record', async () => {
  liveValue.incident = null
  renderWithProviders(<DischargePage />, { who: 'family' })
  await screen.findByText('30-day follow-up board')
  expect(screen.queryByText('Discharge and recovery plan')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Open her record and recovery plan' }))
  expect(push).toHaveBeenCalledWith('/hospital/patient')
})

test('the patient record shows the stay in prototype order, and the banner approves in one click', async () => {
  liveValue.incident = null
  renderWithProviders(<PatientPage />, { who: 'family' })
  await ready()
  expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual([
    'Admission summary', 'Inpatient course', 'Discharge and recovery plan',
  ])
  expect(document.querySelectorAll('#ptKpis .kpi')).toHaveLength(6)
  expect(screen.getByText('Margaret Collins is fit for discharge')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Approve and send to Margaret' }))
  await waitFor(() => expect(recover).toHaveBeenCalledTimes(1))
  expect(await screen.findByRole('button', { name: "Open Margaret's portal" })).toBeInTheDocument()
})

test('a failed send toasts the message and keeps the form', async () => {
  liveValue.incident = incident({})
  recover.mockRejectedValue(new Error('A recovery plan already exists'))
  renderWithProviders(<PatientPage />, { who: 'family' })
  await ready()
  finalise()
  fireEvent.click(approve())
  expect(await screen.findByText('A recovery plan already exists')).toBeInTheDocument()
  expect(approve()).toBeEnabled()
})

test('shows the sent plan read-only once recovery exists', async () => {
  liveValue.incident = incident({ recovery: sentDoc() })
  renderWithProviders(<PatientPage />, { who: 'family' })
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
  renderWithProviders(<PatientPage />, { who: 'family' })
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

test('the ED page shows the discharge banner until the plan is sent, and it opens the patient record', async () => {
  liveValue.incident = incident({})
  const { unmount } = renderWithProviders(<EdPage />, { who: 'family' })
  await screen.findByText('Pre-arrival inbox')
  expect(screen.getByText('Ready for discharge: Margaret Collins, 78')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Open her record and recovery plan' }))
  expect(push).toHaveBeenCalledWith('/hospital/patient')
  unmount()
  liveValue.incident = incident({ recovery: sentDoc() })
  renderWithProviders(<EdPage />, { who: 'family' })
  await screen.findByText('Pre-arrival inbox')
  expect(screen.queryByText('Ready for discharge: Margaret Collins, 78')).toBeNull()
})

test('Add medicine adds a focused New row that cannot be signed until it has a name, a dose and a time', async () => {
  liveValue.incident = incident({})
  renderWithProviders(<PatientPage />, { who: 'family' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: 'Add medicine' }))
  const name = screen.getByLabelText('Medicine 7 name')
  expect(name).toHaveFocus()
  expect(screen.getByLabelText('Medicine 7 change')).toHaveValue('New')
  finalise()
  expect(screen.getByText('Add the medicine name.')).toBeInTheDocument()
  expect(name).toHaveAttribute('aria-invalid', 'true')
  expect(approve()).toBeDisabled()
  fireEvent.change(name, { target: { value: 'Metformin' } })
  expect(screen.getByText('Add the dose, like 5 mg.')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Medicine 7 dose'), { target: { value: '500 mg' } })
  expect(screen.getByText('Tick at least one time, or set it to Stop.')).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Medicine 7 Morning'))
  finalise()
  expect(approve()).toBeEnabled()
  fireEvent.click(approve())
  await waitFor(() => expect(recover).toHaveBeenCalledTimes(1))
  expect(recover.mock.calls[0][0].meds.at(-1)).toEqual({ name: 'Metformin', dose: '500 mg', times: ['08:00'], change: 'New' })
})

test('only a New medicine can be removed; instructions and appointments add and remove rows', async () => {
  liveValue.incident = incident({})
  renderWithProviders(<PatientPage />, { who: 'family' })
  await ready()
  expect(screen.getByRole('button', { name: 'Remove Apixaban' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remove Aspirin' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Remove Amlodipine' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Remove Apixaban' }))
  expect(screen.getByLabelText('Medicine 1 name')).toHaveValue('Perindopril')

  fireEvent.click(screen.getByRole('button', { name: 'Remove No driving for 1 month' }))
  expect(screen.queryByDisplayValue('No driving for 1 month')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add instruction' }))
  expect(screen.getByLabelText('Activity 7')).toHaveFocus()
  finalise()
  expect(screen.getByText('Write the instruction or remove this row.')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Activity 7'), { target: { value: 'Stretch' } })
  // Times come from the picker, one at a time, kept in order and without repeats.
  const pick = screen.getByRole('button', { name: 'Activity 7 add a reminder time' })
  const choose = (time: string) => {
    fireEvent.click(pick)
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: time }))
  }
  choose('18:00')
  choose('09:15')
  fireEvent.click(pick)
  expect(within(screen.getByRole('listbox')).getByRole('option', { name: '18:00' })).toBeDisabled()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('listbox')).toBeNull()
  const times = screen.getByRole('group', { name: 'Activity 7 times' })
  expect([...times.querySelectorAll('.plan-time')].map((c) => c.textContent)).toEqual(['09:15', '18:00'])
  fireEvent.click(screen.getByRole('button', { name: 'Remove 18:00 from activity 7' }))

  // Five appointments is core-api's limit: remove one to add another.
  expect(screen.getByRole('button', { name: 'Add appointment' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Remove Physio home visit' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add appointment' }))
  fireEvent.change(screen.getByLabelText('Follow-up 5'), { target: { value: 'OT home check' } })
  finalise()
  expect(screen.getByText('Pick a date from tomorrow up to a year ahead.')).toBeInTheDocument()
  const date = screen.getByLabelText('Follow-up 5 date')
  const today = localDay(Date.now(), 'Australia/Sydney')
  expect(date).toHaveAttribute('min', addDays(today, 1))
  expect(date).toHaveAttribute('max', addDays(today, 365))
  fireEvent.change(date, { target: { value: addDays(today, 2) } })
  expect(screen.getByText('in 2 days')).toBeInTheDocument()
  finalise()
  fireEvent.click(approve())
  await waitFor(() => expect(recover).toHaveBeenCalledTimes(1))
  const body = recover.mock.calls[0][0]
  expect(body.meds.map((m) => m.name)).toEqual(['Perindopril', 'Atorvastatin', 'Amlodipine', 'Vitamin D', 'Aspirin'])
  expect(body.activities.at(-1)).toEqual({ text: 'Stretch', times: ['09:15'] })
  expect(body.followUps.at(-1)).toEqual({ text: 'OT home check', inDays: 2 })
})
