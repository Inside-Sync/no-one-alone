import { PEOPLE } from '../data/people'
import type { PersonId, SampleKey } from '../engine'
import type { AgeBand, BenchAgent, BenchGroup, DecisionClass, FamEdit, Outcome, Scenario, SetOp, Setup } from './types'

/**
 * The synthetic scenario set. Every scenario is labelled from the PUBLISHED rule table of the prototype (R1 to R12, P1 to P9, F1, F2: the table
 * in `data/rules.ts` and the "Rules" panel of the Test case), never from what the engine happens to do. A scenario is a setup (what the person
 * or the sensors say) and the expected outcome (rule, decision, agent). No patient data is used: everything here is made up.
 */

const AGENT_OF: Record<DecisionClass, BenchAgent> = {
  'call-998': 'noa', 'home-plan': 'noa', 'same-day-clinic': 'noa', 'stand-down': 'voice', 'no-action': 'guardian',
  'stay-silent': 'guardian', 'ask-barrier': 'guardian', 'barrier-help': 'noa', 'respect-choice': 'noa', refer: 'noa', 'passport-ok': 'noa',
  'doctor-review': 'forecast', 'measure-cholesterol': 'forecast', 'not-scored': 'forecast', refused: 'guardrail', 'no-decision': 'noa',
}

const band = (years: number): AgeBand => (years < 18 ? 'child' : years < 40 ? '18-39' : years < 65 ? '40-64' : '65+')
const personBand = (p: PersonId): AgeBand => (PEOPLE[p].child ? 'child' : band(PEOPLE[p].age))

let list: Scenario[] = []
const add = (s: Omit<Scenario, 'expected' | 'tags' | 'near'> & { near?: string | string[]; expected: Partial<Outcome> & Pick<Outcome, 'rule' | 'decision'>; tough?: boolean; age?: AgeBand }): void => {
  const { tough, age, near, ...rest } = s
  const setup = s.setup
  const start = setup.kind === 'safety' ? (setup.start ?? 72) : 8310
  const person = setup.kind === 'safety' ? (setup.person ?? 'moza') : 'moza'
  list.push({
    ...rest,
    ...(near ? { near: Array.isArray(near) ? near : [near] } : {}),
    expected: { agent: AGENT_OF[s.expected.decision], ...s.expected },
    tags: {
      lang: setup.kind === 'safety' ? (setup.lang ?? 'en') : 'en',
      time: start < 360 ? 'night' : 'day',
      age: age ?? (setup.kind === 'safety' ? personBand(person) : '65+'),
      level: tough ? 'tough' : 'easy',
    },
  })
}

type Sx = Omit<Extract<Setup, { kind: 'safety' }>, 'kind'>
interface Sf { tough?: boolean; near?: string; note?: string; group?: BenchGroup }
/** A safety scenario: `trig` is the sensor rule that starts the check (R1 to R4) or null; `rule` the deciding rule. */
function sf(id: string, title: string, o: Sx, trig: string | null, rule: string, decision: DecisionClass, f: Sf & { group: BenchGroup; speech?: 'green' | 'amber' | 'red' | 'none'; warn?: string } ): void {
  add({
    id, group: f.group, title, near: f.near, note: f.note, tough: f.tough,
    setup: { kind: 'safety', ...o },
    expected: { trigger: trig, rule, decision, ...(f.speech ? { speech: f.speech } : {}), ...(f.warn ? { warn: f.warn } : {}) },
  })
}
const refuse = (key: string, value: number | string | null): SetOp => ({ key, value, expect: 'refuse' })
const set = (key: string, value: number | null): SetOp => ({ key, value })
const HR: SetOp[] = [set('hr', 138), set('dur', 12)]

