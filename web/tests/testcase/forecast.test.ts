import { FRAM, FRAM_AGE, IFHAS_FORECAST, WC_AGES } from '@/features/testcase/data'
import { fcCat, fcFor, fcProject, fcValidity, framRisk, heartAge, ifhasForecast, ifhasOk, pct, wcDone, wcNext, type FamilyProfile, type RiskInputs } from '@/features/testcase/engine'
import oracle from './fixtures/prototype-oracle.json'
import { t, text } from './helpers'
import { make } from './helpers'

/**
 * Noa Forecast. `fixtures/prototype-oracle.json` (risk, fc, wc, ifhasOk, ifhasFc) was produced by calling the prototype's own
 * functions (framRisk, heartAge, fcCat, pct, fcProject, fcFor, wcNext, wcDone, ifhasOk) from new4.html.
 */
type Cat = { id: string; tone: string; cls: string }
const protoCat = (c: [string, string, string, string]): Cat => ({ id: c[0], tone: c[2], cls: c[3] })
const protoHa = (h: string | number) => (h === '30 or less' ? 'atMost30' : h === 'over 100' ? 'over100' : h)
type RiskCase = { p: RiskInputs; r: number; ha: string | number; cat: [string, string, string, string]; pct: string; r5: number; p5: number; traj: [number, number][] }
const RISK = oracle.risk as unknown as RiskCase[]

describe('framRisk, heartAge, fcCat, pct, fcProject match the prototype', () => {
  test('the grid covers both variants, both sexes, treated and untreated blood pressure', () => {
    expect(RISK.length).toBeGreaterThan(150)
    expect(RISK.filter((c) => c.p.tc == null)).not.toHaveLength(0)
    expect(RISK.filter((c) => c.p.tc != null)).not.toHaveLength(0)
    expect(new Set(RISK.map((c) => c.p.sex))).toEqual(new Set(['M', 'F']))
    expect(new Set(RISK.map((c) => c.p.bpTx))).toEqual(new Set([true, false]))
  })
  test.each(RISK.map((c, i) => [`#${i} ${c.p.sex} ${c.p.age} ${c.p.tc == null ? 'BMI' : 'lab'}`, c] as const))('%s', (_n, c) => {
    const r = framRisk(c.p)
    expect(r).toBeCloseTo(c.r, 12)
    expect(heartAge(c.p, r)).toEqual(protoHa(c.ha))
    expect(fcCat(r)).toMatchObject(protoCat(c.cat))
    expect(pct(r)).toBe(c.pct)
    expect(fcProject(c.p, 5, false)).toBeCloseTo(c.r5, 12)
    expect(fcProject(c.p, 5, true)).toBeCloseTo(c.p5, 12)
    c.traj.forEach((tr, y) => {
      expect(fcProject(c.p, y, false)).toBeCloseTo(tr[0], 12)
      expect(fcProject(c.p, y, true)).toBeCloseTo(tr[1], 12)
    })
  })
})

