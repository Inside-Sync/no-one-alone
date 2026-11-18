import { FAMILY_RANGES, PREV_RANGES, SAFETY_RANGES } from '@/features/testcase/data'
import { checkValue, snapToStep, type AdultProfile, type SafetyInputs } from '@/features/testcase/engine'
import { auto, make, text } from './helpers'

/**
 * Input guardrail (plan item B3): which inputs are missing or implausible, split into `required` (the decision cannot be taken, the UI
 * must ask) and `recommended` (a warning, the flow continues). The ranges are the prototype's own sliders: plausibility only.
 */
const fields = (xs: { field: string }[]) => xs.map((x) => x.field)

describe('checkValue and snapToStep', () => {
  const hr = SAFETY_RANGES.hr
  test('missing: not a number', () => {
    for (const v of [null, undefined, '', Number.NaN, 'abc', true, Number.POSITIVE_INFINITY]) expect(checkValue(hr, v)).toMatchObject({ ok: false, kind: 'missing' })
  })
  test('out of range: clamped to the nearest limit', () => {
    expect(checkValue(hr, 400)).toEqual({ ok: false, kind: 'range', value: 180 })
    expect(checkValue(hr, 10)).toEqual({ ok: false, kind: 'range', value: 45 })
    expect(checkValue(hr, 180).ok).toBe(true)
    expect(checkValue(hr, 45).ok).toBe(true)
  })
  test('numeric strings are accepted; values are snapped to the step', () => {
    expect(checkValue(hr, '120')).toEqual({ ok: true, value: 120 })
    expect(checkValue(SAFETY_RANGES.glu, 5.64)).toEqual({ ok: true, value: 5.6 })
    expect(snapToStep(0.30000000000000004, FAMILY_RANGES.bmiTrend)).toBe(0.3)
    expect(snapToStep(29.3, FAMILY_RANGES.bmi)).toBe(29.5)
  })
  test('the ranges are the prototype sliders', () => {
    expect(SAFETY_RANGES).toEqual({ hr: { min: 45, max: 180, step: 1 }, dur: { min: 0, max: 20, step: 1 }, floor: { min: 0, max: 30, step: 1 }, glu: { min: 1.5, max: 15, step: 0.1 }, spo2: { min: 80, max: 100, step: 1 }, wt: { min: -2, max: 4, step: 0.1 } })
    expect(PREV_RANGES).toEqual({ ageChild: { min: 0, max: 84, step: 1 }, ageAdult: { min: 16, max: 85, step: 1 }, overdue: { min: 0, max: 26, step: 1 }, rem: { min: 0, max: 6, step: 1 } })
  })
})

