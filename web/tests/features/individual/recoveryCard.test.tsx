import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import type { RecoveryDoc } from '@/data/contract'
import { RecoveryCard } from '@/features/individual/me/RecoveryCard'

const recovery: RecoveryDoc = {
  createdAt: '2026-10-16T05:10:00Z', staffName: 'Dr Nguyen', diagnosis: 'd', notes: 'No driving for 4 weeks.', meds: [], activities: [],
  followUps: [{ text: 'GP check with Dr Patel', inDays: 7, date: '2026-10-23' }],
  summary: 'Margaret, you are home.', summaryAudioPath: 'audio/i/recovery-summary.mp3', fallback: false,
  reminders: [
    { time: '08:00', kind: 'MED', text: 'Time for your aspirin, 100 mg.', audioPath: 'audio/i/recovery-0.mp3' },
    { time: '18:00', kind: 'MED', text: 'Time for your amlodipine, 5 mg.' },
  ],
}

afterEach(() => vi.useRealTimers())

test('renders the summary, the next reminder, the list, follow-ups and notes', () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.parse('2026-10-16T12:00:00Z'))
  render(<RecoveryCard recovery={recovery} tz="UTC" />)
  expect(screen.getByText('Margaret, you are home.')).toBeInTheDocument()
  expect(screen.getByText('Next: 18:00 Time for your amlodipine, 5 mg.')).toBeInTheDocument()
  expect(screen.getByText('Time for your aspirin, 100 mg.')).toBeInTheDocument()
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
