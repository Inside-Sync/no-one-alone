import { BARRIERS, ENABLER, PERSON_IDS, PEOPLE, PV, RULES_P } from '@/features/testcase/data'
import { dueNow, ifhasItems, routeResult, type CaseId, type PvId } from '@/features/testcase/engine'
import { runAutoStep } from '@/features/testcase/engine/autopilot'
import type { TestCaseEngine } from '@/features/testcase/engine'
import oracle from './fixtures/prototype-oracle.json'
import { make, t, text } from './helpers'

/** `fixtures/prototype-oracle.json` was produced by calling the prototype's own functions (dueNow, route, ifhasItems). */
type OracleDue = { ck: PvId; age: number; nat: string; d: { ok: boolean; item?: string; why?: string; list?: string[] } }

const who = (ck: PvId) => ({ wellchild: 'hind', ifhas: 'khalid', expat: 'arjun', bone: 'hamad' })[ck] as keyof typeof PEOPLE
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Step the autopilot until the current step is `kind` and not done. */
function advanceTo(e: TestCaseEngine, kind: string) {
  for (let i = 0; i < 200; i++) {
    e.drain()
    if (e.cur().kind === kind && !e.S.done[e.S.step]) return
    if (runAutoStep(e)) throw new Error('autopilot stopped before ' + kind)
  }
  throw new Error('no step of kind ' + kind)
}

describe('P1 and P2: eligible and due, or nothing to nudge', () => {
  test.each((oracle.due as OracleDue[]).map((o) => [`${o.ck} age ${o.age} ${o.nat}`, o] as const))('dueNow %s matches the prototype', (_n, o) => {
    const e = make(o.ck)
    const p = PEOPLE[who(o.ck)]
    const inp = { ...PV[o.ck].inp, age: o.age, nat: o.nat as 'Emirati' | 'Expatriate' }
    const d = dueNow(o.ck, inp, p.id)
    expect(d.ok).toBe(o.d.ok)
    const tmpl = (s: string) => s.replace('{n}', text(e, { k: p.t.n! })).replace('{Her}', p.sex === 'M' ? 'His' : 'Her').replace('{her}', p.sex === 'M' ? 'his' : 'her')
    if (d.ok) {
      expect(text(e, d.item)).toBe(o.d.item)
      expect(d.list.map((x) => text(e, x))).toEqual(o.d.list)
    } else expect(text(e, d.why)).toBe(tmpl(o.d.why!))
  })
  test.each(oracle.ifhas.map((o) => [`${o.sex} ${o.age}`, o] as const))('IFHAS groups for %s match the prototype', (_n, o) => {
    expect(ifhasItems(o.age, o.sex as 'M' | 'F').map((x) => t(x.k))).toEqual(o.l)
  })

  test('nothing is due: P2, no journey, the passport shows only what applies', () => {
    const e = make('expat')
    e.setInput('age', 80) // months: older than 6 years
    e.checkPassport()
    expect(e.S.dec).toMatchObject({ rule: 'P2', path: null })
    expect(e.S.phase).toBe('decided')
    expect(e.canNext()).toBe(false)
    expect(e.prevChecks().map((c) => text(e, c))).toEqual(['Checked eligibility before sending anything', 'No nudge for a programme that doesn’t apply'])
    expect(text(e, e.db.audit.at(-1)!.event)).toBe('P2')
  })
  test('eligible and due: P1 asks one question instead of another reminder', () => {
    const e = make('wellchild')
    e.checkPassport()
    expect(e.S.phase).toBe('ask')
    expect(text(e, e.S.due!.item)).toBe('18-month visit (8 of 14)')
    const log = e.logs.map((l) => text(e, l.tx))
    expect(log).toContain('Noa Voice → Maitha: one question to find the barrier, instead of reminder 4')
    expect(log).toContain('Noa Guardian · 18-month visit (8 of 14), overdue 3 weeks · 3 reminders already sent')
    expect(RULES_P.map((r) => r.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'F1', 'F2'])
  })
  test('the inputs only change before the check', () => {
    const e = make('ifhas')
    e.setNationality('Expatriate')
    e.checkPassport()
    expect(e.S.dec?.rule).toBe('P2')
    e.setInput('age', 50)
    expect((e.S.inp as { age: number }).age).toBe(47)
  })
})

