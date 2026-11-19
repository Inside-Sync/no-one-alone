import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import en from '@/locales/en/testcase.json'
import ar from '@/locales/ar/testcase.json'
import { EMOJI } from '@/components/ui/emoji'
import * as data from '@/features/testcase/data'
import { CASES, JOURNEYS, PEOPLE, PV, STEP_ZERO, usedIcons, type JourneyId, type PersonId, type StepDef } from '@/features/testcase/data'
import { TestCaseEngine, clk, hm, passportKinds, resolveText, stepKinds, tx, type Txt } from '@/features/testcase/engine'
import i18n from '@/i18n'
import { DB_TABLES, type TFn } from '@/features/testcase/engine'
import { dbNoteKey } from '@/features/testcase/data'
import { auto, make, t, text } from './helpers'

const get = (o: unknown, key: string) => key.split('.').reduce<unknown>((x, s) => (x == null ? x : (x as Record<string, unknown>)[s]), o)

describe('data: every key exists, in both languages', () => {
  const keys = new Set<string>()
  const walk = (v: unknown) => {
    if (typeof v === 'string') { if (/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/.test(v)) keys.add(v) }
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  Object.values(data).forEach(walk)
  test('a few hundred keys are referenced by the data files', () => expect(keys.size).toBeGreaterThan(900))
  test('each one is a string in en and in ar', () => {
    const missing = [...keys].filter((k) => typeof get(en, k) !== 'string' || typeof get(ar, k) !== 'string')
    expect(missing).toEqual([])
  })
  test('every key the engine source writes exists too', () => {
    const dir = join(import.meta.dirname, '../../src/features/testcase/engine')
    const found = new Set<string>()
    for (const f of readdirSync(dir)) {
      const src = readFileSync(join(dir, f), 'utf8')
      for (const m of src.matchAll(/\b(?:T|tx)\(\s*'([A-Za-z0-9_.]+)'/g)) found.add(m[1])
      for (const m of src.matchAll(/'((?:actor|audit|checks|common|db|decision|family|feed|log|pipe|prevention|source|speech|status|teams|tokens)\.[A-Za-z0-9_.]+)'/g)) found.add(m[1])
    }
    const dynamic = [
      ...['guardian', 'voice', 'responder', 'courier', 'insight', 'forecast', 'coach', 'navigator', 'analyst', 'noa', 'system', 'hospital'].map((a) => `actor.${a}`),
      ...['new', 'accepted', 'bookingOffered', 'routed'].map((s) => `status.${s}`),
      ...['R1', 'R2', 'R3', 'R4'].map((r) => `reading.${r}`),
      ...['she', 'She', 'her', 'Her', 'herO'].flatMap((p) => [`tokens.${p}_m`, `tokens.${p}_f`]),
      ...['hind', 'maitha', 'khalid', 'amna', 'saeed', 'sultan'].map((k) => `family.slots.${k}`),
      ...['high', 'mid', 'low'].flatMap((c) => [`forecast.cat.${c}`, `forecast.catLower.${c}`]),
      ...['child', 'cvd', 'under30', 'over74'].flatMap((r) => [`forecast.na.${r}`, `forecast.naShort.${r}`]),
      ...['age', 'sbp', 'bmi', 'tc', 'hdl', 'sbpTrend', 'bmiTrend', 'ageM', 'overdueW', 'bpTx', 'smoker', 'dm', 'emirati', 'cvd'].map((f) => `family.pfl.${f}`),
      ...['age', 'sbp', 'mmol', 'sbpTrend', 'bmiTrend', 'ageM', 'overdueW'].map((f) => `family.fmt.${f}`),
      ...['app', 'cuff', 'clinic'].map((d) => `family.signals.bp.${d}`),
      ...['scale', 'clinic'].map((d) => `family.signals.wt.${d}`),
      ...['hr', 'dur', 'floor', 'glu', 'spo2', 'wt', 'age', 'overdue', 'rem'].map((f) => `inputs.field.${f}`),
    ]
    const missing = [...found, ...dynamic].filter((k) => k !== 'status.' && typeof get(en, k) !== 'string')
    expect(missing).toEqual([])
  })
  test('texts carry no emoji and no leftover prototype braces', () => {
    const bad: string[] = []
    const scan = (v: unknown, p: string) => {
      if (typeof v === 'string') { if (/\{[a-zA-Z]+\}/.test(v.replace(/\{\{[^}]+\}\}/g, ''))) bad.push(p) }
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) scan(x, `${p}.${k}`)
    }
    scan(en, '')
    expect(bad).toEqual([])
  })
  test('Arabic keeps the prototype teach-back and the Arabic names; the rest is translated', () => {
    expect(get(ar, 'people.moza.n')).toBe('موزة')
    expect(get(en, 'people.moza.n')).toBe('Moza')
    expect(get(ar, 'people.hind.f1s')).toBe('ميثاء')
    expect(get(ar, 'family.members.hamdan.n')).toBe('حمدان')
    expect(get(en, 'teach.stroke.ar.explain')).toBe(get(ar, 'teach.stroke.ar.explain'))
    expect(String(get(en, 'teach.stroke.ar.explain'))).toMatch(/^يا \{\{nar\}\}،/)
    expect(get(ar, 'rules.R1.when')).not.toBe(get(en, 'rules.R1.when'))
    expect(String(get(ar, 'rules.R1.when'))).toMatch(/[؀-ۿ]/)
  })
})