/* ---------------------------------------------------------------- the safety rules R1 to R12 */
function safetyRules() {
  const g = 'safety-rules'
  // R1 heart rate -> check -> R5 / stand-down
  sf('S-R1-slurred', 'Heart rate 138 for 12 minutes, still; slurred speech', { set: HR, speech: 'slurred', answer: 'fine' }, 'R1', 'R5', 'call-998', { group: g, speech: 'red' })
  sf('S-R1-noanswer', 'Heart rate 138 for 12 minutes, still; no answer to the question', { set: HR, speech: 'usual', answer: 'none' }, 'R1', 'R5', 'call-998', { group: g, speech: 'green' })
  sf('S-R1-nospeech', 'Heart rate 138 for 12 minutes, still; no speech at all', { set: HR, speech: 'none' }, 'R1', 'R5', 'call-998', { group: g, speech: 'none' })
  sf('S-R1-clear', 'Heart rate 138 for 12 minutes, still; normal speech and "I am fine"', { set: HR, speech: 'usual', answer: 'fine' }, 'R1', 'R1', 'stand-down', { group: g, speech: 'green' })
  sf('S-R1-moving', 'Heart rate 138 for 12 minutes but moving', { set: HR, toggles: { still: false } }, null, 'R12', 'no-action', { group: g, near: 'R1' })
  sf('S-R1-short', 'Heart rate 138 for only 5 minutes, still', { set: [set('hr', 138), set('dur', 5)] }, null, 'R12', 'no-action', { group: g, near: 'R1' })
  // R2 fall
  sf('S-R2-cant', 'Fall, 6 minutes on the floor, "I can\'t get up"', { person: 'hessa', toggles: { fall: true }, speech: 'usual', answer: 'cant' }, 'R2', 'R7', 'call-998', { group: g })
  sf('S-R2-noanswer', 'Fall, 6 minutes on the floor, no answer', { person: 'hessa', toggles: { fall: true }, speech: 'none' }, 'R2', 'R7', 'call-998', { group: g })
  sf('S-R2-up', 'Fall, still on the floor after 6 minutes, then "I am fine, I can get up"', { person: 'hessa', toggles: { fall: true }, speech: 'usual', answer: 'ok' }, 'R2', 'R11', 'home-plan', { group: g })
  sf('S-R2-brief', 'Fall but up again after 1 minute', { person: 'hessa', toggles: { fall: true }, set: [set('floor', 1)] }, null, 'R12', 'no-action', { group: g, near: 'R2' })
  // R3 low sugar
  sf('S-R3-home', 'Glucose 2.7 mmol/L, drinks the juice, speech normal', { person: 'saeed', set: [set('glu', 2.7)], speech: 'usual', answer: 'drink' }, 'R3', 'R9', 'home-plan', { group: g })
  sf('S-R3-confused', 'Glucose 2.7 mmol/L, confused answer', { person: 'saeed', set: [set('glu', 2.7)], speech: 'usual', answer: 'confused' }, 'R3', 'R6', 'call-998', { group: g })
  sf('S-R3-noanswer', 'Glucose 2.7 mmol/L, no answer', { person: 'saeed', set: [set('glu', 2.7)], speech: 'usual', answer: 'none' }, 'R3', 'R6', 'call-998', { group: g })
  sf('S-R3-nospeech', 'Glucose 2.7 mmol/L, no speech at all', { person: 'saeed', set: [set('glu', 2.7)], speech: 'none' }, 'R3', 'R6', 'call-998', { group: g })
  sf('S-R3-normal', 'Glucose 5.6 mmol/L, nothing else', { person: 'saeed', set: [set('glu', 5.6)] }, null, 'R12', 'no-action', { group: g, near: 'R3' })
  // R4 weight / oxygen
  sf('S-R4-weight', 'Weight up 2.4 kg, "a bit breathless, 3 pillows"', { person: 'mariam', set: [set('wt', 2.4)], speech: 'usual', answer: 'pillows' }, 'R4', 'R10', 'same-day-clinic', { group: g })
  sf('S-R4-rest', 'Weight up 2.4 kg, "very breathless even sitting still"', { person: 'mariam', set: [set('wt', 2.4)], speech: 'usual', answer: 'rest' }, 'R4', 'R8', 'call-998', { group: g })
  sf('S-R4-fine', 'Weight up 2.4 kg, "I feel fine"', { person: 'mariam', set: [set('wt', 2.4)], speech: 'usual', answer: 'fine' }, 'R4', 'R10', 'same-day-clinic', { group: g })
  sf('S-R4-oxygen', 'Oxygen 93% and weight up 2.4 kg: the case 4 default', { person: 'mariam', set: [set('wt', 2.4), set('spo2', 93)], speech: 'usual', answer: 'pillows' }, 'R4', 'R10', 'same-day-clinic', { group: g })
  sf('S-R4-spo2-89', 'Oxygen 89%, "I feel fine"', { person: 'mariam', set: [set('spo2', 89)], speech: 'usual', answer: 'fine' }, 'R4', 'R8', 'call-998', { group: g })
  sf('S-R4-normal', 'Weight up 1.5 kg, oxygen 96%', { person: 'mariam', set: [set('wt', 1.5)] }, null, 'R12', 'no-action', { group: g, near: 'R4' })
  // R5 speech
  sf('S-R5-quiet-slurred', 'Everything normal at the sensors, speech check slurred', { set: [set('hr', 138), set('dur', 12)], speech: 'slurred', answer: 'fine' }, 'R1', 'R5', 'call-998', { group: g, speech: 'red' })
  // R12
  sf('S-R12-baseline', 'Everything normal', {}, null, 'R12', 'no-action', { group: g })
  sf('S-R12-fast-moving', 'Heart rate 150 while exercising for 15 minutes', { set: [set('hr', 150), set('dur', 15)], toggles: { still: false } }, null, 'R12', 'no-action', { group: g, near: 'R1' })
  sf('S-R12-glucose-off', 'Glucose sensor off for a person with diabetes, everything else normal', { person: 'saeed' }, null, 'R12', 'no-action', { group: g, warn: 'glu', note: 'A missing optional sensor warns but never blocks the watch.' })
}

/* ---------------------------------------------------------------- boundary values */
function boundaries() {
  const g = 'boundary'
  const hr = (id: string, bpm: number, dur: number, trig: string | null, rule: string, decision: DecisionClass, title: string) =>
    sf(id, title, { set: [set('hr', bpm), set('dur', dur)], speech: 'usual', answer: 'fine' }, trig, rule, decision, { group: g, near: 'R1' })
  hr('B-hr-120', 120, 12, null, 'R12', 'no-action', 'Heart rate exactly 120 for 12 minutes (the rule says above 120)')
  hr('B-hr-121', 121, 12, 'R1', 'R1', 'stand-down', 'Heart rate 121 for 12 minutes, normal speech and "I am fine"')
  hr('B-hr-119', 119, 12, null, 'R12', 'no-action', 'Heart rate 119 for 12 minutes')
  hr('B-dur-9', 138, 9, null, 'R12', 'no-action', 'Heart rate 138 for 9 minutes (one minute short)')
  hr('B-dur-10', 138, 10, 'R1', 'R1', 'stand-down', 'Heart rate 138 for exactly 10 minutes, normal speech and "I am fine"')
  hr('B-dur-11', 138, 11, 'R1', 'R1', 'stand-down', 'Heart rate 138 for 11 minutes, normal speech and "I am fine"')
  hr('B-hr-180', 180, 20, 'R1', 'R1', 'stand-down', 'Highest plausible reading: 180 bpm for 20 minutes, normal speech')
  const fl = (id: string, floor: number, trig: string | null, rule: string, decision: DecisionClass, title: string) =>
    sf(id, title, { person: 'hessa', toggles: { fall: true }, set: [set('floor', floor)], speech: 'usual', answer: 'ok' }, trig, rule, decision, { group: g, near: 'R2' })
  fl('B-floor-1', 1, null, 'R12', 'no-action', 'Fall, 1 minute on the floor')
  fl('B-floor-2', 2, 'R2', 'R11', 'home-plan', 'Fall, exactly 2 minutes on the floor, then up and well')
  fl('B-floor-3', 3, 'R2', 'R11', 'home-plan', 'Fall, 3 minutes on the floor, then up and well')
  const gl = (id: string, glu: number, trig: string | null, rule: string, decision: DecisionClass, title: string) =>
    sf(id, title, { person: 'saeed', set: [set('glu', glu)], speech: 'usual', answer: 'drink' }, trig, rule, decision, { group: g, near: 'R3' })
  gl('B-glu-40', 4.0, null, 'R12', 'no-action', 'Glucose exactly 4.0 mmol/L (the rule says below 4.0)')
  gl('B-glu-39', 3.9, 'R3', 'R9', 'home-plan', 'Glucose 3.9 mmol/L, drinks the juice')
  gl('B-glu-30', 3.0, 'R3', 'R9', 'home-plan', 'Glucose exactly 3.0 mmol/L, drinks the juice')
  gl('B-glu-29', 2.9, 'R3', 'R9', 'home-plan', 'Glucose 2.9 mmol/L (severe), answers clearly: still fast sugar at home')
  gl('B-glu-15', 1.5, 'R3', 'R9', 'home-plan', 'Lowest plausible glucose, 1.5 mmol/L, answers clearly')
  const wt = (id: string, w: number, trig: string | null, rule: string, decision: DecisionClass, title: string) =>
    sf(id, title, { person: 'mariam', set: [set('wt', w)], speech: 'usual', answer: 'pillows' }, trig, rule, decision, { group: g, near: 'R4' })
  wt('B-wt-19', 1.9, null, 'R12', 'no-action', 'Weight up 1.9 kg in 3 days')
  wt('B-wt-20', 2.0, 'R4', 'R10', 'same-day-clinic', 'Weight up exactly 2.0 kg in 3 days')
  const ox = (id: string, spo2: number, trig: string | null, rule: string, decision: DecisionClass, title: string) =>
    sf(id, title, { person: 'mariam', set: [set('spo2', spo2)], speech: 'usual', answer: 'pillows' }, trig, rule, decision, { group: g, near: 'R4' })
  ox('B-spo2-93', 93, null, 'R12', 'no-action', 'Oxygen 93%')
  ox('B-spo2-92', 92, 'R4', 'R10', 'same-day-clinic', 'Oxygen exactly 92%, "3 pillows"')
  ox('B-spo2-90', 90, 'R4', 'R10', 'same-day-clinic', 'Oxygen exactly 90% (R8 says below 90)')
  ox('B-spo2-89', 89, 'R4', 'R8', 'call-998', 'Oxygen 89%, "3 pillows"')
  ox('B-spo2-80', 80, 'R4', 'R8', 'call-998', 'Lowest plausible oxygen, 80%')
  // The speech score edge (R5: below 0.6 is red; 0.8 and up is green)
  const sp = (id: string, typed: string, lvl: 'green' | 'amber' | 'red', title: string, rule: string, decision: DecisionClass, lang: 'en' | 'ar' = 'en') =>
    sf(id, title, { set: HR, lang, speech: { typed }, answer: 'fine' }, 'R1', rule, decision, { group: g, near: 'R5', speech: lvl })
  sp('B-speech-green', 'My name is Moza and I live in Abu', 'green', 'Typed speech: 9 of 10 words (score 0.9), "I am fine"', 'R1', 'stand-down')
  sp('B-speech-amber', 'My name is Moza and I live', 'amber', 'Typed speech: 7 of 10 words (score 0.7, amber), "I am fine"', 'R1', 'stand-down')
  sp('B-speech-red', 'My name is Moza', 'red', 'Typed speech: 4 of 10 words (score 0.4, red), "I am fine"', 'R5', 'call-998')
  sp('B-speech-ar-08', 'اسمي موزة وأعيش في', 'green', 'Arabic typed speech: score exactly 0.80 (green), "I am fine"', 'R1', 'stand-down', 'ar')
  sp('B-speech-ar-062', 'اسمي موزة وأعيش', 'amber', 'Arabic typed speech: score 0.62 (amber), "I am fine"', 'R1', 'stand-down', 'ar')
}

