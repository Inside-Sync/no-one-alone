import i18n from '@/i18n'
import type { FamilyDoc, ForecastDoc, PersonDoc } from '@/data/contract'
import { mockSource } from '@/data/sources/mock'
import { overlayCircle, overlayForecast, overlayLineage, overlayPerson, type Seed } from '@/data/sources/overlay'

const person: PersonDoc = {
  displayName: 'Margaret Collins',
  age: 79,
  sex: 'F',
  emergencyNumber: '000',
  location: { lat: -33.911, lng: 151.155 },
  circle: [
    { memberId: 'david', relation: 'son', role: 'NEARBY', priority: 1, criticalAlerts: true },
    { memberId: 'aisha', relation: 'neighbour', role: 'NEARBY', priority: 2, criticalAlerts: true },
    { memberId: 'james', relation: 'son', role: 'DISTANT', priority: 3, criticalAlerts: true },
    { memberId: 'sarah', relation: 'daughter', role: 'DISTANT', priority: 4, criticalAlerts: false },
  ],
}

const seed: Seed = {
  person,
  members: {
    david: { displayName: 'David', location: { lat: -33.911, lng: 151.1503 } },
    aisha: { displayName: 'Aisha', location: { lat: -33.9111, lng: 151.1552 } },
    james: { displayName: 'James', timezone: 'Australia/Melbourne' },
    sarah: { displayName: 'Sarah', timezone: 'Europe/London' },
  },
  hospitals: {},
}

const forecastDoc: ForecastDoc = {
  asOf: '2026-10-14',
  storyDay: 0,
  method: 'Example method',
  risks: [
    { condition: 'STROKE', horizonDays: 90, level: 'MEDIUM' },
    { condition: 'FALL', horizonDays: 90, level: 'LOW' },
  ],
  drivers: [],
  action: { text: 'Book a BP review', ownerMemberId: 'david' },
  series: [],
}

const familyDoc: FamilyDoc = {
  members: [
    { id: 'arthur', name: 'Arthur Hughes', relation: 'father', generation: 0, deceased: true, conditions: [{ label: 'stroke', ageAtOnset: 68 }] },
    { id: 'margaret', name: 'Margaret Collins', relation: 'self', generation: 1, conditions: [{ label: 'hypertension', ageAtOnset: 61 }] },
    { id: 'james', name: 'James Collins', relation: 'son', generation: 2, conditions: [{ label: 'hypertension' }] },
  ],
  flags: [{ memberId: 'james', screening: 'BP check', reason: 'Every year' }],
}

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('in English', () => {
  test('circle roles, notes and relations', async () => {
    const circle = overlayCircle(await mockSource.getCareCircle('margaret'), seed, 'james')
    const david = circle.find((m) => m.id === 'david')!
    expect(david.role).toEqual({ tone: 'good', text: 'On call' })
    expect(david.note).toMatch(/ away · first to call$/)
    expect(david.technicalName).toBe('David · son')
    const aisha = circle.find((m) => m.id === 'aisha')!
    expect(aisha.role.text).toBe('Backup')
    expect(aisha.note).toMatch(/next to call$/)
    const james = circle.find((m) => m.id === 'james')!
    expect(james.name).toMatch(/James · you$/)
    expect(james.role.text).toBe('Calls 000')
    expect(james.note).toBe('Melbourne · calls 000 if needed')
    const sarah = circle.find((m) => m.id === 'sarah')!
    expect(sarah.note).toBe('London · gets updates')
    expect(sarah.role.text).toBe('Updates')
  })

  test('forecast replaces the mock Stroke / Fall rows and their level', async () => {
    const f = overlayForecast(await mockSource.getForecast('margaret'), forecastDoc, seed)
    const before = await mockSource.getForecast('margaret')
    expect(f.risks).toHaveLength(before.risks.length)
    expect(f.risks.find((r) => r.name === 'Stroke')).toMatchObject({ level: 'Medium', tone: 'warn' })
    expect(f.risks.find((r) => r.name === 'Fall with injury')).toMatchObject({ level: 'Low', tone: 'good' })
    expect(f.comingUp.actions[0].value).toBe('Sent to David')
  })

  test('person age and gender rows', async () => {
    const p = overlayPerson(await mockSource.getPerson('margaret'), person)
    expect(p.gender).toBe('Female')
    expect(p.profile.rows.find((r) => r.label === 'Age')!.value).toBe('79')
  })

  test('lineage labels', async () => {
    const l = overlayLineage(await mockSource.getLineage('margaret'), familyDoc, 'james')
    expect(l.generations.map((g) => g.label)).toEqual(['Parents', "Margaret's generation", 'Children'])
    expect(l.generations[1].nodes[0].sub).toBe('herself')
    expect(l.generations[2].nodes[0].sub).toBe('son · you')
    expect(l.matrix.map((m) => m.person)).toEqual(['Arthur (father)', 'Margaret (self)', 'James (son)'])
    expect(l.strength[0].label).toBe('Moderate')
    expect(l.screening[0]).toMatchObject({ due: 'Due now', action: 'Book' })
  })
})

describe('in Vietnamese', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi')
  })

  test('circle roles, notes and relations', async () => {
    const circle = overlayCircle(await mockSource.getCareCircle('margaret'), seed, 'james')
    const david = circle.find((m) => m.id === 'david')!
    expect(david.role.text).toBe('Trực')
    expect(david.note).toMatch(/^Cách .* · người gọi đầu tiên$/)
    expect(david.technicalName).toBe('David · con trai')
    expect(circle.find((m) => m.id === 'aisha')!.technicalName).toBe('Aisha · hàng xóm')
    const james = circle.find((m) => m.id === 'james')!
    expect(james.name).toMatch(/James · bạn$/)
    expect(james.note).toBe('Melbourne · gọi 000 nếu cần')
    expect(circle.find((m) => m.id === 'sarah')!.note).toBe('London · nhận cập nhật')
  })

  test('forecast finds the Vietnamese rows (no duplicate English rows) and writes Vietnamese levels', async () => {
    const before = await mockSource.getForecast('margaret')
    const f = overlayForecast(await mockSource.getForecast('margaret'), forecastDoc, seed)
    expect(f.risks).toHaveLength(before.risks.length)
    expect(f.risks.find((r) => r.name === 'Đột quỵ')).toMatchObject({ level: 'Trung bình', tone: 'warn' })
    expect(f.risks.find((r) => r.name === 'Té ngã có chấn thương')).toMatchObject({ level: 'Thấp', tone: 'good' })
    expect(f.comingUp.actions[0].value).toBe('Đã gửi cho David')
  })

  test('person rows are matched by their Vietnamese labels', async () => {
    const p = overlayPerson(await mockSource.getPerson('margaret'), person)
    expect(p.gender).toBe('Nữ')
    expect(p.profile.rows.find((r) => r.label === 'Tuổi')!.value).toBe('79')
    expect(p.profile.rows.find((r) => r.label === 'Giới tính')!.value).toBe('Nữ')
  })

  test('lineage labels', async () => {
    const l = overlayLineage(await mockSource.getLineage('margaret'), familyDoc, 'james')
    expect(l.generations.map((g) => g.label)).toEqual(['Cha mẹ', 'Thế hệ của Margaret', 'Con'])
    expect(l.generations[2].nodes[0].sub).toBe('con trai · bạn')
    expect(l.matrix[0].person).toBe('Arthur (cha)')
    expect(l.screening[0]).toMatchObject({ due: 'Đến hạn', action: 'Đặt lịch' })
  })
})