describe('the barrier chooses the support (rules P3 to P8)', () => {
  const EXPECT: Record<string, [string, string]> = {
    awareness: ['P3', 'Know what is due'],
    access: ['P4', 'Easy access and booking'],
    trust: ['P5', 'Trusted, culturally appropriate engagement'],
    value: ['P6', 'Personalised outreach'],
    forgot: ['P7', 'One reminder is enough'],
    decline: ['P8', 'Respect the choice'],
  }
  test('six barriers, six enablers', () => {
    expect(BARRIERS.map((b) => b.id)).toEqual(Object.keys(EXPECT))
    for (const [k, [rule, name]] of Object.entries(EXPECT)) {
      expect(ENABLER[k].rule).toBe(rule)
      expect(t(ENABLER[k].name)).toBe(name)
    }
  })
  test.each(Object.entries(EXPECT))('%s -> %s %s', (k, [rule, name]) => {
    const e = make('ifhas')
    e.checkPassport()
    e.chooseBarrier(k)
    expect(e.S.dec?.rule).toBe(rule)
    expect(text(e, e.S.dec!.name)).toBe(name)
    expect(e.S.phase).toBe('decided')
    if (k === 'decline') {
      expect(e.S.dec?.path).toBeNull()
      expect(e.S.path).toBeNull()
      expect(e.steps()).toHaveLength(1)
      expect(text(e, e.S.dec!.why)).toBe('Khalid said not now. Noa records the choice, sends no more reminders for 3 months, and keeps it in the passport for whenever Khalid is ready.')
      expect(e.db.tasks.map((r) => text(e, r.result))).toContain('no reminders until 18 Jan')
      expect(e.prevChecks().map((c) => text(e, c))).toContain('Choice recorded: no more nudges for 3 months')
      return
    }
    expect(e.S.dec?.path).toBe('prev')
    expect(e.S.path).toBe('prev')
    expect(e.steps()).toHaveLength(8)
    expect(e.db.alerts[0]).toMatchObject({ level: 'amber' })
    expect(text(e, e.db.alerts[0].rule)).toBe(`${rule} ${name}`)
    expect(text(e, e.db.alerts[0].finding)).toBe('IFHAS screening (3 groups due) due')
    expect(e.prevChecks().map((c) => text(e, c))).toContain(`Matched the support to the barrier: ${name}`)
  })
  test('"Book it · one tap" books through the engine without logging an invented answer', () => {
    const e = make('ifhas')
    e.oneTapBook()
    expect(e.S.dec?.path).toBe('prev')
    expect(e.S.noaPicked).toBe(true)
    expect(e.getSnapshot().log.some((l) => l.m === 'ANSWER')).toBe(false)
    expect(e.getSnapshot().log.some((l) => l.m === 'ROUTE')).toBe(true)
    const a = make('ifhas'); a.checkPassport(); a.chooseBarrier('value')
    expect(a.S.noaPicked).toBe(false)
    expect(a.getSnapshot().log.some((l) => l.m === 'ANSWER')).toBe(true)
  })
  test('the slot and the voice line follow the barrier', () => {
    const e = make('ifhas')
    e.checkPassport()
    e.chooseBarrier('value')
    expect(text(e, e.ctx().voice as never)).toBe(
      'Your blood pressure has been creeping up on your cuff, you smoke, your mother had a stroke and your father a heart attack at 62. Noa Forecast puts your heart risk at about 1 in 5 over 10 years, rising if nothing changes. These checks find problems years before you feel anything. 15 minutes, right after Hind’s visit. Shall I book Saturday 09:30 at Al Khalidiya Family Health Centre, right after Hind’s visit: 15 minutes, fasting blood test?',
    )
    const e2 = make('expat')
    e2.checkPassport()
    e2.chooseBarrier('awareness')
    expect(text(e2, e2.ctx().voice as never)).toBe(
      'Here is what is due and why, in plain words: 4-month visit · growth, development, vaccines. I can book Tuesday 10:00 at Mussafah Family Health Centre, 1 km away; Noa explains the 14 visits in English.',
    )
    const e3 = make('wellchild')
    e3.checkPassport()
    e3.chooseBarrier('trust')
    expect(text(e3, e3.ctx().voice as never)).toBe('Would Thursday 17:30 with a female doctor, Dr Aisha Al Hosani, in Arabic suit you? You are welcome to bring someone with you.')
  })
  test('an unknown phase ignores the barrier', () => {
    const e = make('ifhas')
    e.chooseBarrier('value')
    expect(e.S.dec).toBeNull()
  })
  test('checklist counts the reminders already sent', () => {
    const e = make('wellchild')
    e.checkPassport()
    e.chooseBarrier('access')
    const c = e.prevChecks().map((x) => text(e, x))
    expect(c[0]).toBe('Asked about the barrier after 3 reminders instead of sending reminder 4')
    expect(c).toContain('One trip for the family: Khalid’s overdue screening booked 30 minutes later')
    const none = make('expat')
    none.checkPassport()
    none.chooseBarrier('awareness')
    expect(none.prevChecks().map((x) => text(none, x))[0]).toBe('Asked about the barrier before any reminder')
    expect(none.prevChecks().map((x) => text(none, x))).toContain('Did not nudge Priya or Vikram for IFHAS: it is for Emiratis aged 18–75')
    const one = make('ifhas')
    one.setInput('rem', 1)
    one.checkPassport()
    one.chooseBarrier('value')
    expect(one.prevChecks().map((x) => text(one, x))[0]).toBe('Asked about the barrier after 1 reminder instead of sending reminder 2')
  })
})