describe('data: shape', () => {
  test('the step kinds the UI must render are exactly the ones used by the data', () => {
    const kinds = new Set<string>([STEP_ZERO.home.kind, STEP_ZERO.passport.kind])
    for (const j of Object.values(JOURNEYS)) j.steps.forEach((s) => kinds.add(s.kind))
    data.PREVENTION_STEPS.forEach((s) => kinds.add(s.kind))
    data.FAMILY_STEPS.forEach((s) => kinds.add(s.kind))
    expect([...kinds].sort()).toEqual([...stepKinds].sort())
    expect([...stepKinds]).toHaveLength(13)
    expect(passportKinds).toEqual(['child', 'adult'])
    expect(new Set(Object.values(PV).map((p) => p.kind))).toEqual(new Set(passportKinds))
  })
  test('every icon name has a colour emoji in the table', () => {
    const icons = usedIcons()
    expect(icons.length).toBe(10 + 9 + 8 + 8 + 8)
    expect(icons.filter((i) => !EMOJI[i])).toEqual([])
  })
  test('the people: ages, thresholds the rules read, the blood thinner', () => {
    expect(Object.values(PEOPLE).map((p) => [p.id, p.age, p.sex, p.child, p.anticoag])).toEqual([
      ['moza', 78, 'F', false, false], ['hessa', 82, 'F', false, true], ['saeed', 69, 'M', false, false], ['mariam', 81, 'F', false, false],
      ['hind', 18, 'F', true, false], ['khalid', 47, 'M', false, false], ['arjun', 4, 'M', true, false], ['hamad', 74, 'M', false, false], ['amna', 45, 'F', false, false],
    ])
    expect(Object.values(CASES).map((c) => [c.id, c.person, c.start, c.night])).toEqual([
      ['family', 'khalid', 8310, false], ['wellchild', 'hind', 8310, false], ['ifhas', 'khalid', 8310, false], ['expat', 'arjun', 8310, false], ['bone', 'hamad', 8310, false],
      ['stroke', 'moza', 72, true], ['fall', 'hessa', 185, true], ['hypo', 'saeed', 160, true], ['hf', 'mariam', 490, false], ['own', 'moza', 72, true],
    ])
    expect(CASES.stroke.inp).toEqual({ hr: 138, dur: 12, still: true, fall: false, floor: 0, glu: 6.4, spo2: 96, wt: 0 })
    expect(CASES.fall.inp).toEqual({ hr: 96, dur: 4, still: true, fall: true, floor: 6, glu: null, spo2: 95, wt: 0 })
    expect(CASES.hypo.inp).toMatchObject({ glu: 2.7, hr: 104 })
    expect(CASES.hf.inp).toMatchObject({ wt: 2.4, spo2: 93 })
    expect([CASES.fall.speech, CASES.fall.ans, CASES.hypo.ans, CASES.hf.ans, CASES.stroke.speech]).toEqual(['usual', 'cant', 'drink', 'pillows', 'slurred'])
  })
  test('journey timing: day offsets and clocks', () => {
    const at = (id: JourneyId) => JOURNEYS[id].steps.map((s) => s.at)
    expect(at('stroke_em')).toEqual([{ m: 0 }, { m: 33 }, { m: 50 }, { d: 0, h: '09:10' }, { d: 2, h: '10:45' }, { d: 13, h: '08:10' }, { d: 13, h: '09:30' }, { d: 16, h: '09:00' }])
    expect(at('hf_clinic')[0]).toEqual({ m: 5 })
  })
})