describe('the model itself', () => {
  const khalid: RiskInputs = { age: 47, sex: 'M', sbp: 132, bpTx: false, smoker: true, dm: false, tc: null, hdl: null, bmi: 29 }
  test('the Framingham 2008 coefficients are in the data (lab and BMI, men and women)', () => {
    expect(FRAM.lab.M).toMatchObject({ age: 3.06117, tc: 1.1237, hdl: -0.93263, sbp: 1.93303, sbpT: 1.99881, smk: 0.65451, dm: 0.57367, s0: 0.88936, mean: 23.9802 })
    expect(FRAM.lab.F).toMatchObject({ age: 2.32888, s0: 0.95012, mean: 26.1931 })
    expect(FRAM.bmi.M).toMatchObject({ age: 3.11296, bmi: 0.79277, s0: 0.88431, mean: 23.9388 })
    expect(FRAM.bmi.F).toMatchObject({ age: 2.72107, bmi: 0.51125, s0: 0.94833, mean: 26.0145 })
  })
  test('Khalid (47, smoker, no cholesterol yet) is 18% by the BMI variant, heart age 65', () => {
    const r = framRisk(khalid)
    expect(pct(r)).toBe('18%')
    expect(heartAge(khalid, r)).toBe(65)
    expect(fcCat(r).id).toBe('mid')
  })
  test('the lab variant is used only when BOTH total and HDL cholesterol are known', () => {
    const lab = framRisk({ ...khalid, tc: 5.2, hdl: 1.2 })
    expect(lab).not.toBe(framRisk(khalid))
    expect(framRisk({ ...khalid, tc: 5.2, hdl: null })).toBe(framRisk(khalid))
    expect(framRisk({ ...khalid, tc: null, hdl: 1.2 })).toBe(framRisk(khalid))
  })
  test('each risk factor raises the risk in the right direction', () => {
    const r0 = framRisk({ ...khalid, tc: 5.2, hdl: 1.2, smoker: false })
    expect(framRisk({ ...khalid, tc: 5.2, hdl: 1.2, smoker: true })).toBeGreaterThan(r0)
    expect(framRisk({ ...khalid, tc: 5.2, hdl: 1.2, smoker: false, dm: true })).toBeGreaterThan(r0)
    expect(framRisk({ ...khalid, tc: 5.2, hdl: 1.2, smoker: false, sbp: 160 })).toBeGreaterThan(r0)
    expect(framRisk({ ...khalid, tc: 7, hdl: 1.2, smoker: false })).toBeGreaterThan(r0)
    expect(framRisk({ ...khalid, tc: 5.2, hdl: 0.8, smoker: false })).toBeGreaterThan(r0)
    expect(framRisk({ ...khalid, tc: 5.2, hdl: 1.2, smoker: false, age: 60 })).toBeGreaterThan(r0)
    // treated blood pressure carries a higher coefficient than untreated at the same reading
    expect(framRisk({ ...khalid, tc: 5.2, hdl: 1.2, smoker: false, bpTx: true })).toBeGreaterThan(r0)
    // women score lower than men at the same values
    expect(framRisk({ ...khalid, tc: 5.2, hdl: 1.2, smoker: false, sex: 'F' })).toBeLessThan(r0)
  })
  test('the risk never goes above 99%, and a tiny risk reads "<1%"', () => {
    expect(framRisk({ age: 74, sex: 'M', sbp: 200, bpTx: true, smoker: true, dm: true, tc: 10, hdl: 0.5, bmi: 45 })).toBe(0.99)
    expect(pct(0.004)).toBe('<1%')
    expect(pct(0.01)).toBe('1%')
    expect(pct(0.99)).toBe('99%')
  })
  test('the category cut-offs: 20% or more high, 10% or more moderate, else low', () => {
    expect(fcCat(0.2).id).toBe('high')
    expect(fcCat(0.1999).id).toBe('mid')
    expect(fcCat(0.1).id).toBe('mid')
    expect(fcCat(0.0999).id).toBe('low')
    expect(fcCat(0.5)).toMatchObject({ tone: 'red', cls: 'bad' })
    expect(fcCat(0.15)).toMatchObject({ tone: 'amber', cls: 'warn' })
    expect(fcCat(0.01)).toMatchObject({ tone: 'green', cls: 'good' })
    expect(text(make('family'), fcCat(0.3).label)).toBe('High')
    expect(text(make('family'), fcCat(0.3).lower)).toBe('high')
  })
  test('heart age: "30 or less" and "over 100" at the ends, otherwise the age of the reference person with the same risk', () => {
    const low: RiskInputs = { age: 30, sex: 'F', sbp: 95, bpTx: false, smoker: false, dm: false, tc: 3.5, hdl: 2.4, bmi: 18 }
    expect(heartAge(low, framRisk(low))).toBe('atMost30')
    const high: RiskInputs = { age: 74, sex: 'M', sbp: 190, bpTx: true, smoker: true, dm: true, tc: 10, hdl: 0.6, bmi: 40 }
    expect(heartAge(high, framRisk(high))).toBe('over100')
    // a reference person (sbp 125, no risk factors, TC 180 mg/dL, HDL 45, BMI 22.5) has heart age equal to the real age
    const ref: RiskInputs = { age: 50, sex: 'M', sbp: 125, bpTx: false, smoker: false, dm: false, tc: 180 / 38.67, hdl: 45 / 38.67, bmi: 22.5 }
    expect(heartAge(ref, framRisk(ref))).toBe(50)
  })
  test('the what-if: trends continue (sbp and BMI move, age +yrs); with the plan blood pressure and BMI fall, smoking stops, cholesterol drops', () => {
    const p: RiskInputs = { ...khalid, sbpTrend: 3, bmiTrend: 0.5 }
    // year 0 is today's score, except for the floors on blood pressure (95) and BMI (18) that the what-if applies
    expect(fcProject(p, 0, false)).toBeCloseTo(framRisk(p), 12)
    expect(fcProject(p, 5, false)).toBeGreaterThan(framRisk(p))
    expect(fcProject(p, 5, true)).toBeLessThan(fcProject(p, 5, false))
    // the plan is a sudden step in year one, then flat (blood pressure -10, BMI toward 25, smoking off)
    expect(fcProject(p, 1, true)).toBeLessThan(framRisk(p))
    const lab: RiskInputs = { ...p, tc: 6.4, hdl: 0.9 }
    expect(fcProject({ ...lab, tc: 4.5 }, 3, true)).toBeLessThan(fcProject({ ...lab, tc: 4.5 }, 3, false)) // tc under 5 is not lowered but smoking still stops
    expect(fcProject({ ...lab, smoker: false, sbp: 118, bmi: 24, tc: 4.5, sbpTrend: 0, bmiTrend: 0 }, 5, true)).toBeLessThan(fcProject({ ...lab, smoker: false, sbp: 118, bmi: 24, tc: 4.5, sbpTrend: 0, bmiTrend: 0 }, 5, false) + 1e-9)
  })
})

