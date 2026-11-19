import { CASES, CASE_GROUPS, JOURNEYS, REPORT } from '@/features/testcase/data'
import { DB_TABLES, TestCaseEngine, famScore, runAutopilot, type CaseId } from '@/features/testcase/engine'
import runs from './fixtures/prototype-runs.json'
import { computeKpis } from '@/features/testcase/ui/judges/kpis'
import { auto, make, t, text } from './helpers'

/**
 * Every one of the ten cases, default inputs, "Run it for me". `fixtures/prototype-runs.json` is what the prototype
 * (new3.html) showed after the same run in a browser: stepper, table sizes, the event log and the rows of the demo database.
 * The engine must give the same, line for line.
 */
// 998 now: the emergency journeys call 998 and the family in the same minute, unlike the prototype.
const IDS = ['family', 'wellchild', 'ifhas', 'expat', 'bone', 'stroke', 'fall', 'hypo', 'hf', 'own'] as const
type Run = { steps: string[]; db: Record<string, number>; log: string[]; rows: Record<string, string[]>; kpi: string[] }
const RUNS = runs as unknown as Record<CaseId, Run>

/** Key outcomes of each run: decision rule, the path, where it ended, the clocks. */
const OUTCOME: Record<CaseId, Record<string, unknown>> = {
  family: { rule: undefined, path: 'fam', last: 5, teachKey: 'prev_ref', score: 91 },
  wellchild: { rule: 'P4', name: 'Easy access and booking', path: 'prev', last: 7, branch: 'refer', teachKey: 'child_speech' },
  ifhas: { rule: 'P6', name: 'Personalised outreach', path: 'prev', last: 7, branch: 'refer', teachKey: 'dm' },
  expat: { rule: 'P3', name: 'Know what is due', path: 'prev', last: 7, branch: 'ok', teachKey: 'prev_ok' },
  bone: { rule: 'P4', name: 'Easy access and booking', path: 'prev', last: 7, branch: 'refer', teachKey: 'bone' },
  stroke: { rule: 'R5', name: 'Emergency: possible stroke', path: 'stroke_em', last: 8, why1: 'R1', tTrig: 91, tCheck: 92, tAct: 94 },
  fall: { rule: 'R7', name: 'Emergency: fall, can’t get up', path: 'fall_em', last: 8, why1: 'R2', tTrig: 197, tCheck: 198, tAct: 200 },
  hypo: { rule: 'R9', name: 'Low sugar, treated at home', path: 'hypo_home', last: 6, why1: 'R3', tTrig: 170, tCheck: 171, tAct: 173 },
  hf: { rule: 'R10', name: 'Fluid build-up: same-day nurse', path: 'hf_clinic', last: 6, why1: 'R4', tTrig: 500, tCheck: 501, tAct: 503 },
  own: { rule: 'R12', name: 'No action', path: null, last: 0 },
}

describe.each(IDS)('case %s', (id) => {
  const { e, ticks } = auto(id)
  const P = RUNS[id]

  test('the autopilot finishes and stops by itself', () => {
    expect(e.S.auto).toBe(false)
    expect(ticks).toBeGreaterThan(1)
    expect(e.busy).toBe(false)
    expect(e.autoStep()).toBeNull()
  })
  test('the decision, the path and where it ends', () => {
    const o = OUTCOME[id]
    expect(e.S.dec?.rule).toBe(o.rule)
    if (o.name) expect(text(e, e.S.dec!.name)).toBe(o.name)
    expect(e.S.path).toBe(o.path)
    expect(e.S.step).toBe(o.last)
    for (const k of ['why1', 'tTrig', 'tCheck', 'tAct', 'branch', 'teachKey'] as const) if (k in o) expect(e.S[k]).toBe(o[k])
    if (id === 'family') expect(famScore(e.S.fm!)).toBe(91)
    if (o.last) for (let i = 1; i <= (o.last as number); i++) expect(e.S.done[i]).toBe(true)
  })
  test('the journey: same steps as the prototype', () => {
    const got = e.steps().map((s, i) => `${i + 1} · ${text(e, { k: s.label })}${text(e, { k: s.title })}`)
    expect(got).toEqual(P.steps)
    const def = CASES[id]
    if (def.type === 'safety' && e.S.path && e.S.path !== 'fam' && e.S.path !== 'prev') expect(e.steps()).toHaveLength(1 + JOURNEYS[e.S.path].steps.length)
  })
  test('the demo database: same table sizes as the prototype', () => {
    expect(Object.fromEntries(DB_TABLES.map((k) => [k, e.db[k].length]))).toEqual(P.db)
  })
  test('the event log: same lines, same order', () => {
    expect(e.logs.slice(0, 60).map((l) => `${l.t}${l.m}${text(e, l.tx)}`)).toEqual(P.log)
  })
  test('the demo database: same rows', () => {
    for (const k of Object.keys(P.rows)) {
      const mine = e.db[k as keyof typeof e.db].map((r) => Object.values(r).map((v) => text(e, v)).join('|')).reverse().slice(0, 40)
      // the prototype printed the raw "{her}" in one audit detail of the "own" case; the engine fills it
      const theirs = P.rows[k].map((r) => r.replace('{her}', 'her'))
      expect(mine).toEqual(theirs)
    }
  })
  test('the Department report: same figures as the prototype', () => {
    if (!P.kpi.length) return
    const R0 = REPORT[e.meta().report]
    expect(R0.kpi.map((k) => `${t(k.label)}${t(k.value)}${k.note ? text(e, { k: k.note }) : ''}`)).toEqual(P.kpi)
  })
})

