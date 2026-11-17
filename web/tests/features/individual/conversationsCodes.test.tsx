import { act, render, screen } from '@testing-library/react'
import type { IncidentDoc, PersonDoc } from '@/data/contract'
import type { LivePeople } from '@/domain/incident'
import { ConversationsCard } from '@/features/individual/live/ConversationsCard'
import i18n from '@/i18n'

const at = (s: number) => new Date(Date.parse('2026-10-15T22:03:00Z') + s * 1000).toISOString()
const member = (displayName: string) => ({ displayName }) as PersonDoc

const people: LivePeople = {
  person: { displayName: 'Moza Al Hammadi', timezone: 'Asia/Dubai', emergencyNumber: '998' } as PersonDoc,
  members: { james: member('Khalid Al Hammadi'), david: member('Hamad Al Hammadi') },
}

const incident = (timeline: object[]) => ({
  personId: 'margaret', scenario: 'STROKE', status: 'ESCALATING', level: 'EMERGENCY', version: 1, createdAt: at(0), updatedAt: at(90),
  alert: { kind: 'HR_HIGH_NO_MOVEMENT', at: at(0), hr: 142 }, assignments: [], ownerId: null, timeline,
  handoff: { hospitalId: 'h1', hospitalName: 'Corniche Stroke Centre', status: 'RECEIVED' },
  demo: { timerSeconds: 30, noReplySeconds: 15, clockOffsetMs: 0 },
}) as unknown as IncidentDoc

afterEach(async () => { await act(() => i18n.changeLanguage('en')) })

test('the member of a call is memberId, so wording that names no one still shows what Noa said', () => {
  render(<ConversationsCard incident={incident([
    { at: at(10), actor: 'SYSTEM', kind: 'NOTIFIED', text: 'الاتصال: Moza may be having a stroke.', memberId: 'david', params: {} },
    { at: at(20), actor: 'SYSTEM', kind: 'ACCEPTED', text: 'x', memberId: 'david' },
  ])} people={people} call={[]} dialling={false} />)
  expect(screen.getByText(/Noa → Hamad/)).toBeInTheDocument()
  expect(screen.getByText('“Moza may be having a stroke.”')).toBeInTheDocument()
  expect(screen.getByText('“I\'m on my way.”')).toBeInTheDocument()
})

test('without memberId the name before the colon still finds the member', () => {
  render(<ConversationsCard incident={incident([
    { at: at(10), actor: 'SYSTEM', kind: 'NOTIFIED', text: 'Calling Hamad Al Hammadi: Moza may be having a stroke.' },
  ])} people={people} call={[]} dialling={false} />)
  expect(screen.getByText(/Noa → Hamad/)).toBeInTheDocument()
})

test('the hospital reply is the line in the UI language when it has params, the backend text when not', async () => {
  const entry = { at: at(30), actor: 'SYSTEM', kind: 'HANDOFF_RECEIVED', text: 'Received. Stroke call activated, CT scanner on standby.' }
  const { rerender } = render(<ConversationsCard incident={incident([entry])} people={people} call={[]} dialling={false} />)
  expect(screen.getByText(`“${entry.text}”`)).toBeInTheDocument()
  await act(() => i18n.changeLanguage('ar'))
  rerender(<ConversationsCard incident={incident([{ ...entry, text: 'x', params: { hospitalId: 'h1' } }])} people={people} call={[]} dialling={false} />)
  const line = (i18n.getFixedT('ar', 'live') as (k: string) => string)('line.HANDOFF_RECEIVED')
  expect(screen.getByText(`“${line}”`)).toBeInTheDocument()
})
