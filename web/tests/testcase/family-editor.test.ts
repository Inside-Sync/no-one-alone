import { FAMILY_PROFILES, FAMILY_RANGES } from '@/features/testcase/data'
import { famScore, nextAction, type AdultProfile, type TestCaseEngine } from '@/features/testcase/engine'
import { make, text } from './helpers'

/** The editor actions (setProfile, toggleProfile, setSex, resetFamily) and what they set off: child sync, heart-risk alerts, the log. */
const logs = (e: TestCaseEngine) => e.logs.map((l) => `${l.m} ${text(e, l.tx)}`)
const adult = (e: TestCaseEngine, k: string) => e.S.fm!.prof[k] as AdultProfile
const alert = (e: TestCaseEngine, id: string) => e.S.fm!.alerts.find((a) => a.id === id)

describe('setProfile: ranges, steps, clamping', () => {
  test('the ranges are the prototype sliders', () => {
    expect(FAMILY_RANGES).toEqual({
      age: { min: 18, max: 90, step: 1 }, sbp: { min: 90, max: 200, step: 1 }, bmi: { min: 16, max: 45, step: 0.5 }, tc: { min: 2.5, max: 10, step: 0.1 }, hdl: { min: 0.5, max: 3, step: 0.1 },
      sbpTrend: { min: -5, max: 8, step: 1 }, bmiTrend: { min: -2, max: 2, step: 0.1 }, ageM: { min: 1, max: 72, step: 1 }, overdueW: { min: 0, max: 12, step: 1 },
    })
  })
  test('a value in range is applied, logged and returned', () => {
    const e = make('family')
    const r = e.setProfile('khalid', 'sbp', 150)
    expect(r).toEqual({ ok: true, value: 150 })
    expect(adult(e, 'khalid').sbp).toBe(150)
    expect(logs(e)[0]).toBe('EDIT Profile changed by you · Khalid: Blood pressure (top number) 150 mmHg')
    expect(e.getSnapshot().inputIssues).toEqual({ required: [], recommended: expect.any(Array) })
  })
  test('the log line shows each field the way the prototype formats it', () => {
    const e = make('family')
    e.setProfile('khalid', 'age', 50)
    e.setProfile('khalid', 'bmi', 30.5)
    e.setProfile('khalid', 'sbpTrend', 4)
    e.setProfile('khalid', 'bmiTrend', -0.5)
    e.toggleProfile('khalid', 'labs')
    e.setProfile('khalid', 'tc', 6.5)
    e.setProfile('khalid', 'hdl', 1.1)
    e.setProfile('hind', 'ageM', 30)
    e.setProfile('hind', 'overdueW', 2)
    expect(logs(e).slice(0, 9).reverse()).toEqual([
      'EDIT Profile changed by you · Khalid: Age 50 years',
      'EDIT Profile changed by you · Khalid: BMI 30.5',
      'EDIT Profile changed by you · Khalid: Blood pressure trend +4 mmHg/yr',
      'EDIT Profile changed by you · Khalid: BMI trend −0.5/yr',
      'EDIT Profile changed by you · Khalid: cholesterol measured',
      'EDIT Profile changed by you · Khalid: Total cholesterol 6.5 mmol/L',
      'EDIT Profile changed by you · Khalid: HDL cholesterol 1.1 mmol/L',
      'EDIT Profile changed by you · Hind: Age 30 months',
      'EDIT Profile changed by you · Hind: Weeks overdue 2 weeks',
    ])
  })
  test('values are snapped to the slider step (no float noise) and clamped to the range, with a warning', () => {
    const e = make('family')
    expect(e.setProfile('khalid', 'bmi', 29.3)).toEqual({ ok: true, value: 29.5 })
    e.toggleProfile('khalid', 'labs')
    expect(e.setProfile('khalid', 'tc', 5.2000001)).toEqual({ ok: true, value: 5.2 })
    const r = e.setProfile('khalid', 'sbp', 250)
    expect(r.ok).toBe(false)
    expect(r.value).toBe(200)
    expect(adult(e, 'khalid').sbp).toBe(200) // clamped, applied
    expect(r.issue).toMatchObject({ subject: 'khalid', field: 'sbp', level: 'recommended', kind: 'range', value: 250, min: 90, max: 200, applied: 200 })
    expect(text(e, r.issue!.message)).toBe('Blood pressure (top number): 250 is outside 90 to 200, so 200 is used.')
    expect(e.getSnapshot().inputIssues.recommended.map((i) => i.field)).toContain('sbp')
    // a valid value clears the warning
    e.setProfile('khalid', 'sbp', 140)
    expect(e.getSnapshot().inputIssues.recommended.map((i) => i.field)).not.toContain('sbp')
    expect(e.setProfile('khalid', 'age', 5).value).toBe(18)
    expect(e.setProfile('khalid', 'age', 500).value).toBe(90)
  })
  test('a missing number is refused and explained; the old value stays', () => {
    const e = make('family')
    for (const bad of [Number.NaN, null as unknown as number, undefined as unknown as number, '' as unknown as number]) {
      const r = e.setProfile('khalid', 'sbp', bad)
      expect(r.ok).toBe(false)
      expect(r.issue).toMatchObject({ level: 'required', kind: 'missing', field: 'sbp', value: null, applied: 132 })
    }
    expect(adult(e, 'khalid').sbp).toBe(132)
    expect(e.getSnapshot().inputIssues.required.map((i) => i.field)).toEqual(['sbp'])
    expect(text(e, e.getSnapshot().inputIssues.required[0].message)).toBe('Blood pressure (top number) is needed. Enter a number.')
    // the family step cannot send results while a required input is open; a valid value clears it
    e.setProfile('khalid', 'sbp', 133)
    expect(e.getSnapshot().inputIssues.required).toEqual([])
  })
  test('adult fields do not apply to a child, child fields not to an adult', () => {
    const e = make('family')
    expect(e.setProfile('hind', 'sbp', 120).ok).toBe(false)
    expect(e.setProfile('khalid', 'ageM', 12).ok).toBe(false)
    expect(e.setProfile('nobody', 'age', 30).ok).toBe(false)
    expect(adult(e, 'khalid').sbp).toBe(132)
  })
  test('dragging (commit false) changes the value only: no log line, no heart-risk alert, but the child status follows', () => {
    const e = make('family')
    const n = e.logs.length
    e.setProfile('amna', 'sbp', 190, false)
    expect(adult(e, 'amna').sbp).toBe(190)
    expect(e.logs).toHaveLength(n)
    e.setProfile('hind', 'overdueW', 0, false)
    expect(e.S.fm!.status.hind).toBe('due')
    expect(e.logs).toHaveLength(n)
    // releasing the slider logs and syncs
    e.setProfile('amna', 'sbp', 190, true)
    expect(e.logs.length).toBeGreaterThan(n)
  })
})