/* ---------------------------------------------------------------- tough inputs: implausible, missing, refused */
function tough() {
  const g = 'tough-input'
  const bad = (id: string, title: string, key: string, value: number | string | null, extra: Sx = {}) =>
    sf(id, title, { ...extra, set: [...(extra.set ?? []), refuse(key, value)] }, null, 'none', 'refused', { group: g, tough: true })
  bad('T-hr-400', 'Heart rate 400 bpm typed', 'hr', 400)
  bad('T-hr-0', 'Heart rate 0 bpm typed', 'hr', 0)
  bad('T-hr-30', 'Heart rate 30 bpm typed (below the plausible range)', 'hr', 30)
  bad('T-hr-neg', 'Heart rate -20 typed', 'hr', -20)
  bad('T-hr-text', 'Heart rate typed as the word "fast"', 'hr', 'fast')
  bad('T-hr-empty', 'Heart rate left empty', 'hr', '')
  bad('T-hr-null', 'Heart rate missing (null)', 'hr', null)
  bad('T-dur-99', 'Duration 99 minutes typed', 'dur', 99)
  bad('T-spo2-150', 'Oxygen 150% typed', 'spo2', 150)
  bad('T-spo2-50', 'Oxygen 50% typed (implausible, not an emergency reading)', 'spo2', 50)
  bad('T-glu-02', 'Glucose 0.2 mmol/L typed (person with diabetes)', 'glu', 0.2, { person: 'saeed' })
  bad('T-glu-40', 'Glucose 40 mmol/L typed (person with diabetes)', 'glu', 40, { person: 'saeed' })
  bad('T-glu-02-nodm', 'Glucose 0.2 mmol/L typed (person without diabetes)', 'glu', 0.2)
  bad('T-glu-40-nodm', 'Glucose 40 mmol/L typed (person without diabetes)', 'glu', 40)
  bad('T-wt-12', 'Weight change of 12 kg in 3 days typed', 'wt', 12, { person: 'mariam' })
  bad('T-floor-99', 'Fall with 99 minutes on the floor typed', 'floor', 99, { person: 'hessa', toggles: { fall: true } })
  sf('T-fix-hr', 'Heart rate 400 refused, then corrected to 138 for 12 minutes; slurred speech',
    { set: [refuse('hr', 400), set('hr', 138), set('dur', 12)], speech: 'slurred', answer: 'fine' }, 'R1', 'R5', 'call-998', { group: g, tough: true, note: 'The refused value must not stay: the corrected one drives the decision.' })
  sf('T-fix-glu', 'Glucose 0.2 refused, then corrected to 2.7; confused answer',
    { person: 'saeed', set: [refuse('glu', 0.2), set('glu', 2.7)], speech: 'usual', answer: 'confused' }, 'R3', 'R6', 'call-998', { group: g, tough: true })
  sf('T-keep-prev', 'Implausible heart rate 400 typed after a valid 138: the run waits for a valid value',
    { set: [set('hr', 138), set('dur', 12), refuse('hr', 400)] }, null, 'none', 'refused', { group: g, tough: true, note: 'The refused value leaves the valid one in place, but the issue stays open and blocks the run until a valid value is typed.' })
  sf('T-edge-hr-45', 'Lowest plausible heart rate, 45 bpm, accepted', { set: [set('hr', 45), set('dur', 12)] }, null, 'R12', 'no-action', { group: g, tough: true })
  sf('T-edge-spo2-100', 'Oxygen 100% accepted', { set: [set('spo2', 100)] }, null, 'R12', 'no-action', { group: g, tough: true })
  sf('T-edge-wt-neg', 'Weight down 2 kg accepted, no rule', { person: 'mariam', set: [set('wt', -2)] }, null, 'R12', 'no-action', { group: g, tough: true })
  sf('T-missing-glu-dm', 'Glucose sensor missing for a person with diabetes, heart rate fine', { person: 'saeed', set: [set('glu', null)] }, null, 'R12', 'no-action', { group: g, tough: true, warn: 'glu' })
  // typed speech
  sf('T-typed-gibberish', 'Typed speech "banana" at a heart-rate alert, "I am fine"', { set: HR, speech: { typed: 'banana' }, answer: 'fine' }, 'R1', 'R5', 'call-998', { group: g, tough: true, speech: 'red' })
  sf('T-typed-case', 'Typed speech in lower case with no capitals, "I am fine"', { set: HR, speech: { typed: 'my name is moza and i live in abu dhabi' }, answer: 'fine' }, 'R1', 'R1', 'stand-down', { group: g, tough: true, speech: 'green' })
  sf('T-typed-typos', 'Typed speech with typos, "I am fine"', { set: HR, speech: { typed: 'my nam is moza and i liv in abu dabi' }, answer: 'fine' }, 'R1', 'R1', 'stand-down', { group: g, tough: true, speech: 'green' })
}

