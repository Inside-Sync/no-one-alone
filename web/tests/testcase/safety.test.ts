import { JOURNEYS, QUESTIONS, RULES } from '@/features/testcase/data'
import { TestCaseEngine, choosePath, runLen, triggers, type PersonId, type SafetyInputs, type SampleKey } from '@/features/testcase/engine'
import { make, t, text } from './helpers'

/**
 * Safety rules R1 to R12. The table below was produced by running the prototype (new3.html, "Enter your own") with the same
 * inputs, then checked against the engine: same decision rule, same path.
 */
interface Scen {
  id: string
  pk: PersonId
  inp: Partial<SafetyInputs>
  still?: boolean
  fall?: boolean
  glus?: boolean
  speech?: SampleKey
  ans?: string
  typed?: string
  /** The rule of the decision the prototype showed, or null: no decision yet (the answer to the question is missing). */
  rule: string | null
  path?: string
}
const SCEN: Scen[] = [
  { id: 's01 slurred, not yet answered', pk: 'moza', inp: { hr: 138, dur: 12 }, speech: 'slurred', rule: null },
  { id: 's02 speech normal, "fine": stand down', pk: 'moza', inp: { hr: 138, dur: 12 }, speech: 'usual', ans: 'fine', rule: 'R1' },
  { id: 's03 no answer to the question: R5', pk: 'moza', inp: { hr: 138, dur: 12 }, speech: 'usual', ans: 'none', rule: 'R5', path: 'stroke_em' },
  { id: 's04 no speech at all: R5', pk: 'moza', inp: { hr: 138, dur: 12 }, speech: 'none', rule: 'R5', path: 'stroke_em' },
  { id: 's05 heart rate settles after 9 minutes: R12', pk: 'moza', inp: { hr: 138, dur: 9 }, rule: 'R12' },
  { id: 's06 fast heart rate while moving: R12', pk: 'moza', inp: { hr: 138, dur: 12 }, still: false, rule: 'R12' },
  { id: 's07 125 bpm for 10 minutes, slurred', pk: 'moza', inp: { hr: 125, dur: 10 }, speech: 'slurred', rule: null },
  { id: 's08 110 bpm: R12', pk: 'moza', inp: { hr: 110, dur: 15 }, rule: 'R12' },
  { id: 's09 fall, up within 2 minutes: R12', pk: 'hessa', inp: { floor: 1 }, fall: true, rule: 'R12' },
  { id: 's10 fall 2 min, cannot get up: R7', pk: 'hessa', inp: { floor: 2 }, fall: true, speech: 'usual', ans: 'cant', rule: 'R7', path: 'fall_em' },
  { id: 's11 fall, got up: R11', pk: 'hessa', inp: { floor: 6 }, fall: true, speech: 'usual', ans: 'ok', rule: 'R11', path: 'fall_minor' },
  { id: 's12 fall, no answer: R7', pk: 'hessa', inp: { floor: 6 }, fall: true, speech: 'usual', ans: 'none', rule: 'R7', path: 'fall_em' },
  { id: 's13 fall, no speech: R7', pk: 'hessa', inp: { floor: 6 }, fall: true, speech: 'none', rule: 'R7', path: 'fall_em' },
  { id: 's14 fall, not on a blood thinner: R7', pk: 'moza', inp: { floor: 6 }, fall: true, speech: 'usual', ans: 'cant', rule: 'R7', path: 'fall_em' },
  { id: 's15 glucose 3.9, drinking: R9', pk: 'saeed', inp: { glu: 3.9 }, glus: true, speech: 'usual', ans: 'drink', rule: 'R9', path: 'hypo_home' },
  { id: 's16 glucose 2.7, confused: R6', pk: 'saeed', inp: { glu: 2.7 }, glus: true, speech: 'usual', ans: 'confused', rule: 'R6', path: 'hypo_em' },
  { id: 's17 glucose 2.7, slurred, not yet answered', pk: 'saeed', inp: { glu: 2.7 }, glus: true, speech: 'slurred', rule: null },
  { id: 's18 glucose 4.0 is not low: R12', pk: 'saeed', inp: { glu: 4.0 }, glus: true, rule: 'R12' },
  { id: 's19 glucose 2.7, no answer: R6', pk: 'saeed', inp: { glu: 2.7 }, glus: true, speech: 'usual', ans: 'none', rule: 'R6', path: 'hypo_em' },
  { id: 's20 weight +2.4, a bit breathless: R10', pk: 'mariam', inp: { wt: 2.4, spo2: 93 }, speech: 'usual', ans: 'pillows', rule: 'R10', path: 'hf_clinic' },
  { id: 's21 weight +2.4, breathless at rest: R8', pk: 'mariam', inp: { wt: 2.4, spo2: 93 }, speech: 'usual', ans: 'rest', rule: 'R8', path: 'hf_em' },
  { id: 's22 weight +2.4, feels fine: R10', pk: 'mariam', inp: { wt: 2.4, spo2: 93 }, speech: 'usual', ans: 'fine', rule: 'R10', path: 'hf_clinic' },
  // no answer is R5, not the prototype's R8
  { id: 's23 weight +2.4, no speech: R5', pk: 'mariam', inp: { wt: 2.4, spo2: 93 }, speech: 'none', rule: 'R5', path: 'stroke_em' },
  { id: 's24 weight +1.9, oxygen 93: R12', pk: 'mariam', inp: { wt: 1.9, spo2: 93 }, speech: 'usual', rule: 'R12' },
  { id: 's25 oxygen 92 starts R4: R10', pk: 'mariam', inp: { wt: 0, spo2: 92 }, speech: 'usual', ans: 'fine', rule: 'R10', path: 'hf_clinic' },
  { id: 's26 oxygen 89 is below 90: R8', pk: 'mariam', inp: { wt: 0, spo2: 89 }, speech: 'usual', ans: 'fine', rule: 'R8', path: 'hf_em' },
  { id: 's27 weight +2.0 exactly: R10', pk: 'mariam', inp: { wt: 2, spo2: 96 }, speech: 'usual', ans: 'fine', rule: 'R10', path: 'hf_clinic' },
  { id: 's28 slurred, not yet answered', pk: 'mariam', inp: { wt: 2.4, spo2: 93 }, speech: 'slurred', rule: null },
  { id: 's29 fall plus low glucose, got up: low sugar wins, R9', pk: 'hessa', inp: { floor: 6, glu: 3.5 }, fall: true, glus: true, speech: 'usual', ans: 'ok', rule: 'R9', path: 'hypo_home' },
  // the fall makes it 998, not the prototype's R9
  { id: 's30 fall plus low glucose, cannot get up: R7', pk: 'hessa', inp: { floor: 6, glu: 3.5 }, fall: true, glus: true, speech: 'usual', ans: 'cant', rule: 'R7', path: 'fall_em' },
  { id: 's31 fall plus low glucose, confused is not an option of the fall question', pk: 'hessa', inp: { floor: 6, glu: 3.5 }, fall: true, glus: true, speech: 'usual', ans: 'confused', rule: null },
  { id: 's32 heart rate and weight: the first rule (R4) leads, R10', pk: 'moza', inp: { hr: 138, dur: 12, wt: 2.5 }, speech: 'usual', ans: 'fine', rule: 'R10', path: 'hf_clinic' },
  { id: 's33 heart rate and oxygen 88: R8', pk: 'moza', inp: { hr: 138, dur: 12, spo2: 88 }, speech: 'usual', ans: 'fine', rule: 'R8', path: 'hf_em' },
  { id: 's34 Mariam with a fast heart rate: weight leads, R10', pk: 'mariam', inp: { wt: 2.4, spo2: 93, hr: 138, dur: 12 }, speech: 'usual', ans: 'pillows', rule: 'R10', path: 'hf_clinic' },
  { id: 's35 typed wrong sentence: red speech, R5', pk: 'moza', inp: { hr: 138, dur: 12 }, speech: 'usual', typed: 'my name is hind', ans: 'fine', rule: 'R5', path: 'stroke_em' },
]

