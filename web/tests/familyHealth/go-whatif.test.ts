import { CHILD_FIELDS, PROFILES0, ZONE_COLOR, scenariosFor, trackStops, whatIfFields, zoneOf, type AdultProfile, type FamilyHealthEngine, type Txt } from '@/features/familyHealth'
import { T, TAR, drive, engine, of } from './helpers'

const adult = (k: 'saeed' | 'khalid' | 'moza' | 'amna') => PROFILES0[k] as AdultProfile
const idle = async (e: FamilyHealthEngine) => { await e.whenIdle(); return e.getSnapshot() }

describe('Noa stops at Detect (go card)', () => {
  test('urgent (s0): the prompt is sent and Noa waits; nothing past Detect runs by itself', async () => {
    const e = engine()
    void e.runTestCase('s0')
    const s = await idle(e)
    const c = s.pending
    expect(c?.type).toBe('go')
    if (c?.type !== 'go') return
    expect(c.urgent).toBe(true)
    expect(c.opts.map((o) => T(o.label))).toEqual(['Start the check now', 'Not now'])
    expect(T(c.msg)).toBe('Noa has sent Saeed a prompt on the phone and watch. Nothing happens until Saeed starts it.')
    expect(T(s.status.saeed.label)).toBe('Prompt sent · waiting')
    expect(s.status.saeed.tone).toBe('bad')
    expect(s.journey?.seen).toEqual(['detect'])
    expect(TAR(c.opts[0].label)).not.toBe('Start the check now')
  })
  test('urgent, "Start the check now": the journey goes on to Protect and Home screening', async () => {
    const e = engine()
    void e.runTestCase('s0')
    const c = (await idle(e)).pending
    expect(e.answer(c?.id as number, 'go')).toBe(true)
    const s = await idle(e)
    expect(s.journey?.seen).toEqual(['detect', 'protect', 'home'])
    expect(s.pending?.type).toBe('speech')
    expect(of(s.feed, 'me').map((m) => T(m.text))).toContain('Start the check now')
    expect(of(s.feed, 'card').map((x) => T(x.picked))[0]).toBe('Start the check now')
  })
  test('urgent, "Not now": rule U1, the alert stays open, status "Prompt pending"', async () => {
    const e = engine()
    void e.runTestCase('s0')
    const c = (await idle(e)).pending
    e.answer(c?.id as number, 'later')
    const s = await idle(e)
    expect(s.journey?.seen).toEqual(['detect'])
    expect(s.rulesHit.map((r) => r.rule)).toContain('U1')
    expect(of(s.feed, 'sys').map((x) => T(x.text)).at(-1)).toBe('Noa will ask again in 10 minutes. With an alert like this, if there is still no answer it tells the family contact (rule U1).')
    expect(T(s.status.saeed.label)).toBe('Prompt pending')
    expect(T(s.journey?.done as Txt)).toBe('Waiting for Saeed: the alert stays open and Noa asks again in 10 minutes.')
  })
  test('not urgent (Khalid): "Start home screening" / "Later"; Later is rule N3, door open', async () => {
    const e = engine()
    void e.startJourney('khalid')
    let s = await idle(e)
    const c = s.pending
    expect(c?.type === 'go' && [c.urgent, ...c.opts.map((o) => T(o.label))]).toEqual([false, 'Start home screening', 'Later'])
    expect(T(s.status.khalid.label)).toBe('Ready when you are')
    e.answer(c?.id as number, 'later')
    s = await idle(e)
    expect(s.rulesHit.map((r) => r.rule)).toContain('N3')
    expect(T(s.status.khalid.label)).toBe('Not now · door open')
    expect(T(s.journey?.done as Txt)).toBe('Not started: nothing booked, no reminders for 3 months unless something changes.')
  })
  test('a child: the parent starts it; Next starts it as "Started"', async () => {
    const e = engine()
    void e.startJourney('hind')
    const s = await idle(e)
    expect(s.pending?.type === 'go' && T(s.pending.who)).toBe('Amna')
    e.next()
    const s2 = await idle(e)
    expect(of(s2.feed, 'card').map((x) => T(x.picked))[0]).toBe('Started')
    expect(s2.journey?.seen).toContain('protect')
  })
  test('Moza: the speech check runs as a recovery check after her stroke, with no red-flag questions', async () => {
    const e = engine()
    void e.runTestCase('m1')
    const s = await drive(e)
    const plan = of(s.feed, 'vtplan')[0]
    expect(plan.use[0].id).toBe('speech')
    expect(T(plan.use[0].why)).toBe('After her stroke: checked against her own voice to follow recovery and catch a new stroke early')
    expect(of(s.feed, 'sys').map((x) => T(x.text))).toContain('Speech as usual for Moza (rule Q1). Saved to the recovery record for the speech therapist.')
    expect(of(s.feed, 'card').some((x) => x.card.type === 'choice' && x.card.qid === 'rf')).toBe(false)
  })
})

