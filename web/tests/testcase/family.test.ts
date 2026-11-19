import { FAMILY_ALERTS, FAMILY_BADGES, FAMILY_CONNECTIONS, FAMILY_MEMBERS, FAMILY_PROFILES, FAMILY_RESULTS, FAMILY_SOURCES } from '@/features/testcase/data'
import { famScore, famUp, routeFamilyResult } from '@/features/testcase/engine'
import { runAutoStep } from '@/features/testcase/engine/autopilot'
import type { TestCaseEngine } from '@/features/testcase/engine'
import oracle from './fixtures/prototype-oracle.json'
import { make, t, text } from './helpers'

const logs = (e: TestCaseEngine) => e.logs.map((l) => text(e, l.tx))
function toStep(e: TestCaseEngine, kind: string) {
  for (let i = 0; i < 100; i++) {
    e.drain()
    if (e.cur().kind === kind && !e.S.done[e.S.step]) return
    if (runAutoStep(e)) throw new Error('stopped before ' + kind)
  }
}
const BOOK_ALL = ['book_hind', 'book_maitha', 'book_khalid', 'book_amna', 'book_saeed', 'book_sultan']
const allBooked = () => {
  const e = make('family')
  for (const id of BOOK_ALL) e.famAct(id)
  e.next(); e.settle()
  toStep(e, 'famresult')
  return e
}

