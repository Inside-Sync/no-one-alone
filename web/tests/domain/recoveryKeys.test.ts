import type { RecoveryDoc } from '@/data/contract'
import { localRecovery, medWhy, medsExplained, taskIcon, todayTasks } from '@/domain/recovery'
import en from '@/locales/en/treatment.json'

const why = (k: keyof typeof en.why) => en.why[k]

const doc = (extra: Partial<RecoveryDoc> = {}): RecoveryDoc => ({
  createdAt: '2026-10-16T22:00:00Z', staffName: 's', diagnosis: 'd', notes: 'n', meds: [], activities: [], followUps: [],
  summary: 'sum', fallback: false, reminders: [], ...extra,
})

describe('why lines: the item key first, the English words only as the fallback', () => {
  test('a reminder key picks the why line when the text is in Arabic', () => {
    const reminders: RecoveryDoc['reminders'] = [
      { time: '08:00', kind: 'MED', text: 'حان وقت دوائك', key: 'apixaban' },
      { time: '09:00', kind: 'MED', text: 'حان وقت الفيتامين', key: 'vitamin_d' },
      { time: '10:00', kind: 'ACTIVITY', text: 'حان وقت المشي', key: 'walk' },
      { time: '11:00', kind: 'ACTIVITY', text: 'حان وقت الماء', key: 'water' },
      { time: '14:00', kind: 'ACTIVITY', text: 'حان وقت التمرين', key: 'speech' },
      { time: '18:15', kind: 'ACTIVITY', text: 'قياس الضغط', key: 'blood_pressure' },
    ]
    expect(todayTasks(doc({ reminders })).map((t) => t.why)).toEqual([
      why('apixaban'), why('vitaminD'), why('walk'), why('water'), why('speech'), why('bloodPressure'),
    ])
  })

  test('the key beats words in the text that point elsewhere', () => {
    expect(todayTasks(doc({ reminders: [{ time: '10:00', kind: 'ACTIVITY', text: 'Time to walk', key: 'water' }] }))[0].why).toBe(why('water'))
  })

  test('an unknown key falls back to the words', () => {
    expect(todayTasks(doc({ reminders: [{ time: '10:00', kind: 'ACTIVITY', text: 'Time to walk', key: 'new_thing' }] }))[0].why).toBe(why('walk'))
  })

  test("a MED reminder finds its medicine by key, and shows the doctor's own note", () => {
    const r = doc({
      meds: [{ name: 'دواء', dose: '5', times: ['08:00'], change: 'New', note: 'Written by the doctor.', key: 'apixaban' }],
      reminders: [{ time: '08:00', kind: 'MED', text: 'حان وقت الدواء', key: 'apixaban' }],
    })
    expect(todayTasks(r)[0].why).toBe('Written by the doctor.')
  })

  test("a medicine with a key and no note gets the key's line, whatever its name", () => {
    expect(medWhy({ name: 'دواء', dose: '5', times: [], key: 'atorvastatin' })).toBe(why('atorvastatin'))
    expect(medsExplained(doc({ meds: [{ name: 'دواء', dose: '5', times: ['08:00'], key: 'amlodipine' }] }))[0].why).toBe(why('amlodipine'))
  })

  test('without keys, the words in the name still decide', () => {
    expect(medWhy({ name: 'Atorvastatin', dose: '40 mg', times: [] })).toBe(why('atorvastatin'))
    expect(medWhy({ name: 'دواء', dose: '5', times: [] })).toBeUndefined()
  })

  test('a reminder for a stopped medicine is dropped by key, not only by name', () => {
    const r = doc({
      meds: [{ name: 'أسبرين', dose: '100', times: [], change: 'Stop', key: 'aspirin' }],
      reminders: [
        { time: '08:00', kind: 'MED', text: 'حان وقت دوائك', key: 'aspirin' },
        { time: '09:00', kind: 'MED', text: 'حان وقت دواء آخر', key: 'apixaban' },
      ],
    })
    expect(todayTasks(r).map((t) => t.key)).toEqual(['apixaban'])
  })

  test('the icon follows the key, and the words when there is none', () => {
    expect(taskIcon({ kind: 'ACTIVITY', title: 'حان وقت المشي', key: 'walk' })).toBe('footprints')
    expect(taskIcon({ kind: 'ACTIVITY', title: 'حان وقت الماء', key: 'water' })).toBe('drop')
    expect(taskIcon({ kind: 'ACTIVITY', title: 'Time for water' })).toBe('drop')
  })

  test('the local plan carries each item key to its reminders', () => {
    const r = localRecovery({
      staffName: 's', diagnosis: 'd', notes: 'n', followUps: [],
      meds: [{ name: 'Apixaban', dose: '5 mg', times: ['08:00'], key: 'apixaban' }],
      activities: [{ text: 'Walk', times: ['10:00'], key: 'walk' }, { text: 'Free text', times: ['11:00'] }],
    }, Date.parse('2026-10-16T00:00:00Z'), 'UTC')
    expect(r.reminders.map((x) => x.key)).toEqual(['apixaban', 'walk', undefined])
  })
})