describe('children: status and alert title follow the profile', () => {
  test('weeks overdue: overdue while late, due once on time; the alert title names the next visit', () => {
    const e = make('family')
    expect(e.S.fm!.status.hind).toBe('overdue')
    e.setProfile('hind', 'overdueW', 0)
    expect(e.S.fm!.status.hind).toBe('due')
    expect(text(e, alert(e, 'hind')!.title)).toBe('18-month visit is due')
    e.setProfile('hind', 'overdueW', 1)
    expect(e.S.fm!.status.hind).toBe('overdue')
    expect(text(e, alert(e, 'hind')!.title)).toBe('18-month visit is 1 week overdue')
    e.setProfile('hind', 'overdueW', 5)
    expect(text(e, alert(e, 'hind')!.title)).toBe('18-month visit is 5 weeks overdue')
    e.setProfile('hind', 'ageM', 30)
    expect(text(e, alert(e, 'hind')!.title)).toBe('2.5-year visit is 5 weeks overdue')
    e.setProfile('hind', 'ageM', 72)
    e.setProfile('hind', 'overdueW', 0)
    expect(text(e, alert(e, 'hind')!.title)).toBe('6-year visit is due')
    const v = e.getSnapshot().family!.child.hind
    expect(v).toMatchObject({ next: 72, done: 14, total: 14 })
    expect(text(e, v.nextName!)).toBe('6-year visit')
  })
  test('booked or declined children keep their status', () => {
    const e = make('family')
    e.famAct('book_hind')
    e.setProfile('hind', 'overdueW', 0)
    expect(e.S.fm!.status.hind).toBe('booked')
    const f = make('family')
    f.famAct('no_hind')
    f.setProfile('hind', 'overdueW', 0)
    expect(f.S.fm!.status.hind).toBe('declined')
  })
  test('the visits done counter counts the finished visits (a visit is done once nothing is overdue)', () => {
    const e = make('family')
    expect(e.getSnapshot().family!.child.hind).toMatchObject({ next: 18, done: 7 })
    e.setProfile('hind', 'overdueW', 0)
    expect(e.getSnapshot().family!.child.hind.done).toBe(8)
    expect(text(e, e.getSnapshot().family!.signals.hind[0].value)).toBe('Visits done: 8 of 14')
  })
})