describe('the whole family: one Family Health Passport (eight people, four generations)', () => {
  test('eight people, six sources, eight connections of which five start visible, eight badges', () => {
    expect(FAMILY_MEMBERS.map((m) => [m.id, m.gen, m.stage])).toEqual([
      ['moza', 1, 'older'], ['saeed', 1, 'older'], ['khalid', 2, 'adult'], ['amna', 2, 'adult'], ['maitha', 3, 'adult'], ['sultan', 3, 'adult'], ['hind', 4, 'child'], ['hamdan', 4, 'child'],
    ])
    expect(Object.keys(FAMILY_PROFILES)).toEqual(FAMILY_MEMBERS.map((m) => m.id))
    expect(FAMILY_SOURCES).toHaveLength(6)
    expect(Object.keys(FAMILY_CONNECTIONS)).toEqual(['C1', 'C7', 'C2', 'C3', 'C6', 'C8', 'C4', 'C5'])
    expect(FAMILY_CONNECTIONS.C7.to).toEqual(['khalid', 'sultan'])
    expect(Object.keys(FAMILY_BADGES)).toEqual(['hamdan', 'trip', 'first', 'sultan', 'hind8', 'bp', 'plan', 'heart'])
    expect(FAMILY_ALERTS.map((a) => [a.id, a.lvl, a.state, a.agent])).toEqual([
      ['moza', 'red', 'open', 'navigator'], ['hind', 'amber', 'open', 'voice'], ['maitha', 'yellow', 'open', 'navigator'], ['khalid', 'amber', 'open', 'forecast'],
      ['amna', 'yellow', 'open', 'insight'], ['saeed', 'amber', 'open', 'navigator'], ['sultan', 'amber', 'open', 'voice'], ['hamdan', 'green', 'done', 'guardian'],
    ])
  })

  test('the starting profiles are the prototype\'s (FMP)', () => {
    expect(FAMILY_PROFILES).toEqual(oracle.famProfiles)
    expect(FAMILY_PROFILES.khalid).toMatchObject({ age: 47, sex: 'M', sbp: 132, smoker: true, tc: null, hdl: null, bmi: 29, sbpTrend: 3, bmiTrend: 0.5 })
    expect(FAMILY_PROFILES.hind).toEqual({ child: true, ageM: 18, overdueW: 3 })
  })

  test('the starting state: 25% of the family up to date, one badge, Khalid selected, five connections', () => {
    const e = make('family')
    const F = e.S.fm!
    expect(famScore(F)).toBe(25)
    expect(famUp(F)).toBe(1)
    expect(F.badges).toEqual(['hamdan'])
    expect(F.sel).toBe('khalid')
    expect(F.conn).toEqual(['C1', 'C7', 'C2', 'C3', 'C6'])
    expect(F.status).toEqual({ moza: 'alert', saeed: 'overdue', khalid: 'overdue', amna: 'due', maitha: 'due', sultan: 'overdue', hind: 'overdue', hamdan: 'ok' })
    expect(e.S.path).toBe('fam')
    expect(e.steps().map((s) => s.kind)).toEqual(['famhub', 'tl', 'famresult', 'teach', 'tl', 'report'])
    expect(e.canNext()).toBe(false)
    expect(e.db.patients).toHaveLength(8)
    expect(e.db.consents).toHaveLength(10)
    expect(e.db.observations).toHaveLength(6) // the home readings of the six adults
    expect(e.db.encounters).toHaveLength(6)
    expect(e.S.dbTab).toBe('patients')
    expect(F.alerts.map((a) => a.id)).toEqual(['moza', 'hind', 'maitha', 'khalid', 'amna', 'saeed', 'sultan', 'hamdan'])
    expect(text(e, F.alerts[1].title)).toBe('18-month visit is 3 weeks overdue')
    expect(e.getSnapshot().family?.age.hind).toEqual({ k: 'family.ageMonths', p: { n: 18 } })
    expect(e.getSnapshot().family?.age.hamdan).toBe(5)
  })

  test('the Forecast agent is the ninth agent, after Insight', () => {
    const e = make('family')
    expect(e.db.agents).toHaveLength(9)
    expect(text(e, e.db.agents[5].name)).toBe('Noa Forecast')
  })

  test('score weights: ok 1, care .85, booked .7, due .4, declined .3, alert .2, overdue 0', () => {
    const F = make('family').S.fm!
    const set = (v: string) => { for (const k of Object.keys(F.status)) F.status[k] = v }
    for (const [v, pct] of [['ok', 100], ['care', 85], ['booked', 70], ['due', 40], ['declined', 30], ['alert', 20], ['overdue', 0]] as const) {
      set(v)
      expect(famScore(F)).toBe(pct)
    }
  })

  test('booking Hind: a slot, a task, a feed note, +9 points; the step is done after the first booking', () => {
    const e = make('family')
    e.famAct('book_hind')
    expect(e.S.fm!.status.hind).toBe('booked')
    expect(text(e, e.S.fm!.booked.hind)).toBe('Saturday 09:00, Al Khalidiya Family Health Centre')
    expect(logs(e)[0]).toBe('Family passport 34% (+9)')
    expect(logs(e)[1]).toBe('Noa Navigator · Hind booked: Saturday 09:00, Al Khalidiya Family Health Centre')
    expect(text(e, e.S.feed[0].text)).toBe('Booked: Saturday 09:00, Al Khalidiya Family Health Centre')
    expect(text(e, e.db.tasks[0].task)).toBe('Hind: 18-month visit is 3 weeks overdue')
    expect(e.S.done[0]).toBe(true)
    expect(e.canNext()).toBe(true)
    expect(e.db.tasks).toHaveLength(1)
    // acting twice does nothing
    const n = e.logs.length
    e.famAct('book_hind')
    expect(e.logs).toHaveLength(n)
  })

  test('Khalid gives the "first screening" badge, Sultan the "first screening" of a young adult; two of the four on the trip give "one trip"', () => {
    const e = make('family')
    e.famAct('book_khalid')
    expect(e.S.fm!.badges).toEqual(['hamdan', 'first'])
    e.famAct('book_maitha')
    expect(e.S.fm!.badges).toEqual(['hamdan', 'first', 'trip'])
    expect(logs(e)).toContain('Family badge: One trip, four checks')
    e.famAct('book_sultan')
    expect(e.S.fm!.badges).toContain('sultan')
  })

  test('Saeed\'s checks go to a visit he already has; Sultan\'s booking starts quit support for father and son (C8) only while Khalid smokes', () => {
    const e = make('family')
    e.famAct('book_saeed')
    expect(text(e, e.S.fm!.booked.saeed)).toBe('Tuesday 10:00, his diabetes clinic visit')
    expect(e.S.fm!.alerts.find((a) => a.id === 'saeed')!.state).toBe('done')
    e.famAct('book_sultan')
    expect(e.S.fm!.conn).toEqual(['C1', 'C7', 'C2', 'C3', 'C6', 'C8'])
    expect(logs(e)).toContain('Noa Insight · new family connection: father and son both smoke → quit support for both')
    const f = make('family')
    f.toggleProfile('khalid', 'smoker')
    f.famAct('book_sultan')
    expect(f.S.fm!.conn).toEqual(['C1', 'C7', 'C2', 'C3', 'C6'])
  })

  test('Moza: the clinic accepts, the plan is explained in Arabic, the blood pressure badge', () => {
    const e = make('family')
    e.famAct('moza_ok')
    expect(e.S.fm!.status.moza).toBe('care')
    expect(e.S.fm!.badges).toContain('bp')
    expect(text(e, e.S.fm!.alerts.find((a) => a.id === 'moza')!.done)).toBe('Dr Omar Haddad changed the dose; Noa Coach explained it to Moza in Arabic.')
    expect(e.S.done[0]).toBeFalsy() // accepting is not a booking
  })

  test('"Not now" is respected for anyone; "keep the date" keeps Amna due', () => {
    const e = make('family')
    e.famAct('no_khalid')
    expect(e.S.fm!.status.khalid).toBe('declined')
    expect(e.S.fm!.declined.khalid).toBe(true)
    expect(logs(e)).toContain('Noa Navigator · Khalid: not now · reminders paused 3 months')
    e.famAct('keep_amna')
    expect(e.S.fm!.status.amna).toBe('due')
    expect(logs(e)).toContain('Amna keeps the original date; one reminder before')
    expect(e.S.done[0]).toBeFalsy()
  })

  test('nothing booked: the trip says so, the results step has nothing to do', () => {
    const e = make('family')
    for (const id of ['no_hind', 'no_maitha', 'no_khalid', 'keep_amna', 'no_saeed', 'no_sultan']) e.famAct(id)
    e.S.done[0] = true // the facilitator moves on regardless
    e.next()
    e.settle()
    expect(e.steps()[1].items?.[0].title).toBe('family.visits.none.0.title')
    expect(e.items(e.steps()[1]).map((r) => text(e, r.title))).toEqual(['No visits booked'])
    e.tlNext()
    e.next(); e.settle()
    expect(e.cur().kind).toBe('famresult')
    expect(e.S.done[e.S.step]).toBe(true)
  })

  test('the trip lists each booking in order; Hind\'s row is named after her next visit', () => {
    const e = allBooked()
    const trip = e.steps()[1]
    expect(e.items(trip).map((r) => text(e, r.title))).toEqual(['Hind · 18-month visit', 'Maitha · IFHAS', 'Khalid · IFHAS screening', 'Amna · HbA1c, 6 weeks early', 'Saeed · at his diabetes visit', 'Sultan · Wednesday evening'])
    expect(e.items(trip).map((r) => r.at)).toEqual([0, 15, 30, 45, 4380, 6360])
    const g = make('family')
    g.setProfile('hind', 'ageM', 72)
    g.setProfile('hind', 'overdueW', 0)
    g.famAct('book_hind')
    expect(text(g, g.items(g.steps()[1])[0].title)).toBe('Hind · 6-year visit')
  })
})

