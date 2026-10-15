import type { IncidentDoc } from '@/data/contract'
import { liveView, packetRows, type LivePeople } from '@/domain/incident'
import i18n from '@/i18n'

const T0 = Date.parse('2026-10-14T19:03:00Z')
const at = (s: number) => new Date(T0 + s * 1000).toISOString()

const people: LivePeople = { person: null, members: { david: { displayName: 'David Collins' } as LivePeople['members'][string] } }

const incident = {
  personId: 'margaret', scenario: 'STROKE', status: 'ESCALATING', level: 'EMERGENCY', version: 1, createdAt: at(0), updatedAt: at(80),
  alert: { kind: 'HR_HIGH_NO_MOVEMENT', at: at(0), hr: 142 }, lastKnownWellAt: at(-480),
  triage: { reasons: ['slurred speech'], fallback: false },
  assignments: [{ memberId: 'david', role: 'NEARBY', actions: [], state: 'ACCEPTED', etaMin: 6, respondedAt: at(72) }],
  ownerId: 'david',
  timeline: [
    { at: at(0), actor: 'SYSTEM', kind: 'ALERT', text: 'Heart rate 142 with no movement' },
    { at: at(41), actor: 'AGENT', kind: 'VERIFIED', text: 'Verified' },
    { at: at(72), actor: 'david', kind: 'ACCEPTED', text: 'David accepted' },
  ],
  handoff: {
    hospitalId: 'h1', hospitalName: 'Camperdown', status: 'RECEIVED', etaMin: 11,
    packet: {
      patient: { name: 'Margaret Collins', age: 78, sex: 'F' }, suspected: 'STROKE', findings: ['slurred speech'], conditions: [], medications: [],
      allergies: [], communication: ['HARD_OF_HEARING'], etaMin: 11, text: '',
    },
  },
  demo: { timerSeconds: 300, noReplySeconds: 20, clockOffsetMs: 0 },
} as unknown as IncidentDoc

afterEach(async () => { await i18n.changeLanguage('en') })

test('labels are English; backend text (timeline, triage reason) is shown as is', () => {
  const v = liveView('inc1', incident, people, T0 + 120_000)
  expect(v.levelLabel).toBe('Emergency now')
  expect(v.what).toBe('Slurred speech')
  expect(v.owner).toMatchObject({ title: 'David · on the way', subtitle: 'Owns the case', eta: '5′' })
  expect(v.timeline.map((r) => [r.ph, r.d, r.s])).toEqual([
    ['Verify', 'Heart rate 142 with no movement', 'System'],
    ['Verify', 'Verified', 'Agent'],
    ['Escalate', 'David accepted', 'David Collins'],
  ])
  expect(v.sla[0]).toEqual(['Alert → verified', '41 s'])
  expect(v.sla[4]).toEqual(['ED has the packet', '11 min ahead'])
  expect(v.phone.help).toBe('David · 5 min away')
  expect(v.packet?.summary).toBe('Suspected stroke · ETA 11 min')
})

test('the same incident in Vietnamese: labels translate, backend text does not', async () => {
  await i18n.changeLanguage('vi')
  const v = liveView('inc1', incident, people, T0 + 120_000)
  expect(v.levelLabel).toBe('Khẩn cấp ngay')
  expect(v.what).toBe('Slurred speech')
  expect(v.owner.subtitle).toBe('Người phụ trách')
  expect(v.timeline[0]).toMatchObject({ ph: 'Xác minh', d: 'Heart rate 142 with no movement', s: 'Hệ thống' })
  expect(v.sla[0]).toEqual(['Cảnh báo → xác minh', '41 giây'])
  expect(v.phone.help).toBe('David · còn 5 phút')
})

test('packet rows: labels, sex and communication needs come from the live namespace', () => {
  const rows = packetRows(incident.handoff!.packet!, 'UTC')
  expect(rows).toContainEqual(['Patient', 'Margaret Collins, 78 · Female'])
  expect(rows).toContainEqual(['Allergy', 'None known'])
  expect(rows).toContainEqual(['Comms', 'Hard of hearing: write questions down'])
})