describe('every text of every step resolves for every person', () => {
  const strings = (e: TestCaseEngine, st: StepDef): Txt[] => [
    tx(st.label), tx(st.title), tx(st.decides), ...(st.hold ? [tx(st.hold)] : []), ...(st.btn ? [tx(st.btn)] : []), ...(st.text ? [tx(st.text)] : []), ...(st.done ? [tx(st.done)] : []),
    ...st.agents.flatMap((a) => a.lines.map((l) => tx(l))), ...st.flow.flatMap((f) => ('label' in f ? [tx(f.label)] : [])),
    ...e.items(st).flatMap((r) => [r.title, r.detail]), ...e.packet(st).flatMap((r) => [r.title, r.detail]),
    ...(st.phone ? [tx(st.phone.title), ...(st.phone.text ? [tx(st.phone.text)] : [])] : []), ...(st.pipe ?? []).map((p) => tx(p.text)), ...(st.fam ? [tx(st.fam.who), tx(st.fam.text)] : []),
  ]
  const clean = (e: TestCaseEngine, x: Txt, where: string) => {
    const s = resolveText(x, t, e.ctx())
    if (s.includes('{{') || s === x.k) throw new Error(`${where}: ${x.k} -> ${s}`)
  }
  test.each(['moza', 'hessa', 'saeed', 'mariam'] as PersonId[])('the seven journeys, as %s', (pk) => {
    const e = make('own')
    e.setPerson(pk)
    e.S.speech.home = { said: 'x', secs: 4, match: 1, ratio: 1, score: 0.94, lvl: 'green', mode: 'sample', lang: 'en', wpm: 1, mask: [], target: [], matched: 1, total: 1 }
    e.S.ans = 'fine'; e.S.qk = 'hr'; e.S.tCheck = 90
    for (const id of Object.keys(JOURNEYS) as JourneyId[]) {
      e.S.path = id; e.S.dec = { path: id, rule: JOURNEYS[id].rule, name: tx(JOURNEYS[id].name) }
      for (const st of e.steps()) for (const x of strings(e, st)) clean(e, x, `${pk} ${id}`)
    }
  })
  test.each(['wellchild', 'ifhas', 'expat', 'bone', 'family'] as const)('%s', (ck) => {
    const e = auto(ck).e
    for (const st of e.steps()) for (const x of strings(e, st)) clean(e, x, ck)
    for (const l of e.logs) clean(e, l.tx, 'log')
    for (const f of e.S.feed) { clean(e, f.who, 'feed'); clean(e, f.text, 'feed') }
    for (const rows of Object.values(e.db)) for (const r of rows) for (const v of Object.values(r)) if (typeof v === 'object') clean(e, v, 'db')
  })
  test('the safety runs have no unresolved text in the log, the database, the feed or the checklist', () => {
    for (const ck of ['stroke', 'fall', 'hypo', 'hf', 'own'] as const) {
      const e = auto(ck).e
      for (const l of e.logs) clean(e, l.tx, 'log')
      for (const f of e.S.feed) { clean(e, f.who, 'feed'); clean(e, f.text, 'feed') }
      for (const rows of Object.values(e.db)) for (const r of rows) for (const v of Object.values(r)) if (typeof v === 'object') clean(e, v, ck + ' db')
      for (const c of e.decisionChecks()) clean(e, c, 'check')
      for (const st of e.steps()) for (const x of strings(e, st)) clean(e, x, ck)
    }
  })
})

