import { beforeEach, describe, expect, test } from 'vitest'
import {
  appendAudit,
  getAudit,
  getCareCircle,
  getCareRecord,
  getCityScene,
  getOrbitScene,
  getGovernment,
  getDeviceFeed,
  getHealth,
  getHospital,
  getLineage,
  getPerson,
  getShare,
  getSurroundings,
  getSignals,
  saveShare,
} from '@/data/repo'
import { resetMockSource } from '@/data/sources/mock'

beforeEach(() => resetMockSource())

test('margaret fixture matches prototype', async () => {
  const p = await getPerson('margaret')
  expect(p).toMatchObject({ name: 'Moza Al Hammadi', age: 78, postcode: '', allergies: ['Penicillin'] })
  expect(p.devices).toEqual({ wearableBattery: 64, hubSensors: 6 })
})

describe('person', () => {
  test('profile and conditions', async () => {
    const p = await getPerson('margaret')
    expect(p).toMatchObject({
      id: 'margaret', suburb: 'Al Bateen', heightCm: 162, weightKg: 61.2, bmi: 23.4,
      bloodType: 'O positive', medicineCount: 4, status: 'good',
    })
    expect(p.conditions).toHaveLength(8)
    expect(p.conditions[0]).toMatchObject({ title: 'High blood pressure', color: '#d9443f' })
    expect(p.profile.rows).toHaveLength(12)
    expect(p.kpis).toHaveLength(12)
    expect(p.kpisTechnical).toHaveLength(12)
    expect(p.dayline).toHaveLength(8)
    expect(p.context.facts.map((f) => f.label)).toEqual(['Female', 'Born', 'Conditions', 'Allergy', 'Mode', 'Care team'])
  })
})

describe('helper log (What the helper did today)', () => {
  test('8 plain rows, one needing approval', async () => {
    const p = await getPerson('margaret')
    expect(p.helperLog).toHaveLength(8)
    expect(p.helperLog[6]).toEqual({
      time: 'Yesterday 21:40',
      what: 'Suggested Hamad sets up a weekly pill box',
      how: 'Needs your OK',
      why: 'Missed tablets + rising BP',
      result: 'Waiting for you',
      tone: 'warn',
      needsApproval: true,
    })
    expect(p.helperLog.filter((r) => r.needsApproval)).toHaveLength(1)
    expect(p.helperLogTechnical).toHaveLength(8)
    expect(p.helperLogTechnical[0].what).toBe('Re-scored all risks (64 signals)')
  })
})

describe('health', () => {
  test('series have the prototype lengths', async () => {
    const h = await getHealth('margaret')
    expect(h.hr24.points).toHaveLength(289)
    expect(h.hr24.points.every((v) => v > 40 && v < 130)).toBe(true)
    expect(h.steps14).toHaveLength(14)
    expect(h.mood14.values).toHaveLength(14)
    expect(h.bp14.morning.at(-1)).toBe(146)
    expect(h.groups).toHaveLength(9)
    expect(h.groups[0].metrics).toHaveLength(6)
    expect(h.hypnogram.segments).toHaveLength(20)
    expect(h.goals.map((g) => g.label)).toEqual(['Move', 'Exercise', 'Stand'])
  })
})

describe('lineage', () => {
  test('generations, matrix and consent', async () => {
    const l = await getLineage('margaret')
    expect(l.generations.map((g) => g.label)).toEqual([
      'Grandparents', "Moza's generation", 'Children', 'Grandchildren',
    ])
    expect(l.generations.flatMap((g) => g.nodes)).toHaveLength(9)
    expect(Object.keys(l.conditionKeys)).toHaveLength(7)
    expect(l.matrix).toHaveLength(7)
    expect(l.consent.rows).toHaveLength(5)
    expect(l.screening).toHaveLength(6)
    expect(l.strength).toHaveLength(7)
  })
})

