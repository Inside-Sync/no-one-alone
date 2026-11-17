import i18n from '@/i18n'
import type { FamilyDoc, PersonDoc } from '@/data/contract'
import { mockSource } from '@/data/sources/mock'
import { overlayCircle, overlayLineage, overlayPerson, type Seed } from '@/data/sources/overlay'

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

  test('person age and gender rows', async () => {
    const p = overlayPerson(await mockSource.getPerson('margaret'), person)
    expect(p.gender).toBe('Female')
    expect(p.profile.rows.find((r) => r.label === 'Age')!.value).toBe('79')
  })

  test('resting HR baseline comes from the person doc', async () => {
    const p = overlayPerson(await mockSource.getPerson('margaret'), { ...person, baseline: { restingHr: 60, nightHr: 55 } })
    expect(p.kpisTechnical.find((k) => k.label === 'Resting heart rate')!.baseline).toBe('base 60')
  })

  test('no baseline keeps the mock', async () => {
    const mock = await mockSource.getPerson('margaret')
    expect(overlayPerson(mock, { ...person, baseline: undefined }).kpisTechnical).toEqual(mock.kpisTechnical)
  })

  test('lineage labels', async () => {
    const l = overlayLineage(await mockSource.getLineage('margaret'), familyDoc, 'james')
    expect(l.generations.map((g) => g.label)).toEqual(['Grandparents', "Margaret's generation", 'Children'])
    expect(l.generations[1].nodes[0].sub).toBe('herself')
    expect(l.generations[2].nodes[0].sub).toBe('son · you')
    expect(l.matrix.map((m) => m.person)).toEqual(['Arthur (grandfather)', 'Margaret (mother)', 'James (you)'])
    // The designed strength and screening rows stay (the document cannot carry their weighting or intervals)
    expect(l.strength[0]).toMatchObject({ condition: 'Hypertension', label: 'Strong' })
    expect(l.screening[0]).toMatchObject({ check: 'Blood pressure check', interval: '12 months' })
  })
})

describe('in Arabic', () => {
  // Expected words come from the Arabic overlay file, so the tests follow its translation.
  const t = i18n.getFixedT('ar', 'overlay') as (k: string, o?: object) => string

  beforeEach(async () => {
    await i18n.changeLanguage('ar')
  })

  test('circle roles, notes and relations', async () => {
    const circle = overlayCircle(await mockSource.getCareCircle('margaret'), seed, 'james')
    const david = circle.find((m) => m.id === 'david')!
    expect(david.role.text).toBe(t('circle.onCall'))
    expect(david.note.endsWith(` · ${t('circle.firstToCall')}`)).toBe(true)
    expect(david.technicalName).toBe(`David · ${t('relation.son')}`)
    expect(circle.find((m) => m.id === 'aisha')!.technicalName).toBe(`Aisha · ${t('relation.neighbour')}`)
    const james = circle.find((m) => m.id === 'james')!
    expect(james.name.endsWith(t('youSuffix'))).toBe(true)
    expect(james.note).toBe(t('circle.noteCalls', { place: 'Melbourne', num: '000' }))
    expect(circle.find((m) => m.id === 'sarah')!.note).toBe(t('circle.noteUpdates', { place: 'London' }))
  })

  test('person rows are matched by their Arabic labels', async () => {
    const p = overlayPerson(await mockSource.getPerson('margaret'), person)
    expect(p.gender).toBe(t('person.female'))
    expect(p.profile.rows.find((r) => r.key === 'age')!.value).toBe('79')
    expect(p.profile.rows.find((r) => r.key === 'gender')!.value).toBe(t('person.female'))
  })

  test('resting HR baseline comes from the person doc', async () => {
    const p = overlayPerson(await mockSource.getPerson('margaret'), { ...person, baseline: { restingHr: 60, nightHr: 55 } })
    expect(p.kpisTechnical.find((k) => k.key === 'restingHr')!.baseline).toBe(t('person.restingHrBase', { n: 60 }))
  })

  test('no baseline keeps the mock', async () => {
    const mock = await mockSource.getPerson('margaret')
    expect(overlayPerson(mock, { ...person, baseline: undefined }).kpisTechnical).toEqual(mock.kpisTechnical)
  })

  test('lineage labels', async () => {
    const l = overlayLineage(await mockSource.getLineage('margaret'), familyDoc, 'james')
    expect(l.generations.map((g) => g.label)).toEqual([t('lineage.generation.grandparents'), t('lineage.generation.self', { name: 'Margaret' }), t('lineage.generation.children')])
    expect(l.generations[2].nodes[0].sub).toBe(`${t('relation.son')}${t('youSuffix')}`)
    expect(l.matrix[0].person).toBe(`Arthur (${t('lineage.toViewer.grandfather')})`)
  })
})