describe('P9: a result outside the healthy range goes to the right team', () => {
  for (const pv of Object.keys(oracle.routes) as PvId[]) {
    test.each((oracle.routes[pv as keyof typeof oracle.routes] as { v: number; r: { b: string; t: string; team?: string; next?: string; teach: string } }[]).map((o) => [`${pv} ${o.v}`, o] as const))('%s matches the prototype', (_n, o) => {
      const r = routeResult(pv, o.v)
      expect(r.b).toBe(o.r.b)
      expect(t(r.t.k)).toBe(o.r.t)
      expect(t(r.tCap.k)).toBe(cap1(o.r.t))
      expect(r.team ? t(r.team.k) : undefined).toBe(o.r.team)
      expect(r.next ? t(r.next.k) : undefined).toBe(o.r.next)
      expect(r.teach).toBe(o.r.teach)
    })
  }
  test.each([['wellchild'], ['ifhas'], ['expat'], ['bone']] as const)('%s: the default result and the whole journey', (ck) => {
    const { e } = (() => {
      const eng = make(ck as CaseId)
      eng.checkPassport()
      eng.chooseBarrier(PV[ck].barrier)
      return { e: eng }
    })()
    advanceTo(e, 'result')
    const def = PV[ck].result.def
    expect(e.S.resVal).toBe(def)
    e.sendResult()
    expect(e.S.branch).toBe(ck === 'expat' ? 'ok' : 'refer')
    expect(e.S.teachKey).toBe({ wellchild: 'child_speech', ifhas: 'dm', expat: 'prev_ok', bone: 'bone' }[ck])
    if (ck === 'expat') {
      // healthy: the "From result to care" step has nothing to do and marks itself done
      e.next()
      expect(e.cur().kind).toBe('refer')
      expect(e.S.done[e.S.step]).toBe(true)
      return
    }
    advanceTo(e, 'refer')
    e.referAct()
    expect(e.S.done[e.S.step]).toBe(true)
    expect(text(e, e.db.tasks.at(-1)!.result)).toBe(t(PV[ck].refer))
  })
  test('a healthy result: nothing to refer, the step marks itself done, the passport keeps the next check', () => {
    const e = make('ifhas')
    e.checkPassport()
    e.chooseBarrier('value')
    advanceTo(e, 'result')
    e.setResVal(5.2)
    e.sendResult()
    expect(e.S.branch).toBe('ok')
    expect(e.db.alerts.some((a) => (a.rule as string) === 'P9')).toBe(false)
    expect(e.logs.map((l) => text(e, l.tx))).toContain('Noa Insight · HbA1c 5.2 → healthy · passport: the next IFHAS check in 3 years')
    advanceTo(e, 'teach')
    expect(e.S.step).toBe(5)
    expect(text(e, e.curExplain()!.explain)).toBe('Khalid, your results are in the healthy range. Noa added the next IFHAS check in 3 years to the Family Health Passport and will send one reminder before it. You can change or cancel it any time.')
  })
  test('a referred result: the team gets an alert, accepts it, and the explanation names the finding', () => {
    const e = make('ifhas')
    e.checkPassport()
    e.chooseBarrier('value')
    advanceTo(e, 'result')
    e.setResVal(6.0)
    e.sendResult()
    expect(e.S.route?.teach).toBe('prev_ref')
    const alert = e.db.alerts.at(-1)!
    expect(text(e, alert.finding)).toBe('Prediabetes: the healthy lifestyle programme')
    expect(text(e, alert.team)).toBe('Healthy lifestyle programme')
    expect(text(e, alert.status)).toBe('new')
    advanceTo(e, 'refer')
    e.referAct()
    expect(e.db.alerts.at(-1)!.status).toMatchObject({ k: 'status.accepted' })
    advanceTo(e, 'teach')
    expect(text(e, e.curExplain()!.explain)).toContain('your result needs a closer look: prediabetes: the healthy lifestyle programme. It is not an emergency. Noa booked it with Healthy lifestyle programme')
  })
  test('every person in the data has a hospital and the picker order of the prototype', () => {
    expect(PERSON_IDS).toEqual(['moza', 'hessa', 'saeed', 'mariam', 'hind', 'khalid', 'arjun', 'hamad', 'amna'])
  })
})