describe('toggleProfile and setSex', () => {
  test('yes / no fields flip, are logged "yes" or "no", and change the score', () => {
    const e = make('family')
    const r0 = (e.getSnapshot().family!.forecast.khalid as { r: number }).r
    e.toggleProfile('khalid', 'smoker')
    expect(adult(e, 'khalid').smoker).toBe(false)
    expect(logs(e)[0]).toBe('EDIT Profile changed by you · Khalid: Smokes or vapes no')
    expect((e.getSnapshot().family!.forecast.khalid as { r: number }).r).toBeLessThan(r0)
    e.toggleProfile('khalid', 'dm')
    expect(logs(e)[0]).toBe('EDIT Profile changed by you · Khalid: Diabetes yes')
    for (const f of ['bpTx', 'cvd', 'emirati'] as const) { e.toggleProfile('khalid', f); expect(adult(e, 'khalid')[f]).toBe(f === 'emirati' ? false : true) }
  })
  test('"cholesterol measured" sets total 5.2 and HDL 1.2; off clears both and the BMI score returns', () => {
    const e = make('family')
    expect(adult(e, 'khalid')).toMatchObject({ tc: null, hdl: null })
    e.toggleProfile('khalid', 'labs')
    expect(adult(e, 'khalid')).toMatchObject({ tc: 5.2, hdl: 1.2 })
    expect(logs(e)[0]).toBe('EDIT Profile changed by you · Khalid: cholesterol measured')
    expect((e.getSnapshot().family!.forecast.khalid as { lab: boolean }).lab).toBe(true)
    e.toggleProfile('khalid', 'labs')
    expect(adult(e, 'khalid')).toMatchObject({ tc: null, hdl: null })
    expect(logs(e)[0]).toBe('EDIT Profile changed by you · Khalid: cholesterol not measured')
    expect((e.getSnapshot().family!.forecast.khalid as { lab: boolean }).lab).toBe(false)
  })
  test('sex is set, logged and changes the score; children and unknown members are left alone', () => {
    const e = make('family')
    e.setSex('khalid', 'F')
    expect(adult(e, 'khalid').sex).toBe('F')
    expect(logs(e)[0]).toBe('EDIT Profile changed by you · Khalid: sex F')
    const n = e.logs.length
    e.setSex('hind', 'M')
    e.toggleProfile('hind', 'smoker')
    e.toggleProfile('nobody', 'smoker')
    expect(e.logs).toHaveLength(n)
  })
  test('resetFamily: every profile back to the start, the "not now" forgotten, the warnings cleared', () => {
    const e = make('family')
    e.toggleProfile('khalid', 'smoker')
    e.setProfile('khalid', 'sbp', 999)
    e.setProfile('hind', 'ageM', 60)
    e.S.fm!.fcNo.khalid = true
    e.resetFamily()
    expect(e.S.fm!.prof).toEqual(FAMILY_PROFILES)
    expect(e.S.fm!.fcNo).toEqual({})
    expect(logs(e)[0]).toBe('EDIT Family profiles reset')
    expect(e.getSnapshot().inputIssues.recommended.filter((i) => i.kind === 'range')).toEqual([])
    expect(text(e, alert(e, 'hind')!.title)).toBe('18-month visit is 3 weeks overdue')
  })
})