describe('validity: 30 to 74, no heart attack or stroke, not a child', () => {
  const adult = (o: Partial<Extract<FamilyProfile, { child?: false }>> = {}): FamilyProfile => ({ age: 47, sex: 'M', sbp: 132, bpTx: false, smoker: true, dm: false, tc: null, hdl: null, bmi: 29, cvd: false, sbpTrend: 3, bmiTrend: 0.5, emirati: true, ...o })
  test('the limits are 30 and 74, inclusive', () => {
    expect(FRAM_AGE).toEqual({ min: 30, max: 74 })
    expect(fcValidity(adult({ age: 29 }))).toBe('under30')
    expect(fcValidity(adult({ age: 30 }))).toBeNull()
    expect(fcValidity(adult({ age: 74 }))).toBeNull()
    expect(fcValidity(adult({ age: 75 }))).toBe('over74')
  })
  test('a heart attack or stroke, and children, are never scored; the reason says why', () => {
    expect(fcValidity(adult({ cvd: true }))).toBe('cvd')
    expect(fcValidity(adult({ cvd: true, age: 80 }))).toBe('cvd') // history wins over age
    expect(fcValidity({ child: true, ageM: 18, overdueW: 3 })).toBe('child')
    expect(fcValidity(null)).toBe('child')
    const no = fcFor(adult({ cvd: true }))
    expect(no.ok).toBe(false)
    if (!no.ok) {
      expect(no.reason).toBe('cvd')
      expect(t(no.why.k)).toBe('Has had a heart attack or stroke, so a risk score does not apply: their clinic manages heart risk directly.')
      expect(t(no.short.k)).toBe('Has had a heart attack or stroke')
    }
    const e = make('family')
    for (const [age, why] of [[29, 'The Framingham score is valid from 30. Until then Noa shows habits that set lifetime risk.'], [75, 'The Framingham score is valid up to 74. Their doctor decides.']] as const) {
      const f = fcFor(adult({ age }))
      expect(f.ok).toBe(false)
      if (!f.ok) expect(text(e, f.why)).toBe(why)
    }
    const c = fcFor({ child: true, ageM: 60, overdueW: 0 })
    if (!c.ok) expect(t(c.why.k)).toBe('Children are followed by well-child visits, not a heart score.')
  })
})

