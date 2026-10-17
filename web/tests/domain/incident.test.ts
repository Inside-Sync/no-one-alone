import type { IncidentDoc, PacketDoc } from '@/data/contract'
import { helperStatus, liveView, orbitWithHospital, packetRows, type LivePeople } from '@/domain/incident'
import type { OrbitScene } from '@/data/types'
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
    ['Verify', 'Verified', 'Noa'],
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

test('packet rows: family history follows history', () => {
  const rows = packetRows({ ...incident.handoff!.packet!, conditions: ['hypertension'], familyHistory: ['father: stroke at 68, hypertension'] }, 'UTC')
  const labels = rows.map((r) => r[0])
  expect(labels.indexOf('Family history')).toBe(labels.indexOf('History') + 1)
  expect(rows).toContainEqual(['Family history', 'father: stroke at 68, hypertension'])
})

test('packet rows: blocked by consent shows the emergency facts and what was withheld', () => {
  const rows = packetRows({ suspected: 'STROKE', findings: ['HR 142'], text: 'PRE-ARRIVAL', status: 'BLOCKED_CONSENT',
    withheld: ['identity', 'medications'] }, 'UTC')
  expect(rows.find((r) => r[0] === 'Patient')).toBeUndefined()
  expect(rows).toContainEqual(['Findings', 'HR 142'])
  expect(rows).toContainEqual(['Withheld', 'No valid consent · Identity, Medicines'])
})

test('packet rows: partial packet lists withheld categories without the consent note', () => {
  const rows = packetRows({ ...incident.handoff!.packet!, status: 'PARTIAL', withheld: ['allergies'] }, 'UTC')
  expect(rows).toContainEqual(['Withheld', 'Allergies'])
})

test('packet rows: absent allergies with ALLERGIES_NOT_RECORDED read as not recorded, never none known', () => {
  const p: Partial<PacketDoc> = { ...incident.handoff!.packet! }
  delete p.allergies
  const rows = packetRows({ ...p, warnings: ['ALLERGIES_NOT_RECORDED'] }, 'UTC')
  expect(rows).toContainEqual(['Allergy', 'Not recorded'])
})

test('packet rows: Vietnamese labels for the new rows', async () => {
  await i18n.changeLanguage('vi')
  const rows = packetRows({ suspected: 'STROKE', findings: [], text: 'x', status: 'BLOCKED_CONSENT', withheld: ['identity'] }, 'UTC')
  expect(rows).toContainEqual(['Bị giữ lại', 'Không có đồng ý hợp lệ · Danh tính'])
  expect(i18n.t('live:incident.packet.noneKnown')).toBe('Không có dị ứng đã biết')
})

test('liveView: a packet that withheld identity shows the hospital no name or age, even with the seed person known', () => {
  const seeded = { person: { displayName: 'Margaret Collins', age: 78 }, members: {} } as unknown as LivePeople
  const blocked = {
    ...incident,
    handoff: { ...incident.handoff!, packet: { suspected: 'STROKE', findings: ['HR 142'], text: 'PRE-ARRIVAL', status: 'BLOCKED_CONSENT', withheld: ['identity', 'medications'] } },
  } as unknown as IncidentDoc
  const v = liveView('inc1', blocked, seeded, T0 + 120_000)
  const label = 'Patient (identity withheld)'
  expect(v.packet?.meta).toBe(label)
  expect(v.packet?.incoming.patient).toContain(label)
  for (const text of [v.packet!.meta, v.packet!.incoming.patient]) {
    expect(text).not.toContain('Margaret')
    expect(text).not.toContain('78')
  }
  expect(v.personName).toBe('Margaret Collins')
})

test('liveView: no packet for the hospital while the handoff is PENDING', () => {
  const pending = { ...incident, handoff: { ...incident.handoff!, status: 'PENDING' } } as unknown as IncidentDoc
  expect(liveView('inc1', pending, people, T0).packet).toBeNull()
  const rest: Partial<typeof incident.handoff> = { ...incident.handoff! }
  delete (rest as { packet?: unknown }).packet
  const noPacket = { ...incident, handoff: { ...rest, status: 'PENDING' } } as unknown as IncidentDoc
  expect(liveView('inc1', noPacket, people, T0).packet).toBeNull()
})