describe('Noa Forecast keeps one heart-risk alert per person in step with the profile', () => {
  const raiseAmna = (e: TestCaseEngine) => {
    e.setProfile('amna', 'age', 60); e.toggleProfile('amna', 'smoker'); e.toggleProfile('amna', 'dm'); e.toggleProfile('amna', 'bpTx'); e.setProfile('amna', 'sbp', 170)
  }
  test('while the person has another open alert, a high risk does not add a second nudge', () => {
    const e = make('family')
    raiseAmna(e)
    expect(alert(e, 'fc_amna')).toBeUndefined()
    expect((e.getSnapshot().family!.forecast.amna as { cat: { id: string } }).cat.id).toBe('high')
  })
  test('once the other alert is answered, the heart-risk alert appears (red, Forecast, two actions) and is logged', () => {
    const e = make('family')
    raiseAmna(e)
    e.famAct('keep_amna')
    const a = alert(e, 'fc_amna')!
    expect(a).toMatchObject({ lvl: 'red', agent: 'forecast', state: 'open', who: 'amna' })
    expect(a.acts.map((x) => x.id)).toEqual(['fcb_amna', 'fcn_amna'])
    expect(text(e, a.title)).toBe('High heart risk: 54% in 10 years')
    expect(logs(e)).toContain('FORECAST Noa Forecast · Amna: 10-year heart risk 54% (high) → doctor review offered')
    expect(e.S.fm!.alerts[0].id).toBe('fc_amna') // newest first
    // the title follows the profile while the alert is open
    e.setProfile('amna', 'sbp', 172)
    expect(text(e, alert(e, 'fc_amna')!.title)).toBe('High heart risk: 55% in 10 years')
  })
  test('"Book a doctor review": the alert is done, the person is in care, a task is added', () => {
    const e = make('family')
    raiseAmna(e)
    e.famAct('keep_amna')
    e.famAct('fcb_amna')
    expect(alert(e, 'fc_amna')!.state).toBe('done')
    expect(text(e, alert(e, 'fc_amna')!.done)).toBe('Doctor review booked: Sunday 10:00 with Dr Aisha Al Hosani. The signals go with it.')
    expect(e.S.fm!.status.amna).toBe('care')
    expect(text(e, e.db.tasks[0].task)).toBe('Amna: heart risk review')
    expect(text(e, e.db.tasks[0].result)).toBe('Booked Sunday 10:00')
    expect(logs(e)[1]).toBe('BOOK Noa Navigator · Amna: doctor review for heart risk')
  })
  test('"Not now" is respected: no more heart-risk alerts for that person, even if the risk rises', () => {
    const e = make('family')
    raiseAmna(e)
    e.famAct('keep_amna')
    e.famAct('fcn_amna')
    expect(e.S.fm!.fcNo.amna).toBe(true)
    expect(text(e, alert(e, 'fc_amna')!.done)).toBe('Choice respected: no reminders for 3 months; the forecast stays in the passport.')
    expect(logs(e).slice(0, 2)).toContain('CHOICE Noa Navigator · Amna: not now (heart review)')
    e.S.fm!.alerts.splice(e.S.fm!.alerts.findIndex((a) => a.id === 'fc_amna'), 1)
    e.setProfile('amna', 'sbp', 180)
    expect(alert(e, 'fc_amna')).toBeUndefined()
  })
  test('an open heart-risk alert is withdrawn when the risk falls below high (or the person stops being scored)', () => {
    const e = make('family')
    raiseAmna(e)
    e.famAct('keep_amna')
    expect(alert(e, 'fc_amna')).toBeDefined()
    e.setProfile('amna', 'age', 80) // no longer scored
    expect(alert(e, 'fc_amna')).toBeUndefined()
    expect(logs(e)[0]).toBe('FORECAST Noa Forecast · Amna: risk now not scored, below high · alert withdrawn')
    e.setProfile('amna', 'age', 60)
    expect(alert(e, 'fc_amna')).toBeDefined()
    e.toggleProfile('amna', 'smoker'); e.toggleProfile('amna', 'dm'); e.toggleProfile('amna', 'bpTx'); e.setProfile('amna', 'sbp', 110)
    expect(alert(e, 'fc_amna')).toBeUndefined()
    expect(logs(e).some((l) => l.startsWith('FORECAST Noa Forecast · Amna: risk now ') && l.endsWith('below high · alert withdrawn'))).toBe(true)
  })
  test('a booked or declined person gets no offer; a done alert is not withdrawn', () => {
    const e = make('family')
    e.famAct('book_amna')
    raiseAmna(e)
    expect(alert(e, 'fc_amna')).toBeUndefined()
    const f = make('family')
    f.famAct('no_amna')
    raiseAmna(f)
    expect(alert(f, 'fc_amna')).toBeUndefined()
  })
  test('someone past a stroke (Moza) is not scored, and the reason is data on the snapshot', () => {
    const e = make('family')
    const f = e.getSnapshot().family!.forecast.moza
    expect(f.ok).toBe(false)
    if (!f.ok) { expect(f.reason).toBe('cvd'); expect(text(e, f.short)).toBe('Has had a heart attack or stroke') }
    for (const k of ['maitha', 'sultan']) { const g = e.getSnapshot().family!.forecast[k]; expect(g.ok === false && g.reason).toBe('under30') }
    expect(e.getSnapshot().family!.forecast.hind).toMatchObject({ ok: false, reason: 'child' })
  })
})