function run(s: Scen) {
  const e = make('own')
  e.setPerson(s.pk)
  if (s.still === false) e.setInputToggle('still', false)
  if (s.fall) e.setInputToggle('fall', true)
  if (s.glus) e.setInputToggle('glus', true)
  for (const [k, v] of Object.entries(s.inp)) e.setInput(k as keyof SafetyInputs, v as number)
  e.play()
  e.drain()
  if (e.S.phase === 'check' && s.speech) {
    if (s.typed) e.typedSpeech(s.typed)
    else e.sampleSpeech(s.speech)
    if (s.ans && e.S.qk && QUESTIONS[e.S.qk].a.some((a) => a.id === s.ans)) e.answer(s.ans)
  }
  e.drain()
  return e
}

describe('safety rules: the engine decides like the prototype', () => {
  test.each(SCEN.map((s) => [s.id, s] as const))('%s', (_n, s) => {
    const e = run(s)
    if (s.rule == null) {
      expect(e.S.dec).toBeNull()
      expect(e.S.phase).toBe('check')
      return
    }
    expect(e.S.dec?.rule).toBe(s.rule)
    expect(e.S.dec?.path ?? undefined).toBe(s.path)
    if (s.path) {
      const j = JOURNEYS[s.path as keyof typeof JOURNEYS]
      expect(j.rule).toBe(s.rule)
      expect(e.S.path).toBe(s.path)
      expect(e.steps().length).toBe(1 + j.steps.length)
    }
  })

  test('the rule table lists R1 to R12 in order, and every journey answers to one of them', () => {
    expect(RULES.map((r) => r.id)).toEqual(Array.from({ length: 12 }, (_, i) => `R${i + 1}`))
    expect(Object.values(JOURNEYS).map((j) => j.rule).sort()).toEqual(['R10', 'R11', 'R5', 'R6', 'R7', 'R8', 'R9'])
  })
})

