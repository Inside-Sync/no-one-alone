import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import type { IncidentDoc, RecoveryDoc } from '@/data/contract'
import { RecoveryCard } from '@/features/individual/recovery/RecoveryCard'
import { RecoveryPage } from '@/features/individual/recovery/RecoveryPage'
import { PAGE_REGISTRY } from '@/features/registry'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/recovery/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const idle = async () => {}
const liveValue: LiveIncidentValue = {
  live: true, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
  start: idle, reset: idle, checkin: idle, act: idle, recover: idle,
}
vi.mock('@/state/LiveIncident', () => ({ useLiveIncident: () => liveValue }))

const recovery: RecoveryDoc = {
  createdAt: '2026-10-16T05:10:00Z', staffName: 'Dr Nguyen', diagnosis: 'd', notes: 'No driving for 4 weeks.', meds: [], activities: [],
  followUps: [{ text: 'GP check with Dr Patel', inDays: 7, date: '2026-10-23' }],
  summary: 'Margaret, you are home.', summaryAudioPath: 'audio/i/recovery-summary.mp3', fallback: false,
  reminders: [
    { time: '08:00', kind: 'MED', text: 'Time for your apixaban, 5 mg.', audioPath: 'audio/i/recovery-0.mp3' },
    { time: '18:00', kind: 'MED', text: 'Time for your amlodipine, 5 mg.' },
    { time: '19:00', kind: 'ACTIVITY', text: 'Feed the cat.' },
  ],
}

afterEach(() => { vi.useRealTimers(); liveValue.incident = null })

test('renders the summary, the next reminder, the list, follow-ups and notes', () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.parse('2026-10-16T12:00:00Z'))
  render(<RecoveryCard recovery={recovery} tz="UTC" />)
  expect(screen.getByText('Margaret, you are home.')).toBeInTheDocument()
  expect(screen.getByText('Next: 18:00 Time for your amlodipine, 5 mg.')).toBeInTheDocument()
  expect(screen.getByText('Time for your apixaban, 5 mg.')).toBeInTheDocument()
  expect(screen.getByText('GP check with Dr Patel · 2026-10-23')).toBeInTheDocument()
  expect(screen.getByText('No driving for 4 weeks.')).toBeInTheDocument()
})

test('"I\'ve done it" moves to the next reminder', () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.parse('2026-10-16T07:00:00Z'))
  render(<RecoveryCard recovery={recovery} tz="UTC" />)
  expect(screen.getByText(/^Next: 08:00/)).toBeInTheDocument()
  act(() => { fireEvent.click(screen.getByRole('button', { name: "I've done it" })) })
  expect(screen.getByText(/^Next: 18:00/)).toBeInTheDocument()
})

test('a task shows its why, an unknown one has none, and ticking marks it done', () => {
  render(<RecoveryCard recovery={recovery} tz="UTC" />)
  const row = screen.getByText('Time for your apixaban, 5 mg.').closest('li')!
  expect(within(row).getByText('Stops clots forming because of the uneven heartbeat. Replaces aspirin.')).toBeInTheDocument()
  expect(screen.getByText('Feed the cat.').closest('li')!.querySelector('small')).toBeNull()
  expect(within(screen.getByText('Feed the cat.').closest('li')!).getByRole('button', { name: 'Done: Feed the cat.' })).toBeInTheDocument()
  fireEvent.click(within(row).getByRole('button', { name: 'Taken: Time for your apixaban, 5 mg.' }))
  expect(within(row).queryByRole('button', { name: /^Taken/ })).toBeNull()
  expect(within(row).getByText('✓')).toBeInTheDocument()
})

test('is registered for individual/recovery', () => {
  expect(PAGE_REGISTRY['individual/recovery']).toBe(RecoveryPage)
})

test('without a live recovery the page shows the idle card, worded per role', () => {
  renderWithProviders(<RecoveryPage />, { who: 'family' })
  expect(screen.getByText("Margaret's recovery plan will appear here")).toBeInTheDocument()
})