describe('the safety inputs ("Enter your own" and every safety case)', () => {
  test('every case starts with no required issue', () => {
    for (const id of ['stroke', 'fall', 'hypo', 'hf', 'own'] as const) expect(make(id).getSnapshot().inputIssues.required).toEqual([])
    for (const id of ['wellchild', 'ifhas', 'expat', 'bone'] as const) expect(make(id).getSnapshot().inputIssues.required).toEqual([])
  })
  test('a heart rate of 400 is refused with a reason; the old value stays and the decision is blocked', () => {
    const e = make('own')
    const r = e.setInput('hr', 400)
    expect(r.ok).toBe(false)
    expect((e.S.inp as SafetyInputs).hr).toBe(70)
    expect(r.issue).toMatchObject({ subject: 'safety', field: 'hr', level: 'required', kind: 'range', value: 400, min: 45, max: 180, applied: 70 })
    expect(text(e, r.issue!.message)).toBe('Heart rate: 400 is outside the plausible range 45 to 180 and was not accepted. Enter a value in that range.')
    expect(fields(e.getSnapshot().inputIssues.required)).toEqual(['hr'])
    e.play()
    expect(e.S.phase).toBe('setup') // blocked
    // a valid value clears the issue and the decision can go on
    expect(e.setInput('hr', 140)).toEqual({ ok: true, value: 140 })
    expect(e.getSnapshot().inputIssues.required).toEqual([])
    e.play()
    expect(e.S.phase).toBe('playing')
  })
  test('an empty or non-numeric entry is "missing": required, refused', () => {
    const e = make('own')
    for (const bad of [null, Number.NaN, '']) {
      const r = e.setInput('dur', bad)
      expect(r.ok).toBe(false)
      expect(r.issue).toMatchObject({ level: 'required', kind: 'missing', field: 'dur', value: null })
    }
    expect((e.S.inp as SafetyInputs).dur).toBe(0)
    expect(text(e, e.getSnapshot().inputIssues.required[0].message)).toBe('How long it stays is needed. Enter a number.')
  })
  test('every input has its limits: the readings are snapped to the step', () => {
    const e = make('own')
    for (const [k, lo, hi] of [['hr', 44, 181], ['dur', -1, 21], ['spo2', 79, 101], ['wt', -2.1, 4.1], ['glu', 1.4, 15.1]] as const) {
      expect(e.setInput(k, lo).ok).toBe(false)
      expect(e.setInput(k, hi).ok).toBe(false)
      expect(e.getSnapshot().inputIssues.required.some((i) => i.field === k)).toBe(true)
    }
    e.setInput('wt', 2.34)
    expect((e.S.inp as SafetyInputs).wt).toBe(2.3)
  })
  test('the time on the floor only matters when there was a fall', () => {
    const e = make('own')
    e.setInputToggle('fall', true)
    expect(e.setInput('floor', 45).ok).toBe(false)
    expect(fields(e.getSnapshot().inputIssues.required)).toEqual(['floor'])
  })
  test('without a glucose sensor, a person with diabetes gets a warning only; the flow continues', () => {
    const e = make('own')
    e.setPerson('saeed')
    e.setInputToggle('glus', true)
    expect(e.getSnapshot().inputIssues.recommended).toEqual([])
    e.setInputToggle('glus', false)
    const rec = e.getSnapshot().inputIssues.recommended
    expect(rec).toHaveLength(1)
    expect(rec[0]).toMatchObject({ field: 'glu', level: 'recommended', kind: 'missing' })
    expect(text(e, rec[0].message)).toBe('No glucose reading: Noa cannot check for low sugar (rule R3) until the sensor is on.')
    expect(e.getSnapshot().inputIssues.required).toEqual([])
    e.play()
    expect(e.S.phase).toBe('playing')
    // a person without diabetes is not warned
    const f = make('own')
    f.setInputToggle('glus', false)
    expect(f.getSnapshot().inputIssues.recommended).toEqual([])
  })
  test('an implausible glucose is a required issue even while the sensor warning shows (person with diabetes, sensor off)', () => {
    for (const bad of [0.2, 40, 'abc']) {
      const e = make('own')
      e.setPerson('saeed')
      e.setInputToggle('glus', false)
      const r = e.setInput('glu', bad)
      expect(r.ok).toBe(false)
      expect(fields(e.getSnapshot().inputIssues.required)).toEqual(['glu'])
      expect(e.getSnapshot().inputIssues.recommended.filter((i) => i.field === 'glu')).toEqual([])
      e.play()
      expect(e.S.phase).toBe('setup') // blocked, never run with the sensor treated as off
      expect(e.setInput('glu', 3.1).ok).toBe(true)
      expect(e.getSnapshot().inputIssues.required).toEqual([])
      e.play()
      expect(e.S.phase).toBe('playing')
    }
  })
  test('inputs cannot change after the check started (and the refusal is not an issue)', () => {
    const e = make('own')
    e.play()
    expect(e.setInput('hr', 150)).toEqual({ ok: false, value: Number.NaN })
    expect(e.getSnapshot().inputIssues.required).toEqual([])
  })
  test('a state scan catches a value that got in some other way (a deep link, a test)', () => {
    const e = make('own')
    ;(e.S.inp as SafetyInputs).hr = 400
    expect(e.getSnapshot().inputIssues.required[0]).toMatchObject({ field: 'hr', kind: 'range', value: 400 })
    expect(text(e, e.getSnapshot().inputIssues.required[0].message)).toBe('Heart rate: 400 is outside the plausible range 45 to 180. Correct it before Noa decides.')
    e.play()
    expect(e.S.phase).toBe('setup')
  })
  test('the autopilot is never blocked on the default inputs of any case', () => {
    for (const id of ['stroke', 'fall', 'hypo', 'hf', 'own'] as const) expect(auto(id).e.S.auto).toBe(false)
  })
})

describe('the prevention inputs', () => {
  test('age, weeks overdue and reminders are checked against their own ranges (months for a child, years for an adult)', () => {
    const c = make('wellchild')
    expect(c.setInput('age', 100).ok).toBe(false)
    expect(c.getSnapshot().inputIssues.required[0]).toMatchObject({ subject: 'prevention', field: 'age', min: 0, max: 84 })
    expect(c.setInput('age', 60).ok).toBe(true)
    const a = make('ifhas')
    expect(a.setInput('age', 10).ok).toBe(false)
    expect(a.getSnapshot().inputIssues.required[0]).toMatchObject({ min: 16, max: 85 })
    expect(a.setInput('overdue', 30).ok).toBe(false)
    expect(a.setInput('rem', 9).ok).toBe(false)
    expect(fields(a.getSnapshot().inputIssues.required).sort()).toEqual(['age', 'overdue', 'rem'])
    a.checkPassport()
    expect(a.S.phase).toBe('setup') // blocked until the three are corrected
    a.setInput('age', 47); a.setInput('overdue', 0); a.setInput('rem', 2)
    a.checkPassport()
    expect(a.S.phase).toBe('ask')
  })
  test('the nationality and other non-numeric inputs pass through untouched', () => {
    const e = make('expat')
    e.setNationality('Emirati')
    expect(e.getSnapshot().inputIssues.required).toEqual([])
  })
})