test('liveView: after no one nearby accepted, the owner card says 000 was called automatically', () => {
  const inc = {
    ...incident, ownerId: undefined, assignments: [{ memberId: 'david', role: 'NEARBY', actions: [], state: 'EXPIRED' }],
    timeline: [...incident.timeline.slice(0, 2),
      { at: at(80), actor: 'SYSTEM', kind: 'NO_NEARBY', text: 'No one nearby accepted' },
      { at: at(80), actor: 'SYSTEM', kind: 'CALLED_115', text: 'Calling 000 automatically with the call script (demo call)' }],
  } as unknown as IncidentDoc
  const v = liveView('inc1', inc, people, T0 + 120_000)
  expect(v.owner).toMatchObject({ title: 'No one nearby can come', subtitle: '000 called automatically' })
})

const queue = {
  person: { displayName: 'Margaret Collins', circle: [
    { memberId: 'james', role: 'DISTANT', priority: 1, criticalAlerts: true },
    { memberId: 'david', role: 'NEARBY', priority: 2, criticalAlerts: true },
    { memberId: 'aisha', role: 'NEARBY', priority: 3, criticalAlerts: false },
    { memberId: 'sarah', role: 'DISTANT', priority: 4, criticalAlerts: true },
  ] },
  members: { james: { displayName: 'James Collins' }, david: { displayName: 'David Collins' } },
} as unknown as LivePeople

test('liveView: during check-in the owner card names the first in the call queue, James before David', () => {
  const inc = { ...incident, status: 'CHECKING_IN', ownerId: undefined, assignments: [] } as unknown as IncidentDoc
  expect(liveView('inc1', inc, queue, T0).owner).toMatchObject({ title: 'James · not yet alerted', subtitle: 'First to call' })
})

test('liveView: while James is rung the owner card says so; Sarah, alerted only, is not the one being called', () => {
  const inc = { ...incident, ownerId: undefined, assignments: [
    { memberId: 'james', role: 'DISTANT', actions: [], state: 'NOTIFIED', deadlineAt: at(60) },
    { memberId: 'david', role: 'NEARBY', actions: [], state: 'QUEUED' },
    { memberId: 'sarah', role: 'DISTANT', actions: [], state: 'NOTIFIED' },
  ] } as unknown as IncidentDoc
  expect(liveView('inc1', inc, queue, T0).owner).toMatchObject({ title: 'James · alerted', subtitle: 'Calling now', eta: '1:00' })
})

test('orbitWithHospital names the hospital ball after the handoff, without (demo)', () => {
  const scene = { nodes: [{ id: 'hosp', name: 'Sydney Stroke Center' }, { id: 'david', name: 'David' }] } as unknown as OrbitScene
  expect(orbitWithHospital(scene, 'Camperdown Stroke Centre (demo)').nodes.map((n) => n.name)).toEqual(['Camperdown Stroke Centre', 'David'])
  expect(orbitWithHospital(scene, undefined)).toBe(scene)
})