describe('R1 to R4: what starts a check', () => {
  const trigger = (pk: PersonId, inp: Partial<SafetyInputs>, tog?: (e: ReturnType<typeof make>) => void) => {
    const e = make('own')
    e.setPerson(pk)
    tog?.(e)
    for (const [k, v] of Object.entries(inp)) e.setInput(k as keyof SafetyInputs, v as number)
    e.play()
    e.drain()
    return e
  }
  test('R1: heart rate above 120 for 10 minutes while still, checked within 1 minute', () => {
    const e = trigger('moza', { hr: 138, dur: 12 })
    expect(e.S.why1).toBe('R1')
    expect(e.S.tTrig).toBe(e.S.start + 19) // minutes 10..19 are the ten minutes
    expect(e.S.tCheck! - e.S.tTrig!).toBe(1)
    expect(e.S.qk).toBe('hr')
  })
  test('R1 does not fire at 9 minutes, while moving, or at 120 bpm or below', () => {
    expect(trigger('moza', { hr: 138, dur: 9 }).S.why1).toBeNull()
    expect(trigger('moza', { hr: 138, dur: 12 }, (e) => e.setInputToggle('still', false)).S.why1).toBeNull()
    expect(trigger('moza', { hr: 118, dur: 12 }).S.phase).not.toBe('check')
  })
  const runR1 = ({ hr, random }: { hr: number; random?: () => number }) => {
    const e = new TestCaseEngine({ t, caseId: 'own', random })
    e.setPerson('moza'); e.setInput('hr', hr); e.setInput('dur', 12); e.play(); e.drain()
    return e
  }
  test('R1 edge: noise never moves a typed rate across 120', () => {
    for (const hr of [121, 122, 123]) expect(runR1({ hr }).S.why1).toBe('R1')
    const low = runR1({ hr: 121, random: () => 0 })
    expect(low.S.why1).toBe('R1')
    expect(low.S.read.slice(10, 20).every((v) => v > 120)).toBe(true)
    const high = runR1({ hr: 120, random: () => 0.99 })
    expect(high.S.why1).toBeNull()
    expect(high.S.dec?.rule).toBe('R12')
    expect(high.S.read.slice(10, 22).every((v) => v <= 120)).toBe(true)
  })
  test('R2: a fall still on the floor after 2 minutes', () => {
    const e = trigger('hessa', { floor: 2 }, (x) => x.setInputToggle('fall', true))
    expect(e.S.why1).toBe('R2')
    expect(e.S.qk).toBe('fall')
    expect(trigger('hessa', { floor: 1 }, (x) => x.setInputToggle('fall', true)).S.why1).toBeNull()
  })
  test('R3: glucose below 4.0 (3.0 is severe)', () => {
    const e = trigger('saeed', { glu: 3.9 }, (x) => x.setInputToggle('glus', true))
    expect(e.S.why1).toBe('R3')
    expect(e.S.qk).toBe('hypo')
    expect(triggers({ ...(e.S.inp as SafetyInputs), glu: 2.9 }).hypoS).toBe(true)
    expect(triggers({ ...(e.S.inp as SafetyInputs), glu: 3.0 }).hypoS).toBe(false)
    expect(trigger('saeed', { glu: 4.0 }, (x) => x.setInputToggle('glus', true)).S.why1).toBeNull()
  })
  test('R4: weight up 2 kg or more, or oxygen 92% or lower', () => {
    expect(trigger('mariam', { wt: 2 }).S.why1).toBe('R4')
    expect(trigger('mariam', { wt: 1.9, spo2: 92 }).S.why1).toBe('R4')
    expect(trigger('mariam', { wt: 1.9, spo2: 93 }).S.why1).toBeNull()
  })
  test('the pure helpers', () => {
    const I: SafetyInputs = { hr: 138, dur: 12, still: true, fall: false, floor: 0, glu: null, spo2: 96, wt: 0 }
    expect(triggers(I)).toEqual({ hr: true, fall: false, hypo: false, hypoS: false, hf: false, spo2c: false })
    expect(triggers({ ...I, dur: 9 }).hr).toBe(false)
    expect(triggers({ ...I, spo2: 90 })).toMatchObject({ hf: true, spo2c: false })
    expect(triggers({ ...I, spo2: 89 })).toMatchObject({ hf: true, spo2c: true })
    expect(runLen([130, 130, 60, 130, 130, 130], [0, 0, 0, 0, 0, 0])).toBe(3)
    expect(runLen([130, 130, 130], [0, 1, 0])).toBe(1)
  })
})

