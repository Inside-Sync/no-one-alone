import type { IncidentDoc, PacketDoc } from '@/data/contract'
import { helperStatus, liveView, packetRows, type LivePeople } from '@/domain/incident'
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

describe('helperStatus: what NOA tells Margaret after the plan', () => {
  const circle = {
    person: { displayName: 'Margaret Collins', emergencyNumber: '000' },
    members: { david: { displayName: 'David Collins' }, aisha: { displayName: 'Aisha Rahman' }, lan: { displayName: 'Lan Tran' } },
  } as unknown as LivePeople
  const ev = (s: number, actor: string, kind: string, text: string) => ({ at: at(s), actor, kind, text })
  const callDavid = ev(80, 'SYSTEM', 'NOTIFIED', 'Calling David Collins: Margaret may be having a stroke.')
  const withTl = (...timeline: object[]) => ({ ...incident, timeline: [...incident.timeline.slice(0, 2), ...timeline] }) as unknown as IncidentDoc

  test('first call: calling David, with his clip', () => {
    expect(helperStatus(withTl(callDavid, ev(80, 'SYSTEM', 'NOTIFIED', 'James Collins notified')), circle)).toEqual({
      text: "I'm calling David now. Please stay where you are.", clip: '/noa/calling-david.mp3', key: `${at(80)} NOTIFIED david`,
    })
  })

  test('after David did not answer: says so and who is next', () => {
    const s = helperStatus(withTl(callDavid, ev(83, 'SYSTEM', 'EXPIRED', 'David Collins did not answer in 3 s'),
      ev(83, 'SYSTEM', 'NOTIFIED', 'Calling Aisha Rahman: Margaret may be having a stroke.')), circle)
    expect(s).toEqual({ text: "David didn't answer. I'm calling Aisha now.", clip: '/noa/no-answer-david-calling-aisha.mp3', key: `${at(83)} NOTIFIED aisha` })
  })

  test('accepted: the helper is on the way', () => {
    const s = helperStatus(withTl(callDavid, ev(84, 'aisha', 'ACCEPTED', 'Aisha Rahman is on the way')), circle)
    expect(s).toEqual({ text: 'Aisha is on the way. Help is coming.', clip: '/noa/on-the-way-aisha.mp3', key: `${at(84)} ACCEPTED aisha` })
  })

  test('no one nearby: calling 000, with the clip only for 000', () => {
    const tl = [callDavid, ev(90, 'SYSTEM', 'NO_NEARBY', 'No one nearby accepted'), ev(90, 'SYSTEM', 'CALLED_115', 'Calling 000 automatically with the call script (demo call)')]
    expect(helperStatus(withTl(...tl), circle)).toEqual({
      text: "No one nearby can come, so I'm calling 000 for an ambulance now. Stay where you are. Help is coming.", clip: '/noa/calling-000.mp3', key: `${at(90)} CALLED_115 SYSTEM`,
    })
    const mai = { ...circle, person: { displayName: 'Mai', emergencyNumber: '115' } } as unknown as LivePeople
    expect(helperStatus(withTl(...tl), mai)?.clip).toBeNull()
  })

  test('a member outside the clip list: text only', () => {
    const s = helperStatus(withTl(ev(80, 'SYSTEM', 'NOTIFIED', 'Calling Lan Tran: Bà Mai may be having a stroke.')), circle)
    expect(s).toMatchObject({ text: "I'm calling Lan now. Please stay where you are.", clip: null })
  })

  test('nothing to say before the plan calls anyone, and after the helper arrived', () => {
    expect(helperStatus(withTl(), circle)).toBeNull()
    expect(helperStatus(withTl(callDavid, ev(84, 'david', 'ACCEPTED', 'x'), ev(99, 'david', 'ARRIVED', 'x')), circle)).toBeNull()
  })

  test('Vietnamese text, same clip rule', async () => {
    await i18n.changeLanguage('vi')
    expect(helperStatus(withTl(ev(84, 'david', 'ACCEPTED', 'x')), circle)?.text).toBe('David đang đến. Sắp có người giúp bà.')
  })

  test('phoneView: status only once the instruction exists', () => {
    const inc = { ...withTl(ev(84, 'david', 'ACCEPTED', 'x')), personInstruction: undefined } as unknown as IncidentDoc
    expect(liveView('inc1', inc, circle, T0 + 120_000).phone.status).toBeNull()
    const withInstr = { ...inc, personInstruction: { scriptIds: [], text: 'Sit down.' } } as unknown as IncidentDoc
    expect(liveView('inc1', withInstr, circle, T0 + 120_000).phone.status?.clip).toBe('/noa/on-the-way-david.mp3')
  })
})
