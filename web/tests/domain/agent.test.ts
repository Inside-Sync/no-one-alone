import type { IncidentDoc } from '@/data/contract'
import { agentView } from '@/domain/agent'
import type { LivePeople } from '@/domain/incident'
import i18n from '@/i18n'

const T0 = Date.parse('2026-10-14T14:30:00Z')
const at = (s: number) => new Date(T0 + s * 1000).toISOString()

const people = {
  person: {
    displayName: 'Margaret Collins', timezone: 'UTC', emergencyNumber: '000', location: { lat: -33.9105, lng: 151.1553 },
    circle: [
      { memberId: 'james', relation: 'son', role: 'DISTANT', priority: 1, criticalAlerts: true },
      { memberId: 'david', relation: 'brother', role: 'NEARBY', priority: 2, criticalAlerts: true },
      { memberId: 'aisha', relation: 'neighbour', role: 'NEARBY', priority: 3, criticalAlerts: false },
      { memberId: 'sarah', relation: 'daughter', role: 'DISTANT', priority: 4, criticalAlerts: true },
    ],
  },
  members: {
    james: { displayName: 'James', location: { lat: -37.8136, lng: 144.9631 } },
    david: { displayName: 'David', location: { lat: -33.9064, lng: 151.1553 } },
    sarah: { displayName: 'Sarah' },
  },
} as unknown as LivePeople

const red = {
  personId: 'margaret', scenario: 'STROKE', status: 'ESCALATING', level: 'EMERGENCY', version: 1, createdAt: at(0), updatedAt: at(200),
  alert: { kind: 'HR_HIGH_NO_MOVEMENT', at: at(0), hr: 142 },
  checkIn: {
    mode: 'LARGE_TEXT', noReplyCount: 0, busy: false, done: true, turns: [
      { by: 'AGENT', at: at(10), text: "Hello Margaret, it's Noa. Are you all right?" },
      { by: 'PERSON', at: at(20), text: 'Mm… yes' },
      { by: 'AGENT', at: at(30), text: 'Please say after me: The sky is blue in Sydney.' },
      { by: 'PERSON', at: at(40), text: 'Th… sky…', assessment: { clarity: 'SLURRED' } },
    ],
  },
  triage: { reasons: ['slurred speech'], fallback: false },
  assignments: [
    { memberId: 'james', role: 'DISTANT', actions: [], state: 'EXPIRED' },
    { memberId: 'david', role: 'NEARBY', actions: ['ACCEPT', 'DECLINE'], state: 'NOTIFIED' },
  ],
  ownerId: null,
  timeline: [
    { at: at(0), actor: 'SYSTEM', kind: 'ALERT', text: 'HR 142, no movement 10 min' },
    { at: at(50), actor: 'AGENT', kind: 'TRIAGED', text: 'Level EMERGENCY: slurred speech' },
    { at: at(60), actor: 'SYSTEM', kind: 'ALERTED', text: 'Alert sent to James, David and Sarah: Margaret needs help. Noa is calling for help now.' },
    { at: at(70), actor: 'SYSTEM', kind: 'NOTIFIED', text: 'Calling James: Margaret may be having a stroke.' },
    { at: at(100), actor: 'SYSTEM', kind: 'EXPIRED', text: 'James did not answer in 25 s · voicemail and text sent' },
    { at: at(110), actor: 'SYSTEM', kind: 'NOTIFIED', text: 'Calling David: Margaret may be having a stroke.' },
  ],
  demo: { timerSeconds: 25, noReplySeconds: 20, clockOffsetMs: 0 },
} as unknown as IncidentDoc

afterEach(async () => { await i18n.changeLanguage('en') })

test('before any alert: watching, everyone waiting, 000 not needed', () => {
  const a = agentView(null, people)
  expect(a.label).toBe('Watching')
  expect(a.decision).toBeNull()
  expect(a.calls.map((c) => [c.name, c.sub, c.status])).toEqual([
    ['James', 'Son · priority 1', 'Waiting'],
    ['David', 'Brother · nearest, 460 m', 'Waiting'],
    ['000', 'Ambulance', 'Not needed'],
  ])
  expect(a.alerts).toEqual([])
})

test('a red stroke incident: steps, decision, calls and alerts follow the backend', () => {
  const a = agentView(red, people)
  expect(a.label).toBe('Calling David')
  expect(a.pill).toBe('bad')
  expect(a.decision?.title).toBe('🔴 Red: possible stroke')
  expect(a.decision?.text).toMatch(/^Slurred speech\. Time matters/)
  expect(a.steps.map((s) => [s.label, s.note])).toEqual([
    ['Notice the warning sign', 'Done'],
    ['Check on Margaret', 'Done'],
    ['Speech test', 'Failed'],
    ['Ask how she feels', 'Skipped'],
    ['Decide: green, amber or red', 'Done'],
    ['Alert her whole circle', 'Done'],
    ['Call James (priority 1)', 'No answer'],
    ['Find the nearest person', 'Done'],
    ['Call David (460 m)', 'Now'],
    ['Call 000 with the script', ''],
    ['Send her record to hospital', ''],
    ['Stay with her until help arrives', ''],
  ])
  expect(a.calls.map((c) => [c.name, c.status, c.cls])).toEqual([
    ['James', 'No answer · voicemail', 'miss'],
    ['David', 'Ringing…', 'ring'],
    ['000', 'Not needed', ''],
  ])
  expect(a.alerts.map((x) => [x.name, x.sent])).toEqual([['James', 'Sent 14:31'], ['David', 'Sent 14:31'], ['Sarah', 'Sent 14:31']])
  expect(a.alerts[0].text).toBe('Margaret needs help. Noa is calling for help now.')
  expect(a.now).toBe('Calling David: Margaret may be having a stroke.')
})

test('while checking in, Noa says why it stepped in', async () => {
  const checking = { ...red, status: 'CHECKING_IN', level: undefined, triage: undefined, assignments: [], timeline: red.timeline.slice(0, 1),
    checkIn: { ...red.checkIn!, done: false, turns: red.checkIn!.turns.slice(0, 1) } } as unknown as IncidentDoc
  const a = agentView(checking, people)
  expect(a.label).toBe('Checking on her')
  expect(a.steps[1].state).toBe('cur')
  expect(a.now).toMatch(/^Warning sign: heart rate above 120 for 10 minutes while she isn't moving \(now 142 bpm\)/)
  await i18n.changeLanguage('vi')
  expect(agentView(checking, people).label).toBe('Đang hỏi thăm bà')
})