/* ---------------------------------------------------------------- contradictory answers */
function contradictory() {
  const g = 'contradictory'
  const c = (id: string, title: string, o: Sx, trig: string | null, rule: string, decision: DecisionClass, note?: string) => sf(id, title, o, trig, rule, decision, { group: g, tough: true, note })
  c('C-fall-fine-speech-cant', 'Fall: normal speech, but "I can\'t get up"', { person: 'hessa', toggles: { fall: true }, speech: 'usual', answer: 'cant' }, 'R2', 'R7', 'call-998')
  c('C-fall-ok-slurred', 'Fall: "I can get up", but the speech is slurred', { person: 'hessa', toggles: { fall: true }, speech: 'slurred', answer: 'ok' }, 'R2', 'R5', 'call-998', 'A red speech check wins over a reassuring answer.')
  c('C-hypo-drink-slurred', 'Low sugar: "drinking it now", but slurred speech', { person: 'saeed', set: [set('glu', 2.7)], speech: 'slurred', answer: 'drink' }, 'R3', 'R6', 'call-998')
  c('C-hypo-fall', 'Low sugar and a fall together, clear answer: the low sugar comes first', { person: 'saeed', set: [set('glu', 2.8), set('floor', 5)], toggles: { fall: true }, speech: 'usual', answer: 'drink' }, 'R3', 'R9', 'home-plan')
  c('C-hr-hypo', 'Racing heart for 12 minutes and low sugar 3.5: low sugar is checked first', { person: 'saeed', set: [set('glu', 3.5), set('hr', 138), set('dur', 12)], speech: 'usual', answer: 'drink' }, 'R3', 'R9', 'home-plan')
  c('C-hf-weight-hypo', 'Weight up and low sugar, clear answer: low sugar first', { person: 'saeed', set: [set('glu', 3.5), set('wt', 2.5)], speech: 'usual', answer: 'drink' }, 'R3', 'R9', 'home-plan')
  c('C-hf-slurred', 'Weight up, "3 pillows", but slurred speech', { person: 'mariam', set: [set('wt', 2.4)], speech: 'slurred', answer: 'pillows' }, 'R4', 'R5', 'call-998')
  c('C-hf-nospeech', 'Weight up, no speech at all (no answer)', { person: 'mariam', set: [set('wt', 2.4)], speech: 'none' }, 'R4', 'R5', 'call-998')
  c('C-spo2-fine', 'Oxygen 88% but "I feel fine": the number wins', { person: 'mariam', set: [set('spo2', 88)], speech: 'usual', answer: 'fine' }, 'R4', 'R8', 'call-998')
  c('C-hr-moving-hf', 'Heart rate 150 moving (no R1) with weight up 2.5 kg: only R4', { set: [set('hr', 150), set('dur', 15), set('wt', 2.5)], toggles: { still: false }, speech: 'usual', answer: 'fine' }, 'R4', 'R10', 'same-day-clinic')
  c('C-hypo-fall-cant', 'Low sugar and a fall, "I can\'t get up": the fall makes it 998', { person: 'saeed', set: [set('glu', 2.8), set('floor', 5)], toggles: { fall: true }, speech: 'usual', answer: 'cant' }, 'R3', 'R7', 'call-998')
  c('C-hypo-spo2', 'Low sugar 2.7 and oxygen 88%, "drinking it now": the oxygen makes it 998', { person: 'saeed', set: [set('glu', 2.7), set('spo2', 88)], speech: 'usual', answer: 'drink' }, 'R3', 'R8', 'call-998')
  c('C-spo2-slurred', 'Oxygen 85% and slurred speech: possible stroke first', { person: 'mariam', set: [set('spo2', 85)], speech: 'slurred' }, 'R4', 'R5', 'call-998')
}

/* ---------------------------------------------------------------- night and day: the same case at different times */
function nightDay() {
  const g = 'night-day'
  const times: [string, number][] = [['0112', 72], ['0545', 345], ['0600', 360], ['1000', 600], ['1500', 900], ['2330', 1410]]
  for (const [hm, start] of times) {
    const s = { start, tag: `${hm.slice(0, 2)}:${hm.slice(2)}` }
    sf(`N-R5-${hm}`, `Racing heart, slurred speech, at ${s.tag}`, { start, set: HR, speech: 'slurred', answer: 'fine' }, 'R1', 'R5', 'call-998', { group: g })
    sf(`N-R9-${hm}`, `Low sugar 2.7, clear answer, at ${s.tag}`, { start, person: 'saeed', set: [set('glu', 2.7)], speech: 'usual', answer: 'drink' }, 'R3', 'R9', 'home-plan', { group: g })
    sf(`N-R12-${hm}`, `Nothing wrong at ${s.tag}`, { start }, null, 'R12', 'no-action', { group: g })
  }
  sf('N-R7-1000', 'Fall, "can\'t get up", at 10:00', { start: 600, person: 'hessa', toggles: { fall: true }, speech: 'usual', answer: 'cant' }, 'R2', 'R7', 'call-998', { group: g })
  sf('N-R10-1000', 'Weight up, "3 pillows", at 10:00', { start: 600, person: 'mariam', set: [set('wt', 2.4)], speech: 'usual', answer: 'pillows' }, 'R4', 'R10', 'same-day-clinic', { group: g })
}