describe('resolveText', () => {
  const tt = (k: string) => ({ 'a': 'Hello {{who}}, {{missing}}', 'b': '{{x}} and {{y}}', 'name': 'Moza', 'lst': '{{list}}', 'loop': '{{loop}}' })[k] ?? k
  test('literals, numbers and empty', () => {
    expect(resolveText('plain', tt)).toBe('plain')
    expect(resolveText(7, tt)).toBe('7')
    expect(resolveText(undefined, tt)).toBe('')
    expect(resolveText(null, tt)).toBe('')
  })
  test('own params first, then the context; nested texts; lists; unknown tokens stay visible', () => {
    expect(resolveText(tx('a', { who: tx('name') }), tt)).toBe('Hello Moza, {{missing}}')
    expect(resolveText(tx('b', { x: 1 }), tt, { x: 'ctx', y: tx('name') })).toBe('1 and Moza')
    expect(resolveText(tx('lst', { list: { list: [tx('name'), tx('name')], sep: '; ' } }), tt)).toBe('Moza; Moza')
  })
  test('a token that refers to itself stops instead of looping', () => {
    expect(resolveText(tx('loop'), tt, { loop: tx('loop') }).length).toBeGreaterThan(0)
  })
  test('uses skipInterpolation so the translator is asked for the raw string', () => {
    const calls: unknown[] = []
    resolveText(tx('a'), (k, o) => { calls.push(o); return k })
    expect(calls).toEqual([{ skipInterpolation: true }])
  })
})