describe('nextAction and the signals', () => {
  test('the next action is the one next thing: booking, "not now", doctor review, cholesterol, IFHAS, nothing', () => {
    const e = make('family')
    const next = (k: string) => text(e, e.getSnapshot().family!.next[k])
    expect(next('khalid')).toBe('Measure cholesterol at the next check') // no labs yet: the BMI estimate
    expect(next('saeed')).toBe('Doctor review within 2 weeks') // 40%
    expect(next('amna')).toBe('IFHAS screening')
    expect(next('hamdan')).toBe('Nothing due now')
    e.famAct('book_khalid')
    expect(next('khalid')).toBe('Booked: Saturday 09:30, same clinic')
    e.famAct('no_sultan')
    expect(next('sultan')).toBe('“Not now” respected for 3 months')
    e.toggleProfile('amna', 'emirati')
    expect(next('amna')).toBe('IFHAS is for Emiratis 18–75: no IFHAS nudges')
    e.toggleProfile('amna', 'emirati')
    e.S.fm!.status.amna = 'ok'
    expect(next('amna')).toBe('Nothing due now')
    // nextAction is a pure function of the state too
    expect(nextAction(e.S.fm!, 'khalid', e.forecast('khalid')).k).toBe('family.next.booked')
  })
  test('signals: which agent found what, from where (adults)', () => {
    const e = make('family')
    const rows = e.getSnapshot().family!.signals.khalid
    expect(rows.map((r) => r.agent)).toEqual(['guardian', 'guardian', 'voice', 'courier', 'insight', 'forecast', 'navigator'])
    expect(rows.map((r) => `${text(e, r.source)}: ${text(e, r.value)}`)).toEqual([
      'BP cuff via the InsideSync app: Top number 132 mmHg · rising 3 a year',
      'Smart scale via the InsideSync app: BMI 29 · +0.5 a year',
      '1-minute check-in: Smokes: yes · diabetes: no',
      'Clinic and lab records: Cholesterol not measured yet: BMI used instead',
      'Family links: Mother: stroke and atrial fibrillation at 77 · father (late Abdullah): heart attack at 62',
      'Framingham 10-year heart risk: 18% (moderate) · heart age 65',
      'Next action: Measure cholesterol at the next check',
    ])
    const m = e.getSnapshot().family!.signals.moza.map((r) => `${text(e, r.source)}: ${text(e, r.value)}`)
    expect(m[0]).toBe('Home BP cuff: Top number 146 mmHg · on BP tablets')
    expect(m[3]).toBe('Clinic and lab records: Cholesterol 4.2, HDL 1.4 mmol/L')
    expect(m[5]).toBe('Framingham 10-year heart risk: Not scored: Has had a heart attack or stroke')
  })
  test('signals for a child are the visit signals', () => {
    const e = make('family')
    const rows = e.getSnapshot().family!.signals.hind.map((r) => `${r.agent} ${text(e, r.source)}: ${text(e, r.value)}`)
    expect(rows).toEqual([
      'courier Al Khalidiya Family Health Centre records: Visits done: 7 of 14',
      'guardian Passport schedule (demo ages): Next: 18-month visit, 3 weeks overdue',
      'voice Asked the parent once: Barrier: clinic hours clash with shifts',
    ])
  })
  test('the score follows the status of everybody', () => {
    const e = make('family')
    expect(famScore(e.S.fm!)).toBe(25)
    expect(e.getSnapshot().famScore).toBe(25)
    expect(e.getSnapshot().famUp).toBe(1)
  })
})
