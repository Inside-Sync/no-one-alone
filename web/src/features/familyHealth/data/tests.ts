import type { FhIcon, NoaLang, PersonId, QsetId, SampleKey, VtId } from './types'

/**
 * Home screening by voice (prototype VT, QS, QDEF, SAMPLES, SENT). Texts: `vt.<id>.{name,short,tool,ev}`, questionnaire items
 * `qs.<test>.<item>`, choice cards `choice.<qid>.{q,<option>}`.
 */
export const VT: Record<VtId, { icon: FhIcon }> = {
  speech: { icon: 'speech' },
  hypo: { icon: 'droplet' },
  din: { icon: 'ear' },
  falls: { icon: 'footprints' },
  phq2: { icon: 'message-circle' },
  stopbang: { icon: 'bed' },
  dmrisk: { icon: 'droplet' },
}
/** The order selectTests considers the tests in (skipped ones keep this order too). */
export const VT_ORDER: readonly VtId[] = ['speech', 'din', 'falls', 'dmrisk', 'stopbang', 'phq2']

/** Thresholds of the test selection. */
export const SELECT = { dinFrom: 60, fallsFrom: 60, dmBmi: 25, stopbangAge: 35, stopbangBmi: 27, stopbangSbp: 130 } as const

/** One questionnaire line: answered by the person (yes/no or PHQ 0-3) or filled from the record (`auto`). */
export type QItemKind = 'yn' | 'phq' | 'auto'
export const QSET_ITEMS: Record<QsetId, { id: string; kind: QItemKind }[]> = {
  falls: [{ id: 'fell', kind: 'yn' }, { id: 'unsteady', kind: 'yn' }, { id: 'worry', kind: 'yn' }],
  phq2: [{ id: 'int', kind: 'phq' }, { id: 'down', kind: 'phq' }],
  stopbang: [
    { id: 'snore', kind: 'yn' }, { id: 'tired', kind: 'yn' }, { id: 'obs', kind: 'yn' }, { id: 'neck', kind: 'yn' },
    { id: 'P', kind: 'auto' }, { id: 'B', kind: 'auto' }, { id: 'A', kind: 'auto' }, { id: 'G', kind: 'auto' },
  ],
  dmrisk: [
    { id: 'act', kind: 'yn' }, { id: 'age', kind: 'auto' }, { id: 'sex', kind: 'auto' }, { id: 'gdm', kind: 'auto' },
    { id: 'fam', kind: 'auto' }, { id: 'hbp', kind: 'auto' }, { id: 'bmi', kind: 'auto' },
  ],
}
/** PHQ answer values 0..3 (texts `qs.phqScale.<n>`). */
export const PHQ_SCALE = [0, 1, 2, 3] as const

/** Default answers per person (prototype QDEF); a test case can override them. `din` = which of the 3 rounds are heard right. */
export type QVals = Record<string, boolean | number>
export const QDEFAULTS: Partial<Record<PersonId, Partial<Record<QsetId, QVals>> & { din?: boolean[] }>> = {
  saeed: { falls: { fell: false, unsteady: false, worry: false } },
  moza: { falls: { fell: false, unsteady: true, worry: true }, phq2: { int: 1, down: 2 }, dmrisk: { act: false }, din: [true, false, false] },
  khalid: { phq2: { int: 1, down: 0 }, stopbang: { snore: true, tired: true, obs: false, neck: true }, dmrisk: { act: false } },
  amna: { phq2: { int: 1, down: 0 }, dmrisk: { act: true } },
}

/** Score cut-offs of the questionnaires. */
export const QSCORE = { phq2Positive: 3, stopbangHigh: 5, stopbangMid: 3, dmriskHigh: 5, stopbangBmi: 35, stopbangAge: 50 } as const

/** Digits in noise: 3 rounds (digits and the noise level key `din.noise.<n>`). Fewer than 3 right means "refer". */
export const DIN_ROUNDS: readonly { digits: string; noise: 'quiet' | 'medium' | 'loud' }[] = [
  { digits: '4 7 2', noise: 'quiet' }, { digits: '9 1 5', noise: 'medium' }, { digits: '3 8 6', noise: 'loud' },
]

/** The sentence of the Noa Speech Check, per "Noa speaks" language (real strings: they are compared with what is said). */
export const SENTENCE: Record<NoaLang, string> = { en: 'The sky is blue in Abu Dhabi', ar: 'السماء زرقاء في أبوظبي' }
/** Speech samples (what was said and how many seconds it took). */
export const SAMPLES: Record<SampleKey, Record<NoaLang, [string, number]>> = {
  usual: { en: ['The sky is blue in Abu Dhabi', 2.8], ar: ['السماء زرقاء في أبوظبي', 2.4] },
  slurred: { en: ['the … shky … ish … bl … Abu', 7.6], ar: ['السـ … زر … أبو', 6.9] },
  unclear: { en: ['The sky … iz … bloo … Abu Dabi', 5.5], ar: ['السما … زرقا … أبوظبي', 4.6] },
}
/** Speech scoring: the usual time for the sentence, the green and amber cut-offs, and the weights of words and speed. */
export const SPEECH = { baseSecs: 3.0, green: 0.8, amber: 0.6, wordWeight: 0.75, speedWeight: 0.25 } as const

/** Choice cards: option ids per question (texts `choice.<qid>.q` and `choice.<qid>.opt.<id>`). */
export const CHOICES = {
  hypo: ['ok', 'shaky', 'confused'],
  rf: ['none', 'palp', 'weak', 'chest', 'faint'],
  sym: ['none', 'thirst', 'bowel', 'breast', 'chest'],
  quit: ['yes', 'no'],
  pref: ['one', 'home', 'female'],
  time: ['eve', 'sat', 'am', 'pm'],
  book: ['book', 'change', 'why', 'later'],
  words: ['few', 'some', 'many'],
  point: ['yes', 'no'],
  name: ['yes', 'no'],
  vision: ['none', 'squint'],
  hearing: ['none', 'repeat'],
} as const
export type ChoiceQid = keyof typeof CHOICES | 'time2'
/** Questions that also accept an answer in the person's own words (read by `NoaAi.understand`). */
export const FREE_TEXT: ReadonlySet<ChoiceQid> = new Set<ChoiceQid>(['rf', 'sym', 'pref', 'time', 'book', 'words'])

/** Hypoglycaemia recheck value shown on the card (mmol/L). */
export const HYPO_RECHECK = 5.4
/** Children: development questions are asked under this age (months); older children get the vision and hearing questions. */
export const CHILD_DEV_UNDER_MONTHS = 36