describe('the engine as a store', () => {
  test('time: minutes since 15 Oct 2026, no time zone', () => {
    expect(hm(72)).toBe('01:12')
    expect(clk(8310)).toBe('20 Oct 18:30')
    expect(clk(0)).toBe('15 Oct 00:00')
    expect(clk(1440 * 20 + 59)).toBe('4 Nov 00:59')
  })
  test('subscribe, snapshot identity and immutability', () => {
    const e = make('stroke')
    let n = 0
    const off = e.subscribe(() => n++)
    const a = e.getSnapshot()
    expect(e.getSnapshot()).toBe(a)
    e.play()
    expect(n).toBe(1)
    const b = e.getSnapshot()
    expect(b).not.toBe(a)
    expect(b.version).toBeGreaterThan(a.version)
    expect(a.state.phase).toBe('setup') // the old snapshot did not change
    expect(b.state.phase).toBe('playing')
    expect(b.step.kind).toBe('home')
    off()
    e.drain()
    expect(n).toBe(1)
  })
  test('the playback is a loop of ticks; random is injectable', () => {
    const run = (r: () => number) => { const e = new TestCaseEngine({ t, caseId: 'stroke', random: r }); e.play(); let k = 0; while (e.playTick()) k++; return { e, k } }
    const a = run(() => 0.5), b = run(() => 0.5)
    expect(a.e.S.read).toEqual(b.e.S.read)
    expect(a.k).toBe(19) // 20 minutes: 10 quiet, then 10 minutes above 120 -> the check starts
    expect(a.e.S.read).toHaveLength(20)
    expect(a.e.S.read[0]).toBe(60)
    expect(a.e.S.read[19]).toBe(138)
    expect(run(() => 1).e.S.read[19]).toBe(141)
    expect(a.e.playTick()).toBe(false)
  })
  test('restart and replay reseed the default random source, so jitter does not depend on earlier cases', () => {
    const jitter = (e: TestCaseEngine) => { e.play(); while (e.playTick()); return e.S.read.slice() }
    const fresh = jitter(new TestCaseEngine({ t, caseId: 'stroke' }))
    const used = new TestCaseEngine({ t, caseId: 'stroke' })
    jitter(used)
    used.restart('stroke')
    expect(jitter(used)).toEqual(fresh)
    used.replay()
    expect(jitter(used)).toEqual(fresh)
  })
  test('the speaking language starts from the option and survives a restart', () => {
    const e = new TestCaseEngine({ t, caseId: 'stroke', lang: 'ar' })
    expect(e.S.lang).toBe('ar')
    e.restart('hypo')
    expect(e.S.lang).toBe('ar')
    e.setLang('en')
    e.restart()
    expect(e.S.lang).toBe('en')
  })
  test('the pipeline animation takes two half steps per node, and blocks actions meanwhile', () => {
    const e = make('stroke')
    e.play()
    while (e.playTick());
    expect(e.busy).toBe(true) // [rule met, voice check, stored] are queued
    expect(e.S.pipe).toEqual({})
    expect(e.flowTick()).toBe(true)
    expect(e.S.pipe[0].c).toBe('active')
    expect(text(e, e.S.pipe[0].t)).toBe('working…')
    e.flowTick()
    expect(e.S.pipe[0].c).toBe('done')
    expect(text(e, e.S.pipe[0].t)).toBe('rule R1 met')
    expect(e.play()).toBeUndefined() // busy and not in setup: ignored
    e.settle()
    expect(e.busy).toBe(false)
    expect(e.flowTick()).toBe(false)
  })
  test('go: only to steps already reached; the first visit starts the pipeline; the table follows the step kind', () => {
    const e = make('wellchild')
    e.checkPassport(); e.chooseBarrier('access'); e.settle()
    e.go(3)
    expect(e.S.step).toBe(0)
    e.next(); e.settle()
    expect(e.S.step).toBe(1)
    expect(e.S.dbTab).toBe('encounters')
    expect(e.S.pipe[3]?.c).toBe('done')
    e.go(0)
    expect(e.S.dbTab).toBe('observations')
    e.go(1)
    expect(e.busy).toBe(false) // already seen: no new animation
  })
  test('restart keeps the language, replay keeps the inputs', () => {
    const e = make('stroke')
    e.setLang('ar')
    e.setInput('hr', 150)
    e.play(); e.drain()
    e.replay()
    expect(e.S.phase).toBe('setup')
    expect((e.S.inp as { hr: number }).hr).toBe(150)
    expect(e.S.lang).toBe('ar')
    e.restart('fall')
    expect(e.S.ck).toBe('fall')
    expect((e.S.inp as { hr: number }).hr).toBe(96)
    expect(e.S.lang).toBe('ar')
    expect(e.logs).toHaveLength(1)
    e.restart()
    expect(e.S.ck).toBe('fall')
  })
  test('"own": person and start survive restarting the same case', () => {
    const e = make('own')
    e.setPerson('mariam'); e.setStart(490)
    e.restart()
    expect(e.S.pk).toBe('mariam')
    expect(e.S.start).toBe(490)
    expect(String(e.db.patients[0].patient_id)).toBe('P-1003')
    e.restart('stroke')
    expect(e.S.pk).toBe('moza')
  })
  test('inputs are locked once the playback starts', () => {
    const e = make('stroke')
    e.play()
    e.setInput('hr', 99)
    expect((e.S.inp as { hr: number }).hr).toBe(138)
  })
  test('the glucose switch and the fall switch set sensible defaults', () => {
    const e = make('own')
    e.setInputToggle('glus', true)
    expect((e.S.inp as { glu: number }).glu).toBe(5.6)
    e.setInputToggle('glus', false)
    expect((e.S.inp as { glu: number | null }).glu).toBeNull()
    e.setInputToggle('fall', true)
    expect((e.S.inp as { floor: number }).floor).toBe(6)
  })
})