describe('FRES: where each family result goes', () => {
  for (const k of Object.keys(oracle.fam) as (keyof typeof oracle.fam)[]) {
    test.each((oracle.fam[k] as { v: number; r: [string, string, string | null] }[]).map((o) => [`${k} ${o.v}`, o] as const))('%s matches the prototype', (_n, o) => {
      const r = routeFamilyResult(k, o.v)
      expect(r.b).toBe(o.r[0])
      expect(t(r.text.k)).toBe(o.r[1])
      expect(t(r.low.k)).toBe(o.r[1].toLowerCase())
      expect(r.team ? t(r.team.k) : null).toBe(o.r[2])
      // the "Used in his heart risk" results are not findings of their own
      expect(r.used).toBe(/heart risk/.test(o.r[1]))
    })
  }
  test('the result inputs, their owners and their ranges are the prototype\'s', () => {
    expect(Object.fromEntries(Object.entries(FAMILY_RESULTS).map(([k, r]) => [k, { who: r.who, def: r.def, min: r.min, max: r.max, step: r.step }]))).toEqual(oracle.famRes)
    expect(Object.fromEntries(Object.entries(FAMILY_RESULTS).map(([k, r]) => [k, [r.def, r.min, r.max, r.step]]))).toEqual({
      hind: [2, 0, 30, 1], maitha_a1c: [5.4, 4.5, 12, 0.1], khalid_a1c: [6.1, 4.5, 12, 0.1], khalid_tc: [6.4, 3, 10, 0.1], khalid_hdl: [0.9, 0.5, 2.5, 0.1], khalid_sbp: [142, 100, 190, 1],
      amna_a1c: [6, 4.5, 12, 0.1], saeed_acr: [4.2, 0, 30, 0.1], sultan_sbp: [126, 100, 170, 1],
    })
    expect(() => routeFamilyResult('hamdan', 1)).toThrow()
  })
})

