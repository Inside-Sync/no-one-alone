import type { AdultProfile, PersonId, PrefId, QsetId, SampleKey, TestCaseId } from './types'
import type { QVals } from './tests'

/**
 * The 10 quick test cases (prototype TC). Texts: `testCases.<id>.{title,context,try,expect}`. A case loads the person with
 * `preset` data (on top of the start profile) and sets **default** answers only: Next picks them, anyone can still answer differently.
 */
export interface TestCaseAnswers {
  /** Speech samples in order (one per try), or one sample for every try. */
  speech?: SampleKey | SampleKey[]
  pref?: PrefId
  sym?: string
  book?: string
  words?: string
  vision?: string
  /** false: the protect card starts with the genomic result switched off. */
  genomic?: boolean
  q?: Partial<Record<QsetId, QVals>>
  din?: boolean[]
  [qid: string]: unknown
}
export interface TestCase { id: TestCaseId; person: PersonId; preset: Partial<AdultProfile>; answers: TestCaseAnswers }

export const TEST_CASES: readonly TestCase[] = [
  { id: 's0', person: 'saeed', preset: { hr: 128 }, answers: { speech: ['unclear', 'usual'], pref: 'one' } },
  { id: 's2', person: 'saeed', preset: { hr: 128 }, answers: { speech: 'slurred' } },
  { id: 's3', person: 'saeed', preset: { glu: 2.7 }, answers: { pref: 'one' } },
  { id: 'k1', person: 'khalid', preset: {}, answers: {} },
  { id: 'k3', person: 'khalid', preset: {}, answers: { sym: 'chest', book: 'later' } },
  { id: 'k4', person: 'khalid', preset: { sbp: 184, dbp: 112 }, answers: {} },
  { id: 'a1', person: 'amna', preset: {}, answers: {} },
  { id: 'm1', person: 'moza', preset: {}, answers: { pref: 'female' } },
  { id: 'h1', person: 'hind', preset: {}, answers: { words: 'few' } },
  { id: 'd1', person: 'hamdan', preset: {}, answers: { vision: 'squint' } },
]
export const testCase = (id: TestCaseId): TestCase => TEST_CASES.find((t) => t.id === id) as TestCase
/** The case the app starts with (after 300 ms, a UI concern). */
export const AUTO_START_CASE: TestCaseId = 's0'

/** Seeded family messages at load (prototype: 200 ms after start). Texts `notes.seed.<id>`. */
export const SEEDED_NOTES: readonly { id: string; to: PersonId; icon: 'sun' | 'child' | 'droplet' }[] = [
  { id: 'moza', to: 'moza', icon: 'sun' },
  { id: 'amna', to: 'amna', icon: 'child' },
  { id: 'saeed', to: 'saeed', icon: 'droplet' },
]