describe('teach-back and the plan', () => {
  const toTeach = () => {
    const e = make('fall')
    e.setAuto(true)
    for (let k = 0; k < 300 && !(e.cur().kind === 'teach' && !e.S.done[e.S.step]); k++) { e.drain(); e.autoStep() }
    e.setAuto(false); e.drain()
    return e
  }
  test('the prepared explanation in English and Arabic, with the person filled in', () => {
    const e = toTeach()
    const ex = e.curExplain()!
    expect(ex).toMatchObject({ src: 'prepared', tkey: 'fall', correct: 1 })
    expect(text(e, ex.explain)).toMatch(/^Hessa, you fell because your blood pressure drops/)
    e.setLang('ar')
    expect(text(e, e.curExplain()!.explain)).toMatch(/^يا حصة، كان السقوط/)
    expect(e.curExplain()!.opts).toHaveLength(3)
  })
  test('a wrong answer explains more simply; the right one saves a check-in; the plan completes the step', () => {
    const e = toTeach()
    e.answerTeach(0)
    expect(e.S.tbWrong).toBe(0)
    expect(text(e, e.logs[0].tx)).toBe('Noa Coach · teach-back: not yet · explains more simply')
    e.answerTeach(1)
    expect(e.S.tb).toBe('ok')
    expect(text(e, e.db.checkins.at(-1)!.detail)).toBe('second try')
    expect(e.S.done[e.S.step]).toBeFalsy() // the plan still has to be sent
    e.setPlanShare('f2', false)
    e.sendPlan()
    expect(e.S.done[e.S.step]).toBe(true)
    expect(text(e, e.db.consents.find((c) => c.scope === 'family_circle')!.shared_with)).toBe('Saif')
    expect(text(e, e.db.tasks.at(-1)!.result)).toBe('delivered · visible to Saif')
    e.answerTeach(0) // already passed: ignored
    expect(e.S.tb).toBe('ok')
  })
  test('the plan can go to nobody', () => {
    const e = toTeach()
    e.setPlanShare('f1', false); e.setPlanShare('f2', false)
    e.answerTeach(1)
    e.sendPlan()
    expect(text(e, e.db.consents.find((c) => c.scope === 'family_circle')!.shared_with)).toBe('nobody')
  })
  test('a live explanation is accepted only in the right shape', () => {
    const e = toTeach()
    expect(e.applyLiveExplain({ explain: 'x', opts: ['a', 'b'], correct: 0 })).toBe(false)
    expect(e.applyLiveExplain({ explain: 'x', opts: ['a', 'b', 'c'], correct: 3 })).toBe(false)
    expect(e.applyLiveExplain(null)).toBe(false)
    expect(e.applyLiveExplain({ explain: 'Live text', q: 'Q?', opts: ['a', 'b', 'c'], correct: 2, simpler: 's' })).toBe(true)
    expect(e.curExplain()).toMatchObject({ src: 'live', explain: 'Live text', correct: 2 })
    e.answerTeach(2)
    expect(e.S.tb).toBe('ok')
    e.setLang('ar') // another language: back to the prepared text
    expect(e.curExplain()!.src).toBe('prepared')
  })
  test('prevention teach-back is chosen by the result', () => {
    const e = auto('ifhas').e
    expect(e.teachKey()).toBe('dm')
    expect(text(e, e.curExplain()!.explain)).toBe('Khalid, your HbA1c is 7.4%. That is in the diabetes range, but one test isn’t enough: a second test in 2 weeks will confirm it. It is not an emergency. If it is diabetes, starting early protects your heart, eyes and kidneys, and your family history makes that more important.')
    const hind = auto('wellchild').e
    expect(text(hind, hind.curExplain()!.explain)).toBe('Maitha, at Hind’s visit she said 2 words besides mama and dada. Many children catch up, but it’s worth checking her hearing and speech early. Noa booked a hearing test for next week. Talk and read with her every day, and name the things she points at.')
    hind.setLang('ar')
    expect(text(hind, hind.curExplain()!.explain)).toMatch(/^يا ميثاء، في زيارة هند قالت 2 كلمات/)
  })
})

