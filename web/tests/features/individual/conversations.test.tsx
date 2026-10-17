import { fireEvent, render, screen } from '@testing-library/react'
import type { IncidentDoc, PersonDoc } from '@/data/contract'
import type { LivePeople } from '@/domain/incident'
import { ConversationsCard } from '@/features/individual/live/ConversationsCard'
import '@/i18n'

const at = (s: number) => new Date(Date.parse('2026-10-15T19:03:00Z') + s * 1000).toISOString()
const member = (displayName: string) => ({ displayName }) as PersonDoc

const people: LivePeople = {
  person: { displayName: 'Margaret Collins', timezone: 'Australia/Sydney', emergencyNumber: '000' } as PersonDoc,
  members: { james: member('James'), david: member('David'), sarah: member('Sarah') },
}

const NOTICE = 'This is Noa from No One Alone. Margaret Collins, 78, female. Suspected stroke.'
const UPDATE = 'An ambulance is on its way to Margaret (about 12 minutes). The stroke team at Camperdown Stroke Centre has her details. David is on his way.'

const incident = {
  personId: 'margaret', scenario: 'STROKE', status: 'ESCALATING', level: 'EMERGENCY', version: 1, createdAt: at(0), updatedAt: at(90),
  alert: { kind: 'HR_HIGH_NO_MOVEMENT', at: at(0), hr: 142 },
  assignments: [{ memberId: 'james' }, { memberId: 'david' }, { memberId: 'sarah' }],
  ownerId: 'david',
  timeline: [
    { at: at(60), actor: 'AGENT', kind: 'HANDOFF_SENT', text: NOTICE },
    { at: at(61), actor: 'SYSTEM', kind: 'HANDOFF_RECEIVED', text: 'Received. Stroke call activated, CT scanner on standby.' },
    { at: at(61), actor: 'AGENT', kind: 'FAMILY_UPDATE', text: UPDATE },
  ],
  handoff: { hospitalId: 'sydney-stroke-center', hospitalName: 'Camperdown Stroke Centre', status: 'RECEIVED', packet: { text: 'PRE-ARRIVAL packet' } },
  demo: { timerSeconds: 30, noReplySeconds: 15, clockOffsetMs: 0 },
} as unknown as IncidentDoc

test('shows the spoken hand-off line, not the packet, and the family update on each family channel', () => {
  render(<ConversationsCard incident={incident} people={people} call={[]} dialling={false} />)

  expect(screen.getByText(`“${NOTICE}”`)).toBeInTheDocument()
  expect(screen.queryByText(/PRE-ARRIVAL/)).toBeNull()
  expect(screen.getAllByText(`“${UPDATE}”`)).toHaveLength(3)

  fireEvent.click(screen.getByRole('button', { name: /James/ }))
  expect(screen.getByText(`“${UPDATE}”`)).toBeInTheDocument()
  expect(screen.getByText(/Noa → James/)).toBeInTheDocument()
})