describe('the prevention result value', () => {
  test('an out-of-range or missing result is refused, reported, and blocks sending; a valid one clears it', () => {
    const e = make('ifhas')
    const before = e.S.resVal
    const r = e.setResVal(99)
    expect(r.ok).toBe(false)
    expect(e.S.resVal).toBe(before)
    expect(r.issue).toMatchObject({ subject: 'prevention', field: 'result', level: 'required', kind: 'range', value: 99 })
    expect(fields(e.getSnapshot().inputIssues.required)).toEqual(['result'])
    expect(e.setResVal(Number.NaN).issue).toMatchObject({ kind: 'missing' })
    expect(e.setResVal(5.4)).toEqual({ ok: true, value: 5.4 })
    expect(e.getSnapshot().inputIssues.required).toEqual([])
  })
})

describe('the family profiles', () => {
  test('cholesterol not measured: a warning for everyone the score applies to (30 to 74, no heart attack or stroke)', () => {
    const e = make('family')
    const rec = e.getSnapshot().inputIssues.recommended
    // Khalid (47) has none; Moza (stroke), Maitha and Sultan (under 30) and the children are not scored, so no warning for them
    expect(rec.map((i) => [i.subject, i.field, i.level, i.kind])).toEqual([['khalid', 'tc', 'recommended', 'missing']])
    expect(text(e, rec[0].message)).toBe('Cholesterol is not measured yet, so Noa uses BMI for the heart score.')
    e.toggleProfile('khalid', 'labs')
    expect(e.getSnapshot().inputIssues.recommended).toEqual([])
    e.setProfile('maitha', 'age', 40)
    expect(e.getSnapshot().inputIssues.recommended.map((i) => i.subject)).toEqual(['maitha'])
  })
  test('only one of the two cholesterols: warned, and the BMI score is still used', () => {
    const e = make('family')
    e.setProfile('khalid', 'tc', 5.5)
    expect((e.S.fm!.prof.khalid as AdultProfile).hdl).toBeNull()
    const rec = e.getSnapshot().inputIssues.recommended.filter((i) => i.subject === 'khalid')
    expect(rec).toHaveLength(1)
    expect(rec[0]).toMatchObject({ field: 'hdl', kind: 'missing' })
    expect(text(e, rec[0].message)).toBe('Only one of total and HDL cholesterol is entered, so Noa uses BMI for the heart score.')
    expect((e.getSnapshot().family!.forecast.khalid as { lab: boolean }).lab).toBe(false)
  })
  test('required and recommended never mix: a clamped value is a warning, a refused one blocks the results', () => {
    const e = make('family')
    e.setProfile('khalid', 'sbp', 999)
    expect(fields(e.getSnapshot().inputIssues.required)).toEqual([])
    expect(e.getSnapshot().inputIssues.recommended.some((i) => i.field === 'sbp')).toBe(true)
    e.setProfile('khalid', 'age', Number.NaN)
    expect(fields(e.getSnapshot().inputIssues.required)).toEqual(['age'])
  })
  test('a result outside its range is clamped with a warning; an empty one blocks sending', () => {
    const e = make('family')
    for (const id of ['book_hind', 'book_khalid']) e.famAct(id)
    e.next(); e.settle()
    for (let i = 0; i < 20 && e.cur().kind !== 'famresult'; i++) { if (e.cur().kind === 'tl') e.tlNext(); e.next(); e.settle() }
    expect(e.cur().kind).toBe('famresult')
    const r = e.setFamResult('khalid_tc', 25)
    expect(r.ok).toBe(false)
    expect(e.S.fm!.res.khalid_tc).toBe(10)
    expect(r.issue).toMatchObject({ subject: 'khalid', field: 'res.khalid_tc', level: 'recommended', kind: 'range', min: 3, max: 10, applied: 10 })
    expect(text(e, r.issue!.message)).toBe('Khalid: total cholesterol: 25 is outside 3 to 10, so 10 is used.')
    const m = e.setFamResult('hind', Number.NaN)
    expect(m.issue).toMatchObject({ level: 'required', kind: 'missing' })
    e.famSendResults()
    expect(e.S.done[e.S.step]).toBeFalsy() // blocked
    e.setFamResult('hind', 2)
    e.famSendResults()
    expect(e.S.done[e.S.step]).toBe(true)
  })
})