describe('fcFor: the whole forecast', () => {
  type FcCase = { name: string; p: FamilyProfile; f: { ok: boolean; r?: number; cat?: [string, string, string, string]; lab?: boolean; ha?: string | number; r5?: number; p5?: number; cat5?: [string, string, string, string]; traj?: [number, number][]; why?: string } }
  const CASES = oracle.fc as unknown as FcCase[]
  test.each(CASES.map((c) => [c.name, c] as const))('%s matches the prototype', (_n, c) => {
    const f = fcFor(c.p)
    expect(f.ok).toBe(c.f.ok)
    if (!c.f.ok || !f.ok) {
      expect(f.ok).toBe(false)
      if (!f.ok) expect(t(f.why.k)).toBe(c.f.why)
      return
    }
    expect(f.r).toBeCloseTo(c.f.r!, 12)
    expect(f.cat).toMatchObject(protoCat(c.f.cat!))
    expect(f.cat5).toMatchObject(protoCat(c.f.cat5!))
    expect(f.lab).toBe(c.f.lab)
    expect(f.ha).toEqual(protoHa(c.f.ha!))
    expect(f.r5).toBeCloseTo(c.f.r5!, 12)
    expect(f.p5).toBeCloseTo(c.f.p5!, 12)
    f.traj.forEach((tr, i) => { expect(tr[0]).toBeCloseTo(c.f.traj![i][0], 12); expect(tr[1]).toBeCloseTo(c.f.traj![i][1], 12) })
  })

  test('the chart data: six years, the "if trends continue" and "with the plan" series, bands and ticks', () => {
    const f = fcFor(oracle.famProfiles.khalid as FamilyProfile)
    expect(f.ok).toBe(true)
    if (!f.ok) return
    expect(f.chart.years).toEqual([0, 1, 2, 3, 4, 5])
    expect(f.chart.trend).toHaveLength(6)
    expect(f.chart.plan).toHaveLength(6)
    expect(f.chart.trend).toEqual(f.traj.map((x) => x[0]))
    expect(f.chart.plan).toEqual(f.traj.map((x) => x[1]))
    expect(f.chart.now).toBe(f.r)
    expect(f.chart.trend[5]).toBe(f.r5)
    expect(f.chart.plan[5]).toBe(f.p5)
    // the axis is at least 30% and rounds up to the next 10% above the highest trend value
    expect(f.chart.max).toBe(0.3)
    expect(f.chart.ticks).toEqual([0, 0.1, 0.2, 0.3])
    expect(f.chart.bands.map((b) => [b.id, b.from, b.to])).toEqual([['low', 0, 0.1], ['mid', 0.1, 0.2], ['high', 0.2, 0.3]])
    const sa = fcFor({ ...(oracle.famProfiles.khalid as FamilyProfile), sbp: 200, age: 74, tc: 10, hdl: 0.5 } as FamilyProfile)
    expect(sa.ok && sa.chart.max).toBeGreaterThan(0.9)
    expect(sa.ok && sa.chart.ticks).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6])
    // the plan line ends below the trend line
    expect(f.chart.plan[5]).toBeLessThan(f.chart.trend[5])
  })

  test('evidence: the BMI variant says what is missing, the lab variant uses both cholesterols', () => {
    const k = fcFor(oracle.famProfiles.khalid as FamilyProfile)
    expect(k.ok && k.evidence.variant).toBe('bmi')
    if (k.ok) {
      expect(k.evidence.used.map((u) => u.id)).toEqual(['age', 'sex', 'sbp', 'bpTx', 'smoker', 'dm', 'bmi'])
      expect(k.evidence.missing.map((m) => m.id)).toEqual(['tc', 'hdl'])
      expect(t(k.evidence.note.k)).toBe('BMI used because cholesterol is not measured yet')
      expect(k.evidence.trends).toEqual({ sbp: 3, bmi: 0.5 })
      expect(k.lab).toBe(false)
    }
    const a = fcFor(oracle.famProfiles.amna as FamilyProfile)
    expect(a.ok && a.evidence.variant).toBe('lab')
    if (a.ok) {
      expect(a.evidence.used.map((u) => u.id)).toEqual(['age', 'sex', 'sbp', 'bpTx', 'smoker', 'dm', 'tc', 'hdl'])
      expect(a.evidence.used.find((u) => u.id === 'tc')?.value).toBe(5.3)
      expect(a.evidence.missing).toEqual([])
      expect(t(a.evidence.note.k)).toBe('Total and HDL cholesterol used')
    }
  })
})