describe('care record', () => {
  test('record lists', async () => {
    const r = await getCareRecord('margaret')
    expect(r.kpis).toHaveLength(6)
    expect(r.medicines).toHaveLength(5)
    expect(r.labs).toHaveLength(4)
    expect(r.entries).toHaveLength(23)
    expect(r.history.episodes).toHaveLength(6)
    expect(r.encounters.types.map((t) => t.count)).toEqual([18, 6, 14, 2, 6])
    expect(r.encounters.types.every((t) => t.months.length === t.count)).toBe(true)
    expect(r.followUp.days).toHaveLength(5)
  })
})

describe('circle and device feed', () => {
  test('care circle', async () => {
    const c = await getCareCircle('margaret')
    expect(c.map((m) => m.id)).toEqual(['david', 'james', 'sarah', 'priya', 'aisha'])
  })
  test('device feed', async () => {
    const d = await getDeviceFeed('margaret')
    expect(d.sources).toHaveLength(7)
    expect(d.phone.minis).toHaveLength(6)
  })
})

describe('surroundings', () => {
  test('weather, news, alerts', async () => {
    const s = await getSurroundings('margaret')
    expect(s.news).toHaveLength(8)
    expect(s.alerts).toHaveLength(7)
    expect(s.week).toHaveLength(7)
    expect(s.kpis).toHaveLength(12)
    expect(s.thursday.outdoor).toHaveLength(17)
    expect(s.air).toHaveLength(7)
    expect(s.pins).toHaveLength(8)
  })
})

describe('hospital, government, signals', () => {
  test('hospital', async () => {
    const h = await getHospital()
    expect(h.packet[0]).toEqual(['Patient', 'Female, 78 · DOB 03/03/1948 · 162 cm, 61 kg · O+'])
    expect(h.packet[4][0]).toBe('History')
    expect(h.packet).toHaveLength(10)
  })
  test('government', async () => {
    const c = await getGovernment()
    expect(c.areas).toHaveLength(17)
    expect(c.wellbeing).toHaveLength(8)
    expect(c.kpis[0]).toMatchObject({ label: 'Actionable results', value: '2,738' })
    expect(c.kpis[4]).toMatchObject({ label: 'Open past target', value: '636' })
    expect(c.facilities.rows).toHaveLength(8)
    expect(c.stalled).toHaveLength(7)
    expect(c.funnel).toHaveLength(8)
    expect(c.referrals).toHaveLength(9)
    expect(c.byLanguage.rows).toHaveLength(7)
    expect(c.programmes).toHaveLength(6)
  })
  test('signals', async () => {
    const w = await getSignals()
    expect(w.signals).toHaveLength(7)
    expect(w.weekly).toHaveLength(8)
    expect(w.decisions).toHaveLength(5)
    expect(w.feed).toHaveLength(5)
  })
})

describe('consent store and audit', () => {
  test('default share matrix is the prototype SHARE', async () => {
    const s = await getShare()
    expect(Object.keys(s)).toEqual(['james', 'sarah', 'david', 'priya', 'gp', 'hosp'])
    expect(s.james.mood).toBe(false)
    expect(s.david.home).toBe(true)
    expect(s.hosp.records).toBe(true)
    expect(s.hosp.safety).toBe(true)
  })
  test('saveShare persists in memory, returns copies, and resets', async () => {
    await saveShare('sarah', 'mood', true)
    expect((await getShare()).sarah.mood).toBe(true)
    const snapshot = await getShare()
    snapshot.sarah.mood = false
    expect((await getShare()).sarah.mood).toBe(true)
    resetMockSource()
    expect((await getShare()).sarah.mood).toBe(false)
  })
  test('audit appends in order and returns copies', async () => {
    expect(await getAudit()).toEqual([])
    await appendAudit({ at: '15:10', who: 'Margaret', action: 'share-on', detail: 'Mood shared with Sarah', viewer: 'sarah', category: 'mood', on: true })
    await appendAudit({ at: '15:11', who: 'Margaret', action: 'pause', detail: 'Paused until 9 am tomorrow' })
    const log = await getAudit()
    expect(log.map((e) => e.action)).toEqual(['share-on', 'pause'])
    log.pop()
    expect(await getAudit()).toHaveLength(2)
    resetMockSource()
    expect(await getAudit()).toEqual([])
  })
})