describe('the picker', () => {
  test('ten cases in three groups, in the prototype\'s order', () => {
    expect(CASE_GROUPS.map((g) => [g.id, g.cases])).toEqual([
      ['start', ['family', 'stroke', 'ifhas']],
      ['prevention', ['wellchild', 'expat', 'bone']],
      ['safety', ['fall', 'hypo', 'hf', 'own']],
    ])
    expect(Object.keys(CASES)).toHaveLength(10)
  })
  test('case titles and teasers', () => {
    expect(Object.values(CASES).map((c) => t(c.title))).toEqual([
      'The whole family', 'Well-child visit overdue', 'Adult screening never done', 'New to Abu Dhabi', 'Bone and memory check',
      'Stroke at night', 'Fall in the night', 'Low sugar at night', 'Fluid build-up', 'Enter your own',
    ])
  })
  test('every case starts clean and loads its person', () => {
    for (const id of IDS) {
      const e = make(id)
      expect(e.S.ck).toBe(id)
      expect(e.S.step).toBe(0)
      expect(e.S.phase).toBe('setup')
      expect(e.logs).toHaveLength(1)
      expect(e.logs[0].m).toBe('START')
      expect(e.db.agents).toHaveLength(9)
      expect(e.db.audit).toHaveLength(1)
      expect(text(e, e.db.audit[0].detail)).toContain(t(CASES[id].title))
    }
  })
})

describe('night mode', () => {
  test('the stroke case is dark from the first minute of playback to the discharge, then light', () => {
    const e = make('stroke')
    expect(e.night).toBe(false)
    e.play()
    expect(e.night).toBe(true)
    e.setAuto(true)
    const nightAt: Record<number, boolean> = {}
    for (let k = 0; k < 500 && e.S.auto; k++) {
      e.drain()
      nightAt[e.S.step] = e.night
      e.autoStep()
    }
    expect(Object.keys(nightAt)).toHaveLength(9)
    // steps 0..3 are night (nightUntil 3), the rest are not
    expect([0, 1, 2, 3].map((i) => nightAt[i])).toEqual([true, true, true, true])
    expect([4, 5, 6, 7, 8].map((i) => nightAt[i])).toEqual([false, false, false, false, false])
  })
  test('daytime cases are never dark; "own" is dark only when started at night', () => {
    expect(auto('hf').e.night).toBe(false)
    const own = make('own')
    own.setStart(490)
    own.setInput('hr', 138); own.setInput('dur', 12)
    own.play()
    expect(own.night).toBe(false)
    const night = make('own')
    night.play()
    expect(night.night).toBe(true)
  })
})