/* ---------------------------------------------------------------- Arabic speech check */
function arabic() {
  const g = 'arabic'
  const a = (id: string, title: string, o: Sx, trig: string | null, rule: string, decision: DecisionClass, f: { speech?: 'green' | 'amber' | 'red' | 'none'; tough?: boolean } = {}) =>
    sf(id, title, { ...o, lang: 'ar' }, trig, rule, decision, { group: g, tough: f.tough, speech: f.speech })
  a('A-R5-slurred', 'Arabic: racing heart, slurred speech', { set: HR, speech: 'slurred', answer: 'fine' }, 'R1', 'R5', 'call-998', { speech: 'red' })
  a('A-R1-clear', 'Arabic: racing heart, usual speech, "I am fine"', { set: HR, speech: 'usual', answer: 'fine' }, 'R1', 'R1', 'stand-down', { speech: 'green' })
  a('A-R5-none', 'Arabic: racing heart, no answer', { set: HR, speech: 'none' }, 'R1', 'R5', 'call-998', { speech: 'none' })
  a('A-R9', 'Arabic: low sugar, clear answer', { person: 'saeed', set: [set('glu', 2.7)], speech: 'usual', answer: 'drink' }, 'R3', 'R9', 'home-plan', { speech: 'green' })
  a('A-R6', 'Arabic: low sugar, confused', { person: 'saeed', set: [set('glu', 2.7)], speech: 'usual', answer: 'confused' }, 'R3', 'R6', 'call-998')
  a('A-R7', 'Arabic: fall, "can\'t get up"', { person: 'hessa', toggles: { fall: true }, speech: 'usual', answer: 'cant' }, 'R2', 'R7', 'call-998')
  a('A-R11', 'Arabic: fall, up and well', { person: 'hessa', toggles: { fall: true }, speech: 'usual', answer: 'ok' }, 'R2', 'R11', 'home-plan')
  a('A-R10', 'Arabic: weight up, "3 pillows"', { person: 'mariam', set: [set('wt', 2.4)], speech: 'usual', answer: 'pillows' }, 'R4', 'R10', 'same-day-clinic')
  a('A-R8', 'Arabic: weight up, breathless at rest', { person: 'mariam', set: [set('wt', 2.4)], speech: 'usual', answer: 'rest' }, 'R4', 'R8', 'call-998')
  a('A-R12', 'Arabic: nothing wrong', {}, null, 'R12', 'no-action')
  a('A-typed-exact', 'Arabic: the sentence typed exactly, "I am fine"', { set: HR, speech: { typed: 'اسمي موزة وأعيش في أبوظبي' }, answer: 'fine' }, 'R1', 'R1', 'stand-down', { speech: 'green', tough: true })
  a('A-typed-alef', 'Arabic: alef spelled with hamza (أسمي), "I am fine"', { set: HR, speech: { typed: 'أسمي موزة وأعيش في أبوظبي' }, answer: 'fine' }, 'R1', 'R1', 'stand-down', { speech: 'green', tough: true })
  a('A-typed-short', 'Arabic: one word typed (مرحبا), "I am fine"', { set: HR, speech: { typed: 'مرحبا' }, answer: 'fine' }, 'R1', 'R5', 'call-998', { speech: 'red', tough: true })
  a('A-typed-english', 'Arabic mode: the English sentence typed, "I am fine"', { set: HR, speech: { typed: 'My name is Moza and I live in Abu Dhabi' }, answer: 'fine' }, 'R1', 'R5', 'call-998', { speech: 'red', tough: true })
  a('A-refuse-hr', 'Arabic: heart rate 400 typed', { set: [refuse('hr', 400)] }, null, 'none', 'refused', { tough: true })
}

/* ---------------------------------------------------------------- the same rules for every person (age bands) */
function people() {
  const g = 'people'
  const all: PersonId[] = ['moza', 'hessa', 'saeed', 'mariam', 'hind', 'khalid', 'arjun', 'hamad', 'amna']
  for (const p of all) {
    sf(`P-${p}-R5`, `${PEOPLE[p].child ? 'Child' : 'Adult'} (${p}): racing heart, slurred speech`, { person: p, set: HR, speech: 'slurred', answer: 'fine' }, 'R1', 'R5', 'call-998', { group: g })
    sf(`P-${p}-R12`, `${PEOPLE[p].child ? 'Child' : 'Adult'} (${p}): nothing wrong`, { person: p }, null, 'R12', 'no-action', { group: g })
  }
  for (const p of ['khalid', 'hamad', 'arjun'] as PersonId[]) {
    sf(`P-${p}-R9`, `(${p}): low sugar 2.7, clear answer`, { person: p, set: [set('glu', 2.7)], speech: 'usual', answer: 'drink' }, 'R3', 'R9', 'home-plan', { group: g })
  }
  for (const p of ['moza', 'amna', 'hamad'] as PersonId[]) {
    sf(`P-${p}-R10`, `(${p}): weight up 2.4 kg, "3 pillows"`, { person: p, set: [set('wt', 2.4)], speech: 'usual', answer: 'pillows' }, 'R4', 'R10', 'same-day-clinic', { group: g })
  }
}

/* ---------------------------------------------------------------- prevention */
type Pv = Extract<Setup, { kind: 'prev' }>
function prev(id: string, group: BenchGroup, title: string, setup: Omit<Pv, 'kind'>, expected: Partial<Outcome> & Pick<Outcome, 'rule' | 'decision'>, f: { tough?: boolean; near?: string; age?: AgeBand; note?: string } = {}) {
  add({ id, group, title, setup: { kind: 'prev', ...setup }, expected, near: f.near, note: f.note, tough: f.tough, age: f.age })
}
const A = (n: number): AgeBand => band(n)

