import { screen } from '@testing-library/react'
import { vi } from 'vitest'
import type { IncidentDoc } from '@/data/contract'
import { liveView, type LivePeople } from '@/domain/incident'
import { LiveAlertCard } from '@/features/individual/live/LiveAlertCard'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/live/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const at = '2026-10-16T02:03:00Z'
const people = {
  person: { displayName: 'Margaret Collins' },
  members: { james: { displayName: 'James Collins' }, david: { displayName: 'David Collins' } },
} as unknown as LivePeople

test("after David did not answer, James's call button names David, not the nearby helper", () => {
  const incident = {
    personId: 'margaret', status: 'ESCALATING', level: 'EMERGENCY', alert: { kind: 'HR_HIGH_NO_MOVEMENT', at }, timeline: [],
    demo: { timerSeconds: 25, noReplySeconds: 25, clockOffsetMs: 0 },
    assignments: [
      { memberId: 'james', role: 'DISTANT', actions: ['CALL_NEARBY'], state: 'EXPIRED' },
      { memberId: 'david', role: 'NEARBY', actions: ['ACCEPT', 'DECLINE'], state: 'EXPIRED' },
    ],
  } as unknown as IncidentDoc
  renderWithProviders(<LiveAlertCard view={liveView('i1', incident, people, Date.parse(at))} incident={incident} people={people}
    scene={null} viewer="james" act={async () => {}} onReset={() => {}} />)
  expect(screen.getByRole('button', { name: 'Call David' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Call the nearby helper' })).toBeNull()
})