test('with a live recovery the page shows the plan and 5 planned calls with dates', () => {
  liveValue.incident = { recovery } as unknown as IncidentDoc
  renderWithProviders(<RecoveryPage />, { who: 'self' })
  expect(screen.getByText('Margaret, you are home.')).toBeInTheDocument()
  const calls = screen.getByRole('heading', { name: 'Your check-in calls' }).closest('article')!
  const rows = within(calls).getAllByText(/^Day \d+ · \d{4}-\d{2}-\d{2}$/)
  expect(rows.map((r) => r.textContent)).toEqual([
    'Day 1 · 2026-10-17', 'Day 3 · 2026-10-19', 'Day 7 · 2026-10-23', 'Day 14 · 2026-10-30', 'Day 30 · 2026-11-15',
  ])
  expect(within(calls).getByText('How are you feeling, any headaches?')).toBeInTheDocument()
  expect(within(calls).getAllByText('Planned')).toHaveLength(5)
})

const plan: Partial<RecoveryDoc> = {
  meds: [
    { name: 'Warfarin', dose: '3 mg', times: ['18:00'], change: 'New' },
    { name: 'Ramipril', dose: '5 mg', times: ['08:00'], change: 'New' },
    { name: 'Atorvastatin', dose: '40 mg', times: ['21:00'], change: 'Increased' },
    { name: 'Vitamin D', dose: '1000 IU', times: ['08:00'] },
    { name: 'Clopidogrel', dose: '75 mg', times: [], change: 'Stop' },
  ],
  activities: [{ text: 'No driving for 1 month', times: [] }],
  followUps: [{ text: 'GP review with Dr Patel at 10:30', inDays: 6, date: '2026-10-23' }],
  reminders: [
    { time: '07:00', kind: 'MED', text: 'Time for your clopidogrel, 75 mg.' },
    { time: '08:00', kind: 'MED', text: 'Time for your ramipril, 5 mg.' },
  ],
}

test('a stopped medicine gets no reminder row, a stop chip, and stays out of the medicines list', () => {
  render(<RecoveryCard recovery={{ ...recovery, ...plan } as RecoveryDoc} tz="UTC" />)
  expect(screen.queryByText('Time for your clopidogrel, 75 mg.')).toBeNull()
  expect(screen.getByText('Time for your ramipril, 5 mg.')).toBeInTheDocument()
  expect(screen.getByText('⛔ Stop: Clopidogrel')).toBeInTheDocument()
  expect(screen.getByText('No driving for 1 month')).toBeInTheDocument()
  const list = screen.getByRole('heading', { name: 'Your medicines, explained' }).nextElementSibling as HTMLElement
  expect([...list.querySelectorAll('li strong')].map((b) => b.textContent)).toEqual(['Warfarin 3 mg', 'Ramipril 5 mg', 'Atorvastatin 40 mg', 'Vitamin D 1000 IU'])
  expect(within(list).getByText('Atorvastatin 40 mg').closest('li')!.querySelector('.pill.warn')!.textContent).toBe('Increased')
  expect(within(list).getByText('Ramipril 5 mg').closest('li')!.textContent).toContain('morning')
})

test("Noa's hand-off lines name the plan's new and stopped medicines, first slot and GP date", () => {
  liveValue.incident = { recovery: { ...recovery, ...plan } } as unknown as IncidentDoc
  renderWithProviders(<RecoveryPage />, { who: 'family' })
  const card = screen.getByRole('heading', { name: '💬 What Noa told Margaret' }).closest('article')!
  expect(within(card).getByText("You have 2 new tablets: warfarin and ramipril. Please stop taking clopidogrel. I've told the pharmacy and updated your pill box.")).toBeInTheDocument()
  expect(within(card).getByText(/Your next one is at 08:00: Ramipril 5 mg \+ Vitamin D 1000 IU\.$/)).toBeInTheDocument()
  expect(within(card).getByText(/Your GP review with Dr Patel at 10:30 is Fri 23 Oct\. David can drive you\.$/)).toBeInTheDocument()
})