describe('journeys of the safety cases', () => {
  test('the seven journeys and their step kinds', () => {
    const kinds = (id: keyof typeof JOURNEYS) => JOURNEYS[id].steps.map((s) => s.kind)
    expect(kinds('stroke_em')).toEqual(['tl', 'btn', 'tl', 'tl', 'teach', 'daily', 'accept', 'report'])
    expect(kinds('fall_em')).toEqual(['tl', 'btn', 'tl', 'tl', 'teach', 'daily', 'accept', 'report'])
    expect(kinds('fall_minor')).toEqual(['tl', 'btn', 'daily', 'accept', 'report'])
    expect(kinds('hypo_home')).toEqual(['recheck', 'btn', 'teach', 'daily', 'accept', 'report'])
    expect(kinds('hypo_em')).toEqual(['tl', 'btn', 'tl', 'teach', 'daily', 'accept', 'report'])
    expect(kinds('hf_clinic')).toEqual(['btn', 'tl', 'teach', 'daily', 'accept', 'report'])
    expect(kinds('hf_em')).toEqual(['tl', 'btn', 'tl', 'teach', 'daily', 'accept', 'report'])
    expect(Object.values(JOURNEYS).map((j) => [j.id, j.nightUntil])).toEqual([
      ['stroke_em', 3], ['fall_em', 3], ['fall_minor', 1], ['hypo_home', 1], ['hypo_em', 3], ['hf_clinic', -1], ['hf_em', -1],
    ])
  })
  test('every emergency journey calls 998 first, at the decision', () => {
    for (const id of ['stroke_em', 'fall_em', 'hypo_em', 'hf_em'] as const) {
      const items = JOURNEYS[id].steps[0].items!
      expect(items.findIndex((it) => t(it.title).includes('998'))).toBe(0)
      expect(items[0].at).toBe(0)
    }
  })
  test('every emergency journey wakes the first family member at the decision, with 998', () => {
    for (const id of ['stroke_em', 'fall_em', 'hypo_em', 'hf_em'] as const) {
      const f1 = JOURNEYS[id].steps[0].items!.find((it) => /^Responder (calls|wakes) \{\{f1\}\}$/.test(t(it.title)))
      expect(f1?.at, id).toBe(0)
    }
  })
  test('the stroke run stamps the 998 call at the decision', () => {
    const { e } = auto('stroke')
    expect(e.db.audit.find((r) => text(e, r.event) === '998 call')?.at).toBe('15 Oct 01:34')
  })
  test('the stroke packet depends on the blood thinner: Moza has none, Hessa takes apixaban', () => {
    const moza = make('stroke')
    const rows = (e: TestCaseEngine, i: number) => e.packet(JOURNEYS.stroke_em.steps[i]).map((r) => `${text(e, r.title)}: ${text(e, r.detail)}`)
    expect(rows(moza, 1)).toContain('Blood thinners: None')
    const treat = moza.items(JOURNEYS.stroke_em.steps[2]).map((r) => text(moza, r.title))
    expect(treat).toEqual(['Arrival · NIHSS 6', 'CT head and CT angiogram', 'Tenecteplase', 'NIHSS 3'])
    const hessa = make('own')
    hessa.setPerson('hessa')
    expect(rows(hessa, 1)).toContain('Blood thinners: Apixaban: clot-busting medicine not safe, consider clot retrieval')
    expect(hessa.items(JOURNEYS.stroke_em.steps[2]).map((r) => text(hessa, r.title))[2]).toBe('Clot retrieval (thrombectomy)')
    expect(hessa.items(JOURNEYS.stroke_em.steps[3]).map((r) => text(hessa, r.detail))[1]).toBe('Known atrial fibrillation; apixaban levels checked.')
    expect(moza.items(JOURNEYS.stroke_em.steps[3]).map((r) => text(moza, r.detail))[1]).toBe('Paroxysmal atrial fibrillation found. Stroke-risk score (CHA₂DS₂-VASc) 6.')
    expect(hessa.items(JOURNEYS.stroke_em.steps[2])[2].at).toBe(25)
    expect(moza.items(JOURNEYS.stroke_em.steps[2])[2].at).toBe(28)
  })
  test('the low-sugar recheck: two rechecks under 4.0 hand over to 998 (R6)', () => {
    const e = make('hypo')
    e.play(); e.drain()
    e.sampleSpeech('usual'); e.answer('drink')
    expect(e.S.dec?.rule).toBe('R9')
    e.settle(); e.next(); e.settle()
    expect(e.cur().kind).toBe('recheck')
    const tAct = e.S.tAct!
    e.setRecheckVal(3.2)
    e.recheck()
    expect(e.S.rc.n).toBe(1)
    expect(e.S.done[e.S.step]).toBeFalsy()
    expect(text(e, e.logs[0].tx)).toBe('Noa Coach · recheck 3.2 mmol/L → still low: another 15 g, check again in 15 min')
    e.recheck()
    expect(e.S.dec).toMatchObject({ rule: 'R6', path: 'hypo_em', escalated: true })
    expect(e.S.path).toBe('hypo_em')
    expect(e.S.tAct).toBe(tAct + 30)
    expect(e.S.done).toEqual({})
    expect(e.decisionChecks().map((c) => text(e, c))).toContain('Two rechecks stayed below 4.0, so Responder called 998 at once')
    expect(e.decisionChecks().map((c) => text(e, c))).toContain('998 called at 03:23, 0 min after the second low recheck (target ≤ 3)')
    expect(computeKpis(e).to998).toEqual({ state: 'ready', a: 0, b: 1 })
    expect(e.db.alerts.at(-1)).toMatchObject({ level: 'red' })
    expect(e.cur().kind).toBe('tl')
  })
  test('a recheck of 4.0 or more recovers on the first try', () => {
    const e = make('hypo')
    e.play(); e.drain(); e.sampleSpeech('usual'); e.answer('drink'); e.settle(); e.next(); e.settle()
    e.setRecheckVal(4)
    e.recheck()
    expect(e.S.done[e.S.step]).toBe(true)
    expect(text(e, e.S.feed.at(-1)!.text)).toBe('Sugar back to 4. Saeed is eating a snack.')
  })
  test('the Monitor step: on target sends nothing, off target raises an alert that the clinic accepts', () => {
    const e = make('stroke')
    e.play(); e.drain(); e.sampleSpeech('slurred'); e.answer('none')
    e.setAuto(true)
    for (let k = 0; k < 200 && e.cur().kind !== 'daily'; k++) { e.drain(); e.autoStep() }
    e.setAuto(false); e.drain()
    expect(e.S.daily.val).toBeNull()
    e.sampleSpeech('usual')
    e.setDailyVal(120)
    e.sendDaily()
    expect(e.S.daily).toMatchObject({ sent: true, alert: false })
    expect(e.S.done[e.S.step]).toBe(true)
    // the accept step has nothing to act on and marks itself done
    e.next(); e.settle()
    expect(e.cur().kind).toBe('accept')
    expect(e.S.done[e.S.step]).toBe(true)

    const f = make('stroke')
    f.play(); f.drain(); f.sampleSpeech('slurred'); f.answer('none')
    f.setAuto(true)
    for (let k = 0; k < 200 && f.cur().kind !== 'daily'; k++) { f.drain(); f.autoStep() }
    f.setAuto(false); f.drain()
    f.sampleSpeech('usual')
    f.setDailyVal(131)
    f.sendDaily()
    expect(f.S.daily.alert).toBe(true)
    expect(text(f, f.db.alerts.at(-1)!.finding)).toBe('Blood pressure above target for 5 days: average 131 mmHg, with every dose taken')
    expect(text(f, f.db.alerts.at(-1)!.rule)).toBe('target under 130')
    f.next(); f.settle()
    expect(f.S.done[f.S.step]).toBeFalsy()
    expect(f.targetAlert()).toBeTruthy()
    f.accept()
    expect(text(f, f.db.alerts.at(-1)!.status)).toBe('accepted')
    expect(f.S.done[f.S.step]).toBe(true)
  })
  test('daily thresholds: stroke under 130, falls under 20, hypo 4.0 or above, heart failure up to +1.0', async () => {
    const { DAILY } = await import('@/features/testcase/data')
    const ok = (id: keyof typeof DAILY, v: number) => { const o = DAILY[id].ok; return o.op === 'lt' ? v < o.limit : o.op === 'gte' ? v >= o.limit : v <= o.limit }
    expect([ok('stroke', 129), ok('stroke', 130)]).toEqual([true, false])
    expect([ok('fall', 19), ok('fall', 20)]).toEqual([true, false])
    expect([ok('hypo', 3.9), ok('hypo', 4)]).toEqual([false, true])
    expect([ok('hf', 1), ok('hf', 1.1)]).toEqual([true, false])
  })
})

describe('runAutopilot', () => {
  test('is deterministic: two runs give the same log', () => {
    const a = new TestCaseEngine({ t, caseId: 'stroke' }), b = new TestCaseEngine({ t, caseId: 'stroke' })
    runAutopilot(a); runAutopilot(b)
    expect(a.logs).toEqual(b.logs)
    expect(a.S.read).toEqual(b.S.read)
  })
})