describe('the decision ladder (R5 to R11)', () => {
  const sp = (lvl: 'green' | 'amber' | 'red', said = true) => ({ said: said ? 'x' : '', lvl }) as never
  const base = { hr: false, fall: false, hypo: false, hypoS: false, hf: false, spo2c: false }
  test('low sugar: confused, no answer or red speech is an emergency (R6), a clear answer is treated at home (R9)', () => {
    expect(choosePath({ ...base, hypo: true }, sp('green'), 'confused')).toBe('hypo_em')
    expect(choosePath({ ...base, hypo: true }, sp('red'), 'drink')).toBe('hypo_em')
    expect(choosePath({ ...base, hypo: true }, sp('green', false), null)).toBe('hypo_em')
    expect(choosePath({ ...base, hypo: true }, sp('amber'), 'drink')).toBe('hypo_home')
  })
  test('a second danger sign never lowers the response', () => {
    expect(choosePath({ ...base, hypo: true, fall: true }, sp('green'), 'cant')).toBe('fall_em')
    expect(choosePath({ ...base, hypo: true, fall: true }, sp('amber'), 'cant')).toBe('fall_em')
    expect(choosePath({ ...base, hypo: true, spo2c: true }, sp('green'), 'drink')).toBe('hf_em')
    expect(choosePath({ ...base, hypo: true, fall: true }, sp('green'), 'ok')).toBe('hypo_home')
    expect(choosePath({ ...base, hypo: true }, sp('red'), 'drink')).toBe('hypo_em')
  })
  test('every combination: the path is a 998 path exactly when a danger sign is present', () => {
    const keys = ['hypo', 'fall', 'hf', 'hr', 'spo2c'] as const
    for (let mask = 1; mask < 32; mask++) {
      const tr = { ...base, ...Object.fromEntries(keys.map((k, i) => [k, !!(mask & (1 << i))])) }
      // the question Noa asks, in the order of engine/state.ts finishPlay
      const q = QUESTIONS[tr.fall ? 'fall' : tr.hypo ? 'hypo' : tr.hf ? 'hf' : 'hr']
      for (const lvl of ['green', 'amber', 'red'] as const) {
        for (const said of [true, false]) {
          for (const ans of q.a.map((a) => a.id)) {
            const noAns = !said || ans === 'none'
            const danger = lvl === 'red' || noAns || (tr.hypo && ans === 'confused') || (tr.fall && ans === 'cant') || tr.spo2c || ans === 'rest'
            const path = choosePath(tr, sp(lvl, said), ans)
            expect(/_em$/.test(path ?? ''), JSON.stringify({ tr, lvl, said, ans, path })).toBe(danger)
          }
        }
      }
    }
  })
  test('fall: cannot get up or no answer is R7, got up is R11', () => {
    expect(choosePath({ ...base, fall: true }, sp('green'), 'cant')).toBe('fall_em')
    expect(choosePath({ ...base, fall: true }, sp('green'), 'none')).toBe('fall_em')
    expect(choosePath({ ...base, fall: true }, sp('green'), 'ok')).toBe('fall_minor')
  })
  test('red speech, or a fast heart rate with no answer: possible stroke (R5); a clear answer stands down', () => {
    expect(choosePath({ ...base, hr: true }, sp('red'), 'fine')).toBe('stroke_em')
    expect(choosePath({ ...base, hr: true }, sp('green'), 'none')).toBe('stroke_em')
    expect(choosePath({ ...base, hr: true }, sp('green'), 'fine')).toBeNull()
    expect(choosePath({ ...base, hr: true }, sp('amber'), 'fine')).toBeNull()
  })
  test('weight or oxygen: at rest or oxygen under 90 is R8, no answer is R5, otherwise the nurse (R10)', () => {
    expect(choosePath({ ...base, hf: true }, sp('green'), 'rest')).toBe('hf_em')
    expect(choosePath({ ...base, hf: true, spo2c: true }, sp('green'), 'fine')).toBe('hf_em')
    expect(choosePath({ ...base, hf: true }, sp('green', false), null)).toBe('stroke_em')
    expect(choosePath({ ...base, hf: true }, sp('green'), 'pillows')).toBe('hf_clinic')
  })
})

