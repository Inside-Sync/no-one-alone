import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import type { IncidentDoc, RecoveryDoc } from '@/data/contract'
import { RecordPage } from '@/features/individual/record/RecordPage'
import { TreatmentPage } from '@/features/individual/treatment/TreatmentPage'
import { PAGE_REGISTRY } from '@/features/registry'
import { useStepParam } from '@/features/shared/careRecord'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { renderWithProviders } from '../../helpers/renderWithProviders'

const push = vi.fn()
vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/treatment/', useRouter: () => ({ push, replace: vi.fn() }) }))

const idle = async () => {}
const liveValue: LiveIncidentValue = {
  live: true, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
  start: idle, reset: idle, checkin: idle, act: idle, recover: idle,
  get recovery() { return this.incident?.recovery },
}
vi.mock('@/state/LiveIncident', () => ({ useLiveIncident: () => liveValue }))

const ready = () => screen.findByText("Today's tablets and tasks")
const drawerEl = () => document.getElementById('drawer')!

afterEach(() => { vi.useRealTimers(); liveValue.incident = null; push.mockClear() })

test('is registered, and individual/recovery is no longer a routed page', () => {
  expect(PAGE_REGISTRY['individual/treatment']).toBe(TreatmentPage)
  expect(PAGE_REGISTRY['individual/recovery']).toBeUndefined()
})

test('Moza\'s page: stepper on Treatment, plan card marked for the walkthrough, her own wording', async () => {
  renderWithProviders(<TreatmentPage />, { who: 'self' })
  await ready()
  expect(screen.getByRole('button', { name: /Treatment/ })).toHaveAttribute('aria-current', 'step')
  expect(document.querySelector('[data-tour="treatment-plan"]')).not.toBeNull()
  expect(document.querySelector('[data-tour="record-steps"]')).not.toBeNull()
  expect(screen.getByText('Your recovery plan')).toBeInTheDocument()
  expect(screen.getByText(/You had a small stroke on 15 October/)).toBeInTheDocument()
  expect(screen.getByText('Day 11 of 30')).toBeInTheDocument()
  expect(screen.getByText('5 of 9 done today')).toBeInTheDocument()
  expect(screen.getByText('Stop: Aspirin')).toBeInTheDocument()
  expect(screen.getByText('Your medicines, explained')).toBeInTheDocument()
  expect(screen.getByText('Call 998 straight away if…')).toBeInTheDocument()
})

test('family reads the same plan in the third person', async () => {
  renderWithProviders(<TreatmentPage />, { who: 'family' })
  await ready()
  expect(screen.getByText("Moza's recovery plan")).toBeInTheDocument()
  expect(screen.getByText(/Moza had a small stroke on 15 October/)).toBeInTheDocument()
  expect(screen.getByText('Her medicines, explained')).toBeInTheDocument()
  expect(screen.getByText('Short chats with Moza')).toBeInTheDocument()
})

test('the next reminder is the first open task; ticking a task moves on and counts it', async () => {
  renderWithProviders(<TreatmentPage />, { who: 'self' })
  await ready()
  const card = screen.getByRole('heading', { name: 'Next reminder' }).closest('article')!
  expect(within(card).getByText('16:00')).toBeInTheDocument()
  expect(within(card).getByText('Drink a glass of water')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Done: Drink a glass of water' }))
  expect(screen.getByText('6 of 9 done today')).toBeInTheDocument()
  expect(within(card).getByText('18:00')).toBeInTheDocument()
  fireEvent.click(within(card).getByRole('button', { name: 'Show the reminder now' }))
  expect(screen.getByText(/Reminder: Apixaban 5 mg \+ Amlodipine 5 mg/)).toBeInTheDocument()
})

test('medicines, appointments, warning signs and calls each show a source line', async () => {
  renderWithProviders(<TreatmentPage />, { who: 'self' })
  await ready()
  const meds = screen.getByRole('heading', { name: 'Your medicines, explained' }).closest('article')!
  expect(within(meds).getAllByRole('listitem')).toHaveLength(5)
  expect(within(meds).getByText('Increased')).toBeInTheDocument()
  const appts = screen.getByRole('heading', { name: 'Appointments' }).closest('article')!
  expect(within(appts).getAllByRole('button', { name: 'Add' })).toHaveLength(5)
  fireEvent.click(within(appts).getAllByRole('button', { name: 'Add' })[0])
  expect(within(appts).getAllByRole('button', { name: 'Add' })).toHaveLength(4)
  expect(screen.getByText('Stroke unit guidance')).toBeInTheDocument()
  const calls = screen.getByRole('heading', { name: 'Helper check-in calls' }).closest('article')!
  expect(within(calls).getByText('Done ✓')).toBeInTheDocument()
  expect(within(calls).getAllByText('Planned')).toHaveLength(4)
  fireEvent.click(within(calls).getByRole('button', { name: 'Jump to the next day' }))
  expect(within(calls).getAllByText('Planned')).toHaveLength(3)
  expect(screen.getByText('Noa voice calls')).toBeInTheDocument()
})

test('a medicine row opens its chart entry in the drawer', async () => {
  renderWithProviders(<TreatmentPage />, { who: 'self' })
  await ready()
  const meds = screen.getByRole('heading', { name: 'Your medicines, explained' }).closest('article')!
  fireEvent.click(within(meds).getByText(/Perindopril 4 mg/))
  expect(within(drawerEl()).getByRole('heading', { name: 'New medicines' })).toBeInTheDocument()
})

test('the other steps lead back to the record, with the step in the query', async () => {
  renderWithProviders(<TreatmentPage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: '← Back: Results' }))
  expect(push).toHaveBeenCalledWith('/individual/record?step=res')
  fireEvent.click(screen.getByRole('button', { name: 'Next: Follow-up →' }))
  expect(push).toHaveBeenCalledWith('/individual/record?step=fu')
})