describe('well-child visits and IFHAS eligibility', () => {
  test.each((oracle.wc as { ageM: number; overdueW: number; next: number | null; done: number }[]).map((o) => [`${o.ageM} months, ${o.overdueW} weeks overdue`, o] as const))('wcNext / wcDone for %s', (_n, o) => {
    expect(wcNext({ ageM: o.ageM }, WC_AGES)).toBe(o.next)
    expect(wcDone({ ageM: o.ageM, overdueW: o.overdueW }, WC_AGES)).toBe(o.done)
  })
  test('past the 14th visit nothing is next', () => {
    expect(wcNext({ ageM: 73 }, WC_AGES)).toBeNull()
    expect(wcDone({ ageM: 73, overdueW: 0 }, WC_AGES)).toBe(14)
  })
  test.each((oracle.ifhasOk as { age: number; emirati: boolean; ok: boolean }[]).map((o) => [`${o.age} ${o.emirati ? 'Emirati' : 'expatriate'}`, o] as const))('ifhasOk %s', (_n, o) => {
    expect(ifhasOk({ age: o.age, emirati: o.emirati } as FamilyProfile)).toBe(o.ok)
  })
  test('a child is never eligible', () => {
    expect(ifhasOk({ child: true, ageM: 60, overdueW: 0 })).toBe(false)
  })
})

describe('the forecast beside the IFHAS result (Adult screening never done)', () => {
  type IfCase = { age: number; v: number; f: { ok: boolean; r?: number; ha?: string | number; r5?: number; p5?: number; cat?: [string, string, string, string]; why?: string } }
  test.each((oracle.ifhasFc as unknown as IfCase[]).map((o) => [`age ${o.age}, HbA1c ${o.v}`, o] as const))('%s matches the prototype', (_n, o) => {
    const { f, dm } = ifhasForecast(o.age, o.v, IFHAS_FORECAST)
    expect(dm).toBe(o.v >= 6.5)
    expect(f.ok).toBe(o.f.ok)
    if (f.ok) {
      expect(f.r).toBeCloseTo(o.f.r!, 12)
      expect(f.ha).toEqual(protoHa(o.f.ha!))
      expect(f.r5).toBeCloseTo(o.f.r5!, 12)
      expect(f.p5).toBeCloseTo(o.f.p5!, 12)
    }
  })
  test('the engine offers it for the ifhas case only, with the hint that turns diabetes on or off', () => {
    const e = make('ifhas')
    const a = e.prevForecast()!
    expect(a.dm).toBe(true) // the default HbA1c is 7.4: diabetes range
    e.S.resVal = 5.0
    const b = e.prevForecast()!
    expect(b.dm).toBe(false)
    expect(b.hint.k).toBe('prevention.forecast.addDm')
    e.S.resVal = 7.4
    expect(e.prevForecast()!.hint.k).toBe('prevention.forecast.dropDm')
    expect(make('wellchild').prevForecast()).toBeNull()
  })
})