describe('what the checklist and the R12 note say', () => {
  test('R12 notes: fast but moving, settled early, fall but up again', () => {
    const moving = run({ id: '', pk: 'moza', inp: { hr: 138, dur: 12 }, still: false, rule: 'R12' })
    expect(text(moving, moving.S.dec!.why)).toContain('fast heart rate while moving (expected)')
    const settled = run({ id: '', pk: 'moza', inp: { hr: 138, dur: 9 }, rule: 'R12' })
    expect(text(settled, settled.S.dec!.why)).toContain('settled after 9 min')
    const up = run({ id: '', pk: 'hessa', inp: { floor: 1 }, fall: true, rule: 'R12' })
    expect(text(up, up.S.dec!.why)).toContain('up again within 2 minutes')
    const calm = run({ id: '', pk: 'moza', inp: { hr: 90, dur: 0 }, rule: 'R12' })
    expect(text(calm, calm.S.dec!.why)).toMatch(/^All readings are within her normal range/)
    expect(calm.decisionChecks().map((c) => text(calm, c))).toEqual(['No rule met, so nobody was woken at night'])
  })
  test('emergency checklist: rule time, 998 time, last known well, head CT only on a blood thinner', () => {
    const stroke = run(SCEN[2])
    const lines = stroke.decisionChecks().map((c) => text(stroke, c))
    expect(lines[0]).toBe('Rule R1 met at 01:31; Noa Voice checked at 01:32 (1 min, target ≤ 1)')
    expect(lines).toContain('Waited for the full 10 minutes before waking Moza, so a short spike wakes nobody')
    expect(lines).toContain('998 called at 01:36, 4 min after the check (target ≤ 3)')
    expect(lines).toContain('Last known well 01:22 sent ahead for the stroke team')
    expect(run(SCEN[9]).decisionChecks().some((c) => c.k === 'checks.headCt')).toBe(true)
    expect(run(SCEN[13]).decisionChecks().some((c) => c.k === 'checks.headCt')).toBe(false)
  })
  test('stand down checklist', () => {
    const e = run(SCEN[1])
    expect(e.S.dec).toMatchObject({ rule: 'R1', path: null, standdown: true })
    expect(e.decisionChecks().map((c) => c.k)).toEqual(['checks.ruleMet', 'checks.waitedTen', 'checks.standDown'])
    expect(e.S.feed.map((f) => text(e, f.text))).toContain('All clear: Moza answered clearly. She is fine.')
  })
})