function preventionRules() {
  const g = 'prevention-rules'
  // P2: not eligible / nothing due; P1: eligible and due (the barrier question follows)
  prev('V-wc-18', g, 'Well-child: 18 months, Emirati, visit overdue: eligible, so Noa asks for the barrier (not another reminder)', { pv: 'wellchild' }, { rule: 'P1', decision: 'ask-barrier' }, { age: 'child', near: 'P2' })
  prev('V-ifhas-ask', g, 'Adult screening: 47, Emirati, never screened: Noa asks for the barrier', { pv: 'ifhas' }, { rule: 'P1', decision: 'ask-barrier' }, { age: A(47), near: 'P2' })
  prev('V-expat-ask', g, 'Expatriate child: eligible, Noa asks for the barrier', { pv: 'expat' }, { rule: 'P1', decision: 'ask-barrier' }, { age: 'child', near: 'P2' })
  prev('V-bone-ask', g, 'Bone check: Emirati man of 74, Noa asks for the barrier', { pv: 'bone' }, { rule: 'P1', decision: 'ask-barrier' }, { age: A(74), near: 'P2' })
  prev('V-wc-0', g, 'Well-child: 0 months (too young)', { pv: 'wellchild', set: [set('age', 0)] }, { rule: 'P2', decision: 'stay-silent' }, { age: 'child', near: 'P1' })
  prev('V-wc-1', g, 'Well-child: 1 month (the first visit is due)', { pv: 'wellchild', set: [set('age', 1)], barrier: 'forgot' }, { rule: 'P7', decision: 'barrier-help' }, { age: 'child', near: 'P2' })
  prev('V-wc-72', g, 'Well-child: 72 months (the last visit is due)', { pv: 'wellchild', set: [set('age', 72)], barrier: 'forgot' }, { rule: 'P7', decision: 'barrier-help' }, { age: 'child', near: 'P2' })
  prev('V-wc-73', g, 'Well-child: 73 months (past the schedule)', { pv: 'wellchild', set: [set('age', 73)] }, { rule: 'P2', decision: 'stay-silent' }, { age: 'child', near: 'P1' })
  prev('V-ifhas-47', g, 'Adult screening: 47, Emirati, never screened', { pv: 'ifhas', barrier: 'value' }, { rule: 'P6', decision: 'barrier-help' }, { age: A(47), near: 'P2' })
  prev('V-ifhas-expat', g, 'Adult screening: expatriate (not in the programme)', { pv: 'ifhas', nat: 'Expatriate' }, { rule: 'P2', decision: 'stay-silent' }, { age: A(47), near: 'P1' })
  prev('V-ifhas-17', g, 'Adult screening: 17 years (under 18)', { pv: 'ifhas', set: [set('age', 17)] }, { rule: 'P2', decision: 'stay-silent' }, { age: A(17), near: 'P1' })
  prev('V-ifhas-18', g, 'Adult screening: exactly 18, Emirati', { pv: 'ifhas', set: [set('age', 18)], barrier: 'forgot' }, { rule: 'P7', decision: 'barrier-help' }, { age: A(18), near: 'P2' })
  prev('V-ifhas-75', g, 'Adult screening: exactly 75, Emirati', { pv: 'ifhas', set: [set('age', 75)], barrier: 'forgot' }, { rule: 'P7', decision: 'barrier-help' }, { age: A(75), near: 'P2' })
  prev('V-ifhas-76', g, 'Adult screening: 76 (over 75)', { pv: 'ifhas', set: [set('age', 76)] }, { rule: 'P2', decision: 'stay-silent' }, { age: A(76), near: 'P1' })
  prev('V-bone-expat', g, 'Bone check: an expatriate man of 74', { pv: 'bone', nat: 'Expatriate' }, { rule: 'P2', decision: 'stay-silent' }, { age: A(74), near: 'P1' })
  prev('V-expat-4', g, 'Expatriate child, 4 months: eligible for the well-child schedule', { pv: 'expat', barrier: 'awareness' }, { rule: 'P3', decision: 'barrier-help' }, { age: 'child', near: 'P2' })
  // Barriers -> enablers (P3 to P8), on two different cases
  const bar: [string, string][] = [['awareness', 'P3'], ['access', 'P4'], ['trust', 'P5'], ['value', 'P6'], ['forgot', 'P7'], ['decline', 'P8']]
  for (const [b, rule] of bar) {
    const d: DecisionClass = b === 'decline' ? 'respect-choice' : 'barrier-help'
    prev(`V-bar-wc-${b}`, g, `Well-child: barrier "${b}" gets enabler ${rule}`, { pv: 'wellchild', barrier: b }, { rule, decision: d }, { age: 'child' })
    prev(`V-bar-ifhas-${b}`, g, `Adult screening: barrier "${b}" gets enabler ${rule}`, { pv: 'ifhas', barrier: b }, { rule, decision: d }, { age: A(47) })
  }
  prev('V-bar-bone-decline', g, 'Bone check: "not now" is respected (no nudge for 3 months)', { pv: 'bone', barrier: 'decline' }, { rule: 'P8', decision: 'respect-choice' }, { age: A(74) })
  // tough: implausible prevention inputs
  prev('V-tough-age-200', g, 'Adult screening: age typed as 200', { pv: 'ifhas', set: [refuse('age', 200)] }, { rule: 'none', decision: 'refused' }, { tough: true, age: A(47) })
  prev('V-tough-age-neg', g, 'Adult screening: age typed as -4', { pv: 'ifhas', set: [refuse('age', -4)] }, { rule: 'none', decision: 'refused' }, { tough: true, age: A(47) })
  prev('V-tough-age-text', g, 'Adult screening: age typed as "forty"', { pv: 'ifhas', set: [refuse('age', 'forty')] }, { rule: 'none', decision: 'refused' }, { tough: true, age: A(47) })
  prev('V-tough-age-empty', g, 'Adult screening: age left empty', { pv: 'ifhas', set: [refuse('age', null)] }, { rule: 'none', decision: 'refused' }, { tough: true, age: A(47) })
  prev('V-tough-child-age-120', g, 'Well-child: age typed as 120 months', { pv: 'wellchild', set: [refuse('age', 120)] }, { rule: 'none', decision: 'refused' }, { tough: true, age: 'child' })
  prev('V-tough-weeks', g, 'Well-child: 99 weeks overdue typed', { pv: 'wellchild', set: [refuse('overdue', 99)] }, { rule: 'none', decision: 'refused' }, { tough: true, age: 'child' })
  prev('V-tough-fix', g, 'Adult screening: age 200 refused, corrected to 47, barrier "value"', { pv: 'ifhas', set: [refuse('age', 200), set('age', 47)], barrier: 'value' }, { rule: 'P6', decision: 'barrier-help' }, { tough: true, age: A(47) })
}