describe('the autopilot script', () => {
  test('family: Moza first, then Hind, Maitha, Khalid, Amna, Saeed, Sultan, then on', () => {
    const e = make('family')
    e.setAuto(true)
    const order: string[] = []
    for (let k = 0; k < 8; k++) { const before = e.logs.length; e.autoStep(); order.push(...e.logs.slice(0, e.logs.length - before).map((l) => l.m).filter((m) => m === 'BOOK' || m === 'ACCEPT')) }
    expect(order).toEqual(['ACCEPT', 'BOOK', 'BOOK', 'BOOK', 'BOOK', 'BOOK', 'BOOK'])
  })
  test('the delays: 850 ms between actions, 400 ms while the pipeline is busy, null when it stops', () => {
    const e = make('stroke')
    expect(e.autoStep()).toBeNull() // not running
    e.setAuto(true)
    expect(e.autoStep()).toBe(850) // play
    e.drain()
    e.autoStep() // the speech sample
    e.autoStep() // the answer: Noa decides and the pipeline starts
    expect(e.busy).toBe(true)
    expect(e.autoStep()).toBe(400)
    e.setAuto(false)
    expect(e.autoStep()).toBeNull()
  })
  test('"own" with calm readings stops at "no action"', () => {
    const e = auto('own').e
    expect(e.S.dec?.rule).toBe('R12')
    expect(e.S.auto).toBe(false)
  })
  test('stopping in the middle leaves a state you can continue by hand', () => {
    const e = make('wellchild')
    e.setAuto(true)
    e.autoStep(); e.autoStep()
    e.setAuto(false)
    expect(e.S.phase).toBe('decided')
    e.drain()
    e.next()
    expect(e.S.step).toBe(1)
  })
})

describe('with the real i18next instance', () => {
  const real = (lng: string) => i18n.getFixedT(lng, 'testcase') as unknown as TFn
  test('array-indexed keys and the raw (uninterpolated) strings resolve in both languages', () => {
    for (const lng of ['en', 'ar']) {
      const rt = real(lng)
      expect(rt('teach.stroke.en.opts.1', { skipInterpolation: true })).toBe('Twice a day, every day, and never stop it on my own')
      const responder = rt('journeys.stroke_em.steps.0.agents.responder.0', { skipInterpolation: true })
      if (lng === 'en') expect(responder).toBe('Calls 998 with the fixed script; a human operator takes over')
      else expect(responder).toMatch(/998/)
      expect(rt('teach.stroke.ar.opts.1', { skipInterpolation: true })).toBe('مرتين يوميًا كل يوم، دون إيقافه')
    }
    expect(real('ar')('people.moza.n')).toBe('موزة')
    expect(real('en')('people.moza.n')).toBe('Moza')
  })
  test('a whole run resolves with the real translator, in English and in Arabic', () => {
    for (const lng of ['en', 'ar']) {
      const rt = real(lng)
      const e = auto('stroke').e
      e.setTranslator(rt)
      for (const l of e.logs) {
        const s = resolveText(l.tx, rt, e.ctx())
        expect(s).not.toContain('{{')
        expect(s).not.toBe(l.tx.k)
      }
      const name = resolveText(e.S.dec!.name, rt, e.ctx())
      if (lng === 'en') expect(name).toBe('Emergency: possible stroke')
      else expect(name).toMatch(/[؀-ۿ]/)
    }
  })
  test('the notes under the database tabs exist', () => {
    for (const k of DB_TABLES) expect(typeof get(en, dbNoteKey(k))).toBe('string')
  })
})