describe('helperStatus: what Noa tells Margaret after the plan', () => {
  const circle = {
    person: { displayName: 'Margaret Collins', emergencyNumber: '000' },
    members: { james: { displayName: 'James Collins' }, david: { displayName: 'David Collins' }, lan: { displayName: 'Lan Tran' } },
  } as unknown as LivePeople
  const ev = (s: number, actor: string, kind: string, text: string) => ({ at: at(s), actor, kind, text })
  const alerted = ev(79, 'SYSTEM', 'ALERTED', 'Alert sent to James, Sarah and David: Margaret may be having a stroke. Noa is calling for help now.')
  const callJames = ev(80, 'SYSTEM', 'NOTIFIED', 'Calling James: Margaret may be having a stroke. Her speech is slurred.')
  const jamesExpired = ev(85, 'SYSTEM', 'EXPIRED', 'James did not answer in 5 s · voicemail and text sent')
  const callDavid = ev(85, 'SYSTEM', 'NOTIFIED', 'Calling David: Margaret may be having a stroke. You are 6 min away. Use the spare key if needed.')
  const auto000 = (s: number) => ev(s, 'SYSTEM', 'CALLED_115', 'Calling 000 automatically with the call script (demo call)')
  const withTl = (...timeline: object[]) => ({ ...incident, timeline: [...incident.timeline.slice(0, 2), ...timeline] }) as unknown as IncidentDoc

  test('each Shared contract event maps to its status key, text and clip', () => {
    const steps: [object[], string, string, string | null][] = [
      [[alerted, callJames], 'calling-james', "I'm calling James now. Please stay sitting.", '/noa/calling-james.mp3'],
      [[alerted, callJames, jamesExpired, callDavid], 'no-answer-james-calling-david',
        "James didn't answer, so I've left him a message. I'm calling David now.", '/noa/no-answer-james-calling-david.mp3'],
      [[alerted, callJames, jamesExpired, callDavid, ev(90, 'david', 'ACCEPTED', 'David accepted'), auto000(90)], 'on-the-way-david',
        "David is on his way. He has a key. I'm calling 000 now.", '/noa/on-the-way-david.mp3'],
      [[alerted, callJames, jamesExpired, callDavid, ev(95, 'SYSTEM', 'EXPIRED', 'David did not answer in 5 s'),
        ev(95, 'SYSTEM', 'NO_NEARBY', 'No one nearby accepted'), auto000(95)], 'calling-000',
        "I'm calling 000 for an ambulance now. Stay where you are. Help is coming.", null],
    ]
    for (const [tl, key, text, clip] of steps) {
      const s = helperStatus(withTl(...tl), circle)
      expect(s).toEqual({ text, clip, key: `${key} ${(tl[tl.length - 1] as { at: string }).at}` })
    }
  })

  test('nothing to say before the plan calls anyone, after the helper arrived, or for the ALERTED event alone', () => {
    expect(helperStatus(withTl(), circle)).toBeNull()
    expect(helperStatus(withTl(alerted), circle)).toBeNull()
    expect(helperStatus(withTl(callDavid, ev(84, 'david', 'ACCEPTED', 'x'), ev(99, 'david', 'ARRIVED', 'x')), circle)).toBeNull()
  })

  test('an accept without the 000 call (come now): on the way, text only', () => {
    expect(helperStatus(withTl(callDavid, ev(84, 'david', 'ACCEPTED', 'x')), circle)).toEqual({
      text: 'David is on the way. Help is coming.', clip: null, key: `on-the-way ${at(84)}`,
    })
  })

  test('a member outside the clip list: text only', () => {
    const s = helperStatus(withTl(ev(80, 'SYSTEM', 'NOTIFIED', 'Calling Lan Tran: Bà Mai may be having a stroke.')), circle)
    expect(s).toMatchObject({ text: "I'm calling Lan now. Please stay sitting.", clip: null })
  })

  test('Vietnamese text, same clip rule', async () => {
    await i18n.changeLanguage('vi')
    expect(helperStatus(withTl(callJames), circle)).toMatchObject({ text: 'Tôi đang gọi James. Bà cứ ngồi yên nhé.', clip: '/noa/calling-james.mp3' })
  })

  test('phoneView: status only once the instruction exists', () => {
    const inc = { ...withTl(callJames), personInstruction: undefined } as unknown as IncidentDoc
    expect(liveView('inc1', inc, circle, T0 + 120_000).phone.status).toBeNull()
    const withInstr = { ...inc, personInstruction: { scriptIds: [], text: 'Sit down.' } } as unknown as IncidentDoc
    expect(liveView('inc1', withInstr, circle, T0 + 120_000).phone.status?.clip).toBe('/noa/calling-james.mp3')
  })

  test('the ALERTED event is in the escalate phase', () => {
    expect(liveView('inc1', withTl(alerted), circle, T0).timeline[2].ph).toBe('Escalate')
  })
})