function preventionResults() {
  const g = 'prevention-results'
  const r = (id: string, pv: Pv['pv'], value: number, label: string, decision: 'refer' | 'passport-ok', detail: string, age: AgeBand, tough = false) =>
    prev(id, g, `${label}`, { pv, result: value }, { rule: 'P9', decision, detail }, { age, near: 'P9', tough })
  // well-child words at 18 months: below 3 words is referred
  r('RS-wc-0', 'wellchild', 0, 'Well-child: 0 words besides mama and dada', 'refer', 'refer', 'child', true)
  r('RS-wc-2', 'wellchild', 2, 'Well-child: 2 words (the case default)', 'refer', 'refer', 'child')
  r('RS-wc-3', 'wellchild', 3, 'Well-child: exactly 3 words', 'passport-ok', 'ok', 'child')
  r('RS-wc-10', 'wellchild', 10, 'Well-child: 10 words', 'passport-ok', 'ok', 'child')
  // HbA1c: 6.5 and over diabetes range, 5.7 to 6.4 prediabetes
  r('RS-a1c-45', 'ifhas', 4.5, 'HbA1c 4.5%', 'passport-ok', 'ok', A(47))
  r('RS-a1c-56', 'ifhas', 5.6, 'HbA1c 5.6% (just below prediabetes)', 'passport-ok', 'ok', A(47))
  r('RS-a1c-57', 'ifhas', 5.7, 'HbA1c exactly 5.7% (prediabetes)', 'refer', 'pre', A(47))
  r('RS-a1c-64', 'ifhas', 6.4, 'HbA1c 6.4% (prediabetes)', 'refer', 'pre', A(47))
  r('RS-a1c-65', 'ifhas', 6.5, 'HbA1c exactly 6.5% (diabetes range)', 'refer', 'dm', A(47))
  r('RS-a1c-74', 'ifhas', 7.4, 'HbA1c 7.4% (the case default)', 'refer', 'dm', A(47))
  r('RS-a1c-12', 'ifhas', 12, 'HbA1c 12% (highest on the slider)', 'refer', 'dm', A(47), true)
  // weight-for-age centile: below the 2nd or above the 98th
  r('RS-ct-1', 'expat', 1, 'Centile 1 (below the 2nd)', 'refer', 'refer', 'child')
  r('RS-ct-2', 'expat', 2, 'Centile exactly 2', 'passport-ok', 'ok', 'child')
  r('RS-ct-40', 'expat', 40, 'Centile 40 (the case default)', 'passport-ok', 'ok', 'child')
  r('RS-ct-98', 'expat', 98, 'Centile exactly 98', 'passport-ok', 'ok', 'child')
  r('RS-ct-99', 'expat', 99, 'Centile 99 (above the 98th)', 'refer', 'refer', 'child')
  r('RS-ct-0', 'expat', 0, 'Centile 0', 'refer', 'refer', 'child', true)
  // bone T-score: -2.5 and lower osteoporosis; between -1 and -2.5 low bone density
  r('RS-bone-4', 'bone', -4, 'T-score -4 (lowest on the slider)', 'refer', 'osteo', A(74), true)
  r('RS-bone-27', 'bone', -2.7, 'T-score -2.7 (the case default)', 'refer', 'osteo', A(74))
  r('RS-bone-25', 'bone', -2.5, 'T-score exactly -2.5 (osteoporosis)', 'refer', 'osteo', A(74))
  r('RS-bone-24', 'bone', -2.4, 'T-score -2.4 (low bone density)', 'refer', 'low', A(74))
  r('RS-bone-11', 'bone', -1.1, 'T-score -1.1 (low bone density)', 'refer', 'low', A(74))
  r('RS-bone-1', 'bone', -1, 'T-score exactly -1 (healthy)', 'passport-ok', 'ok', A(74))
  r('RS-bone-pos', 'bone', 1, 'T-score +1 (highest on the slider)', 'passport-ok', 'ok', A(74))
}

/* ---------------------------------------------------------------- family */
const fam = (id: string, group: BenchGroup, title: string, setup: Setup, expected: Partial<Outcome> & Pick<Outcome, 'rule' | 'decision'>, f: { tough?: boolean; near?: string; age: AgeBand; note?: string }) =>
  add({ id, group, title, setup, expected, near: f.near, note: f.note, tough: f.tough, age: f.age, openAs: 'family' })

function familyResults() {
  const g = 'family-results'
  const r = (id: string, rid: string, v: number, label: string, decision: 'refer' | 'passport-ok', detail: string, age: AgeBand, o: { tough?: boolean; warn?: string } = {}) =>
    fam(`FR-${id}`, g, label, { kind: 'famResult', id: rid, value: v }, { rule: 'P9', decision, detail, ...(o.warn ? { warn: o.warn } : {}) }, { age, near: 'P9', tough: o.tough })
  r('hind-2', 'hind', 2, 'Hind (18 months): 2 words', 'refer', 'refer', 'child')
  r('hind-3', 'hind', 3, 'Hind (18 months): exactly 3 words', 'passport-ok', 'ok', 'child')
  r('maitha-56', 'maitha_a1c', 5.6, 'Maitha: HbA1c 5.6%', 'passport-ok', 'ok', band(25))
  r('maitha-57', 'maitha_a1c', 5.7, 'Maitha: HbA1c exactly 5.7%', 'refer', 'pre', band(25))
  r('maitha-65', 'maitha_a1c', 6.5, 'Maitha: HbA1c exactly 6.5%', 'refer', 'dm', band(25))
  r('khalid-56', 'khalid_a1c', 5.6, 'Khalid: HbA1c 5.6%', 'passport-ok', 'ok', band(47))
  r('khalid-64', 'khalid_a1c', 6.4, 'Khalid: HbA1c 6.4%', 'refer', 'pre', band(47))
  r('khalid-65', 'khalid_a1c', 6.5, 'Khalid: HbA1c exactly 6.5%', 'refer', 'dm', band(47))
  r('amna-56', 'amna_a1c', 5.6, 'Amna: HbA1c 5.6%', 'passport-ok', 'ok', band(45))
  r('amna-57', 'amna_a1c', 5.7, 'Amna: HbA1c exactly 5.7%', 'refer', 'pre', band(45))
  r('amna-65', 'amna_a1c', 6.5, 'Amna: HbA1c exactly 6.5%', 'refer', 'dm', band(45))
  r('tc-74', 'khalid_tc', 7.4, 'Khalid: total cholesterol 7.4 mmol/L (used in his heart risk)', 'passport-ok', 'ok', band(47))
  r('tc-75', 'khalid_tc', 7.5, 'Khalid: total cholesterol exactly 7.5 mmol/L', 'refer', 'refer', band(47))
  r('sbp-159', 'khalid_sbp', 159, 'Khalid: blood pressure 159 mmHg (used in his heart risk)', 'passport-ok', 'ok', band(47))
  r('sbp-160', 'khalid_sbp', 160, 'Khalid: blood pressure exactly 160 mmHg', 'refer', 'refer', band(47))
  r('acr-29', 'saeed_acr', 2.9, 'Saeed: urine albumin 2.9 mg/mmol', 'passport-ok', 'ok', band(69))
  r('acr-30', 'saeed_acr', 3, 'Saeed: urine albumin exactly 3 mg/mmol', 'refer', 'refer', band(69))
  r('sultan-139', 'sultan_sbp', 139, 'Sultan: blood pressure 139 mmHg', 'passport-ok', 'ok', band(21))
  r('sultan-140', 'sultan_sbp', 140, 'Sultan: blood pressure exactly 140 mmHg', 'refer', 'refer', band(21))
  // implausible family results are clamped to the slider's range with a warning (the family flow does not block)
  r('a1c-clamp-hi', 'khalid_a1c', 40, 'Khalid: HbA1c 40% typed (above the plausible 12%): kept at 12% with a warning', 'refer', 'dm', band(47), { tough: true, warn: 'res.khalid_a1c' })
  r('a1c-clamp-lo', 'amna_a1c', 1, 'Amna: HbA1c 1% typed (below the plausible 4.5%): kept at 4.5% with a warning', 'passport-ok', 'ok', band(45), { tough: true, warn: 'res.amna_a1c' })
  r('sbp-clamp', 'sultan_sbp', 400, 'Sultan: blood pressure 400 typed: kept at the highest plausible value with a warning', 'refer', 'refer', band(21), { tough: true, warn: 'res.sultan_sbp' })
}