const recovery: RecoveryDoc = {
  createdAt: '2026-10-16T05:10:00Z', staffName: 'Dr Nguyen', diagnosis: 'd', notes: 'No driving for 4 weeks.',
  meds: [
    { name: 'Warfarin', dose: '3 mg', times: ['18:00'], change: 'New' },
    { name: 'Clopidogrel', dose: '75 mg', times: [], change: 'Stop' },
  ],
  activities: [{ text: 'No driving for 1 month', times: [] }],
  followUps: [{ text: 'GP check with Dr Patel', inDays: 7, date: '2026-10-23' }],
  summary: 'You are home.', summaryAudioPath: 'audio/i/recovery-summary.mp3', fallback: false,
  reminders: [
    { time: '08:00', kind: 'MED', text: 'Time for your warfarin, 3 mg.', audioPath: 'audio/i/recovery-0.mp3' },
    { time: '18:00', kind: 'MED', text: 'Time for your warfarin, 3 mg again.' },
    { time: '19:00', kind: 'ACTIVITY', text: 'Feed the cat.' },
  ],
}

test('a plan arriving from the hospital replaces the snapshot: summary, tasks, stop chip, notes, dated calls', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.parse('2026-10-18T02:00:00Z'))
  liveValue.incident = { recovery } as unknown as IncidentDoc
  renderWithProviders(<TreatmentPage />, { who: 'self' })
  await ready()
  expect(screen.getByText('You are home.')).toBeInTheDocument()
  expect(screen.queryByText(/You had a small stroke/)).toBeNull()
  expect(screen.getByText('Stop: Clopidogrel')).toBeInTheDocument()
  expect(screen.getByText('No driving for 1 month')).toBeInTheDocument()
  expect(screen.getByText('Time for your warfarin, 3 mg again.')).toBeInTheDocument()
  expect(screen.getByText('No driving for 4 weeks.')).toBeInTheDocument()
  expect(screen.getByText('GP check with Dr Patel')).toBeInTheDocument()
  const calls = screen.getByRole('heading', { name: 'Helper check-in calls' }).closest('article')!
  expect(within(calls).getAllByText(/^Day \d+ · \w{3} \d+ \w{3}$/).map((r) => r.textContent)).toEqual([
    'Day 1 · Sat 17 Oct', 'Day 3 · Mon 19 Oct', 'Day 7 · Fri 23 Oct', 'Day 14 · Fri 30 Oct', 'Day 30 · Sun 15 Nov',
  ])
  expect(within(calls).getAllByText('Planned')).toHaveLength(5)
  const meds = screen.getByRole('heading', { name: 'Your medicines, explained' }).closest('article')!
  expect(within(meds).getAllByRole('listitem')).toHaveLength(1)
  expect(within(meds).getByText('New')).toBeInTheDocument()
  // The clock reads 2026-10-18 06:00 in Dubai: 08:00 is next; ticking it moves on to 18:00.
  const next = screen.getByRole('heading', { name: 'Next reminder' }).closest('article')!
  expect(within(next).getByText('08:00')).toBeInTheDocument()
  act(() => { fireEvent.click(screen.getByRole('button', { name: 'Taken: Time for your warfarin, 3 mg.' })) })
  expect(within(next).getByText('18:00')).toBeInTheDocument()
})

function StepProbe() {
  const [step, set] = useStepParam(['sum', 'his', 'tx'], 'sum')
  return <button type="button" onClick={() => set('his')}>{step}</button>
}

test('useStepParam follows the ?step= query and ignores unknown values', () => {
  const { rerender } = render(<MemoryRouter initialEntries={['/individual/record?step=tx']}><StepProbe /></MemoryRouter>)
  expect(screen.getByRole('button')).toHaveTextContent('tx')
  rerender(<MemoryRouter initialEntries={['/individual/record?step=zzz']}><StepProbe /></MemoryRouter>)
  expect(screen.getByRole('button')).toHaveTextContent('tx')
})

test('useStepParam outside a router keeps the step in state', () => {
  render(<StepProbe />)
  expect(screen.getByRole('button')).toHaveTextContent('sum')
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByRole('button')).toHaveTextContent('his')
})

test('RecordPage and TreatmentPage share the stepper marker', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await screen.findByText('What happened, step by step')
  expect(document.querySelectorAll('[data-tour="record-steps"]')).toHaveLength(1)
})