describe('seeded series match the prototype generators', () => {
  // Reference values produced by running the prototype's own rng/loops in node.
  test('hr24, scatter and encounters', async () => {
    const h = await getHealth('margaret')
    expect(h.hr24.points[0]).toBeCloseTo(66.00063393171936, 9)
    expect(h.hr24.points[229]).toBeCloseTo(108.27672494601154, 9)
    expect(h.hr24.points[288]).toBeCloseTo(62.05626296722913, 9)
    expect(h.hr24.band.hi[0]).toBeCloseTo(70.45941887466184, 9)
    expect(h.hr24.band.hi[288]).toBeCloseTo(67.59946646457487, 9)
    const rec = await getCareRecord('margaret')
    const gp = rec.encounters.types[0].months
    expect(gp[0]).toBeCloseTo(0.500035217963192, 9)
    expect(gp[17]).toBeCloseTo(43.034641837267806, 9)
    expect(rec.encounters.types[3].months).toEqual([14, 33])
    expect(rec.encounters.types[4].months).toEqual([28, 31, 34, 37, 40, 43])
  })
})

describe('verbatim spot checks', () => {
  test('government totals derive from the areas', async () => {
    const c = await getGovernment()
    expect(c.areas.reduce((n, a) => n + a.screened, 0)).toBe(18170)
    expect(c.areas.reduce((n, a) => n + a.actionable, 0)).toBe(2738)
    expect(c.areas.reduce((n, a) => n + Math.round(a.actionable * (1 - a.reached / 100)), 0)).toBe(636)
    expect(c.kpis.map((k) => k.value)).toEqual(['2,738', '96', '77', '20', '636', '59'])
    expect(c.referrals[0]).toEqual({ name: 'Diabetes education', need: 64, slots: 60 })
  })
  test('individual KPI tiles are the plain-language set', async () => {
    const p = await getPerson('margaret')
    expect(p.kpis[1]).toMatchObject({ icon: 'stethoscope', label: 'Blood pressure', value: '146', unit: '/88', tone: 'warn' })
    expect(p.kpisTechnical[1]).toMatchObject({ label: 'Blood pressure (7 d)', delta: '+2.8σ' })
    expect(p.kpis.every((k) => k.spark.length === 9)).toBe(true)
  })
  test('pre-arrival pathway demo steps', async () => {
    const h = await getHospital()
    expect(h.pathway).toHaveLength(8)
    expect(h.inbox.map((m) => m.name)).toEqual(['Salem K., 82', 'Hessa M., 88'])
  })
})

test('city scene: blocks, colours and the three camera presets', async () => {
  const g = await getCityScene()
  expect(g.blocks).toHaveLength(11)
  expect(g.blocks[0]).toEqual([0, 102, 46, 142, 'shops'])
  expect(g.views.home).toMatchObject({ size: [400, 400], yaw: -0.62, cy: 0.6, vpad: 110, zmax: 30, fill: 1.1 })
  expect(g.views.district).toMatchObject({ size: [820, 820], yaw: 0, compassY: 70 })
  expect(g.views.watch.yaw).toBe(0.35)
})

test('orbit scene: CIRCLE, RINGS and Moza in the centre', async () => {
  const o = await getOrbitScene()
  expect(o.nodes.map((n) => n.id)).toEqual(['david', 'nurse', 'james', 'sarah', 'hosp'])
  expect(o.rings.map((r) => r.radius)).toEqual([78, 126, 172])
  expect(o.centre).toEqual({ initials: 'M', label: 'Moza, 78', name: 'Moza', calmSub: 'Safe at home', alertSub: 'Needs help now' })
})