describe('Try it: what-if readings', () => {
  test('zones of the sliders match the prototype', () => {
    const f = whatIfFields('saeed', adult('saeed'))
    expect(f.map((d) => d.id)).toEqual(['hr', 'sbp', 'dbp', 'spo2', 'glu', 'irrAlerts', 'wt', 'age'])
    const hr = f[0], p = adult('saeed')
    expect([39, 40, 99, 100, 119, 120].map((v) => zoneOf(hr, v, p).zone)).toEqual(['bad', 'good', 'good', 'warn', 'warn', 'bad'])
    expect(T(zoneOf(hr, 128, p).text as Txt)).toBe('Racing · Noa checks now')
    expect(T(zoneOf(f.find((d) => d.id === 'wt')!, 88, p).text as Txt)).toBe('BMI 29.7 · diabetes risk test')
    expect(T(zoneOf(f.find((d) => d.id === 'age')!, 64, p).text as Txt)).toBe('Due by age: bowel test')
    expect(whatIfFields('khalid', adult('khalid')).some((d) => d.id === 'glu')).toBe(false)
    expect(T(zoneOf(CHILD_FIELDS[0], 17, { child: true, ageM: 17, overdueW: 0 }).text as Txt)).toBe('Next: 18-month visit')
  })
  test('the track gradient puts each zone colour at the middle of its visible part', () => {
    const hr = whatIfFields('saeed', adult('saeed'))[0]
    expect(trackStops(hr)).toEqual([
      { color: ZONE_COLOR.bad, at: 3.3 }, { color: ZONE_COLOR.good, at: 26.7 }, { color: ZONE_COLOR.warn, at: 53.3 }, { color: ZONE_COLOR.bad, at: 80 },
    ])
  })
  test('scenarios: BP crisis makes Noa ask for a doctor today; All normal puts the readings back', () => {
    const e = engine()
    expect(scenariosFor('khalid', adult('khalid'))).not.toContain('hypo')
    expect(scenariosFor('saeed', adult('saeed'))).toContain('hypo')
    e.applyScenario('khalid', 'bp')
    let w = e.whatIf('khalid')
    expect(w.child === false && [w.zone, T(w.kind), T(w.head), w.tags.map((t) => `${t.rule}:${t.zone}`)]).toEqual(['bad', 'Noa acts now', 'Noa asks for a doctor today, before any screening', ['B1:bad', 'K1:info']])
    e.applyScenario('khalid', 'normal')
    w = e.whatIf('khalid')
    expect(e.getSnapshot().profiles.khalid).toMatchObject({ sbp: adult('khalid').sbp, dbp: adult('khalid').dbp })
    expect(w.child === false && w.urgent).toBeNull()
  })
  test('editing a reading changes the answer; Reset puts the data back; a re-run uses the new data', async () => {
    const e = engine()
    expect(e.editProfile('saeed', 'hr', 128).ok).toBe(true)
    const w = e.whatIf('saeed')
    expect(w.child === false && T(w.head)).toBe('Noa checks on Saeed now: speech test, then a doctor today')
    expect(w.child === false && w.tests).toEqual(['speech', 'falls'])
    expect(w.child === false && w.heart.ok && Math.round(w.heart.r * 100)).toBe(44)
    void e.startJourney('saeed')
    const s = await idle(e)
    expect(s.journey?.urgent).toBe('G1')
    e.resetProfile('saeed')
    expect(e.getSnapshot().profiles.saeed).toEqual({ ...adult('saeed'), bmi: adult('saeed').bmi })
    expect(e.toggleProfile('saeed', 'cvd')).toBe(true)
    const w2 = e.whatIf('saeed')
    expect(w2.child === false && w2.heart.ok).toBe(false)
  })
  test('a child: overdue by 3 weeks makes Noa ask the parent why', () => {
    const e = engine()
    e.editProfile('hind', 'overdueW', 3)
    const w = e.whatIf('hind')
    expect(w.child && [w.zone, T(w.visit as Txt), T(w.text)]).toEqual(['bad', '18-month visit', 'Overdue 3 weeks: Noa asks Amna why, once, and offers a Saturday slot'])
  })
})