describe('results: routes, heart risk, connections C4 and C5, badges', () => {
  test('with the default results: who is referred, the heart risk goes to the doctor, C5 and three badges appear', () => {
    const e = allBooked()
    e.famSendResults()
    const F = e.S.fm!
    expect(Object.fromEntries(Object.entries(F.routes).map(([k, r]) => [k, r.b]))).toEqual({
      hind: 'refer', maitha_a1c: 'ok', khalid_a1c: 'refer', khalid_tc: 'ok', khalid_hdl: 'ok', khalid_sbp: 'ok', amna_a1c: 'refer', saeed_acr: 'refer', sultan_sbp: 'ok',
    })
    // Moza was not accepted here, so she is still on her alert
    expect(F.status).toEqual({ moza: 'alert', saeed: 'care', khalid: 'care', amna: 'care', maitha: 'ok', sultan: 'ok', hind: 'care', hamdan: 'ok' })
    expect(F.conn).toEqual(['C1', 'C7', 'C2', 'C3', 'C6', 'C8', 'C5']) // C8 from Sultan's booking; no C4: his total cholesterol is 6.4, below 7.5
    expect(F.badges).toEqual(['hamdan', 'trip', 'first', 'sultan', 'plan', 'hind8', 'heart'])
    expect(F.alerts.slice(0, 6).map((a) => a.id)).toEqual(['c5', 'fc_khalid', 'fc_saeed', 'r_saeed_acr', 'r_amna_a1c', 'r_khalid_a1c'])
    expect(logs(e)).toContain('Noa Forecast · Khalid recalculated with cholesterol: 26% (high), heart age 77')
    expect(logs(e)).toContain('Noa Forecast · Khalid: 10-year heart risk 26% (high) → routed to the family doctor')
    expect(logs(e)).toContain('Noa Forecast · Saeed: 10-year heart risk 40% (high) → routed to the family doctor')
    // Khalid's own cholesterol and blood pressure went into his profile
    expect(F.prof.khalid).toMatchObject({ tc: 6.4, hdl: 0.9, sbp: 142 })
    // one P9 alert per referral, plus the two F1 heart-risk alerts, all routed
    expect(e.db.alerts.map((a) => a.rule)).toEqual(['P9', 'P9', 'P9', 'P9', 'F1', 'F1'])
    expect(text(e, e.db.alerts[4].finding)).toBe('10-year heart risk 40% (Framingham, with cholesterol)')
    expect(text(e, e.db.alerts[4].team)).toBe('Diabetes clinic · Capital General Hospital')
    expect(text(e, e.db.alerts[5].team)).toBe('Family doctor · Dr Aisha Al Hosani')
    // Khalid's HbA1c 6.1 is prediabetes: the teach-back is the referral one, with his HbA1c
    expect(e.S.teachKey).toBe('prev_ref')
    expect(e.S.pk).toBe('khalid')
    expect(e.S.resVal).toBe(6.1)
    e.next(); e.settle()
    expect(e.cur().kind).toBe('teach')
    // the follow-up lists each referral, the heart-risk row, the connection and the passport
    const fu = e.steps()[4]
    expect(e.items(fu).map((r) => text(e, r.title))).toEqual(['Hind · hearing test', 'Khalid · doctor review', 'Khalid · heart risk', 'Amna · lifestyle programme', 'Saeed · kidney protection', 'Family plan', 'Passport'])
  })
  test('Khalid at HbA1c 7.4 is in the diabetes range; total cholesterol 7.5 or more suggests family testing (C4)', () => {
    const e = allBooked()
    e.setFamResult('khalid_a1c', 7.4)
    e.setFamResult('khalid_tc', 7.5)
    e.famSendResults()
    const F = e.S.fm!
    expect(F.routes.khalid_a1c.b).toBe('refer')
    expect(F.routes.khalid_tc.b).toBe('refer')
    expect(F.conn).toEqual(['C1', 'C7', 'C2', 'C3', 'C6', 'C8', 'C4', 'C5'])
    expect(F.alerts.find((a) => a.id === 'c4')!.who).toBe('maitha')
    expect(F.prof.khalid).toMatchObject({ tc: 7.5, dm: true })
    expect(e.S.teachKey).toBe('dm')
    expect(logs(e)).toContain('Noa Insight · new family connection: Khalid’s very high cholesterol → tests for Maitha and Sultan')
    expect(text(e, e.curExplain()!.explain)).toContain('your HbA1c is 7.4%')
  })
  test('healthy results: no referral, no connection, no heart-risk alert, next checks in the passport', () => {
    const e = allBooked()
    e.setFamResult('hind', 10)
    for (const k of ['maitha_a1c', 'khalid_a1c', 'amna_a1c']) e.setFamResult(k, 5.0)
    e.setFamResult('saeed_acr', 1)
    e.setFamResult('khalid_tc', 4.5)
    e.setFamResult('khalid_hdl', 1.5)
    e.setFamResult('khalid_sbp', 120)
    // Saeed's own heart risk is high regardless of his urine test: he is still routed (a booked member with a high score)
    e.famSendResults()
    const F = e.S.fm!
    expect(Object.values(F.routes).every((r) => r.b === 'ok')).toBe(true)
    expect(F.status).toMatchObject({ hind: 'ok', maitha: 'ok', khalid: 'ok', amna: 'ok', sultan: 'ok' })
    expect(F.conn).toEqual(['C1', 'C7', 'C2', 'C3', 'C6', 'C8'])
    expect(F.alerts.some((a) => a.id === 'fc_khalid')).toBe(false)
    expect(F.alerts.some((a) => a.id === 'fc_saeed')).toBe(true)
    expect(F.status.saeed).toBe('care')
    expect(e.S.teachKey).toBe('prev_ok')
    expect(logs(e)).toContain('Noa Insight · Khalid: HbA1c 5 → healthy · passport')
    // the values that only feed the heart score are not logged as findings
    expect(logs(e).some((l) => l.includes('total cholesterol'))).toBe(false)
  })
  test('only Saeed is booked: only his result is routed, and no Khalid recalculation happens', () => {
    const e = make('family')
    e.famAct('book_saeed')
    e.next(); e.settle()
    toStep(e, 'famresult')
    e.famSendResults()
    const F = e.S.fm!
    expect(Object.keys(F.routes)).toEqual(['saeed_acr'])
    expect(F.conn).not.toContain('C5')
    expect(F.prof.khalid).toMatchObject({ tc: null, hdl: null })
    expect(F.badges).not.toContain('hind8')
    expect(F.badges).not.toContain('heart') // Khalid still has no cholesterol
    expect(S_teach(e)).toBe('prev_ok')
  })
  test('sending twice does nothing', () => {
    const e = allBooked()
    e.famSendResults()
    const n = e.logs.length
    e.famSendResults()
    expect(e.logs).toHaveLength(n)
  })
})
const S_teach = (e: TestCaseEngine) => e.S.teachKey
