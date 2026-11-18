// Ported from the Test case prototype (new4.html). Every user-visible string is an i18n key in the `testcase`
// namespace (see locales/en/testcase.json); numbers, thresholds, ids and order are the prototype's.
import type { Question } from './types'

/** What Noa Voice asks after the speech check, by what triggered the check. */
export const QUESTIONS: Record<'fall' | 'hypo' | 'hf' | 'hr', Question> = {
  fall: {
    id: 'fall',
    q: 'questions.fall.q',
    a: [
      { id: 'ok', label: 'questions.fall.a.0' },
      { id: 'cant', label: 'questions.fall.a.1' },
      { id: 'none', label: 'questions.fall.a.2' },
    ],
  },
  hypo: {
    id: 'hypo',
    q: 'questions.hypo.q',
    a: [
      { id: 'drink', label: 'questions.hypo.a.0' },
      { id: 'confused', label: 'questions.hypo.a.1' },
      { id: 'none', label: 'questions.hypo.a.2' },
    ],
  },
  hf: {
    id: 'hf',
    q: 'questions.hf.q',
    a: [
      { id: 'pillows', label: 'questions.hf.a.0' },
      { id: 'rest', label: 'questions.hf.a.1' },
      { id: 'fine', label: 'questions.hf.a.2' },
    ],
  },
  hr: {
    id: 'hr',
    q: 'questions.hr.q',
    a: [{ id: 'fine', label: 'questions.hr.a.0' }, { id: 'none', label: 'questions.hr.a.1' }],
  },
}