function familyForecast() {
  const g = 'family-forecast'
  const f = (id: string, title: string, member: string, edits: FamEdit[], expected: Partial<Outcome> & Pick<Outcome, 'rule' | 'decision'>, age: AgeBand, o: { before?: string[]; tough?: boolean; near?: string; note?: string } = {}) =>
    fam(`FF-${id}`, g, title, { kind: 'famRisk', member, edits, before: o.before }, { agent: 'forecast', ...expected }, { age, tough: o.tough, near: o.near, note: o.note })
  const set$ = (field: string, value: number): FamEdit => ({ op: 'set', field, value })
  const tog = (field: string): FamEdit => ({ op: 'toggle', field })
  // F1: 20% or more; F2: 10 to 20% with no cholesterol; validity: ages 30 to 74, no heart attack or stroke
  f('khalid-default', 'Khalid (47, smoker, cholesterol not measured): 18%, so measure cholesterol', 'khalid', [], { rule: 'F2', decision: 'measure-cholesterol', detail: 'mid', alert: false }, band(47))
  f('khalid-sbp140', 'Khalid with blood pressure 140: just under 20%', 'khalid', [set$('sbp', 140)], { rule: 'F2', decision: 'measure-cholesterol', detail: 'mid' }, band(47), { near: 'F1' })
  f('khalid-sbp150', 'Khalid with blood pressure 150: above 20%', 'khalid', [set$('sbp', 150)], { rule: 'F1', decision: 'doctor-review', detail: 'high', alert: false }, band(47), { near: 'F2', note: 'Khalid already has an open alert, so no second alert is stacked on top of it.' })
  f('khalid-dm', 'Khalid with diabetes and blood pressure 160', 'khalid', [set$('sbp', 160), tog('dm')], { rule: 'F1', decision: 'doctor-review', detail: 'high' }, band(47))
  f('khalid-labs', 'Khalid with cholesterol measured: 14%, F2 no longer applies', 'khalid', [tog('labs')], { rule: 'none', decision: 'no-action', detail: 'mid' }, band(47), { near: 'F2' })
  f('khalid-low', 'Khalid, non-smoker, blood pressure 110, BMI 22: low risk', 'khalid', [tog('smoker'), set$('sbp', 110), set$('bmi', 22)], { rule: 'none', decision: 'no-action', detail: 'low' }, band(47), { near: 'F2' })
  f('khalid-cvd', 'Khalid with a known heart attack or stroke: not scored', 'khalid', [tog('cvd')], { rule: 'none', decision: 'not-scored', detail: 'cvd' }, band(47), { near: 'F1' })
  f('amna-low', 'Amna: low risk, nothing to do', 'amna', [], { rule: 'none', decision: 'no-action', detail: 'low', alert: false }, band(45))
  f('amna-high-alert', 'Amna (alert closed) becomes high risk: Forecast raises one doctor-review alert', 'amna', [tog('smoker'), tog('dm'), set$('sbp', 160), tog('bpTx')], { rule: 'F1', decision: 'doctor-review', detail: 'high', alert: true }, band(45), { before: ['keep_amna'] })
  f('amna-high-open', 'Amna with an open alert becomes high risk: no second alert on top', 'amna', [tog('smoker'), tog('dm'), set$('sbp', 160), tog('bpTx')], { rule: 'F1', decision: 'doctor-review', detail: 'high', alert: false }, band(45), { note: 'The alert is not stacked on an open one.' })
  f('amna-low-closed', 'Amna (alert closed), low risk: no alert', 'amna', [], { rule: 'none', decision: 'no-action', detail: 'low', alert: false }, band(45), { before: ['keep_amna'], near: 'F1' })
  f('maitha-29', 'Maitha aged 29: below the score\'s age range', 'maitha', [set$('age', 29)], { rule: 'none', decision: 'not-scored', detail: 'under30' }, band(29), { near: 'F1', tough: true })
  f('maitha-30', 'Maitha aged exactly 30: scored (low)', 'maitha', [set$('age', 30)], { rule: 'none', decision: 'no-action', detail: 'low' }, band(30), { near: 'F1' })
  f('saeed-74', 'Saeed aged exactly 74: scored (high)', 'saeed', [set$('age', 74)], { rule: 'F1', decision: 'doctor-review', detail: 'high' }, band(74), { near: 'F1' })
  f('saeed-75', 'Saeed aged 75: above the score\'s age range', 'saeed', [set$('age', 75)], { rule: 'none', decision: 'not-scored', detail: 'over74' }, band(75), { near: 'F1', tough: true })
  f('saeed-default', 'Saeed (69, diabetes): high risk, doctor review', 'saeed', [], { rule: 'F1', decision: 'doctor-review', detail: 'high' }, band(69))
  f('moza-cvd', 'Moza (78, had a stroke): not scored', 'moza', [], { rule: 'none', decision: 'not-scored', detail: 'cvd' }, band(78), { near: 'F1' })
  f('hind-child', 'Hind (18 months): not scored (a child)', 'hind', [], { rule: 'none', decision: 'not-scored', detail: 'child' }, 'child', { near: 'F1' })
  f('sultan-21', 'Sultan (21, smoker): under 30, not scored', 'sultan', [], { rule: 'none', decision: 'not-scored', detail: 'under30' }, band(21), { near: 'F1' })
  f('tough-age-clamp', 'Maitha: age typed as 200 is kept at 90 (over 74, not scored)', 'maitha', [set$('age', 200)], { rule: 'none', decision: 'not-scored', detail: 'over74' }, band(90), { tough: true })
}

/** The whole set, in a fixed order. */
function build(): Scenario[] {
  list = []
  safetyRules(); boundaries(); tough(); contradictory(); nightDay(); arabic(); people()
  preventionRules(); preventionResults(); familyResults(); familyForecast()
  const out = list
  list = []
  return out
}

export const SCENARIOS: readonly Scenario[] = build()

/** Every rule the benchmark covers, in the order of the published tables. */
export const RULE_IDS: readonly string[] = [
  'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12',
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'F1', 'F2',
]
export const SAMPLE_KEYS: readonly SampleKey[] = ['usual', 'slurred', 'none']
