// Ported from the Test case prototype (new4.html). Every user-visible string is an i18n key in the `testcase`
// namespace (see locales/en/testcase.json); numbers, thresholds, ids and order are the prototype's.
import type { RuleRow } from './types'

/** Noa's safety rules R1 to R12, as shown to judges. */
export const RULES: RuleRow[] = [
  { id: 'R1', when: 'rules.R1.when', then: 'rules.R1.then' },
  { id: 'R2', when: 'rules.R2.when', then: 'rules.R2.then' },
  { id: 'R3', when: 'rules.R3.when', then: 'rules.R3.then' },
  { id: 'R4', when: 'rules.R4.when', then: 'rules.R4.then' },
  { id: 'R5', when: 'rules.R5.when', then: 'rules.R5.then' },
  { id: 'R6', when: 'rules.R6.when', then: 'rules.R6.then' },
  { id: 'R7', when: 'rules.R7.when', then: 'rules.R7.then' },
  { id: 'R8', when: 'rules.R8.when', then: 'rules.R8.then' },
  { id: 'R9', when: 'rules.R9.when', then: 'rules.R9.then' },
  { id: 'R10', when: 'rules.R10.when', then: 'rules.R10.then' },
  { id: 'R11', when: 'rules.R11.when', then: 'rules.R11.then' },
  { id: 'R12', when: 'rules.R12.when', then: 'rules.R12.then' },
]

/** Noa's prevention rules P1 to P9. */
export const RULES_P: RuleRow[] = [
  { id: 'P1', when: 'prevention.rules.P1.when', then: 'prevention.rules.P1.then' },
  { id: 'P2', when: 'prevention.rules.P2.when', then: 'prevention.rules.P2.then' },
  { id: 'P3', when: 'prevention.rules.P3.when', then: 'prevention.rules.P3.then' },
  { id: 'P4', when: 'prevention.rules.P4.when', then: 'prevention.rules.P4.then' },
  { id: 'P5', when: 'prevention.rules.P5.when', then: 'prevention.rules.P5.then' },
  { id: 'P6', when: 'prevention.rules.P6.when', then: 'prevention.rules.P6.then' },
  { id: 'P7', when: 'prevention.rules.P7.when', then: 'prevention.rules.P7.then' },
  { id: 'P8', when: 'prevention.rules.P8.when', then: 'prevention.rules.P8.then' },
  { id: 'P9', when: 'prevention.rules.P9.when', then: 'prevention.rules.P9.then' },
  { id: 'F1', when: 'prevention.rules.F1.when', then: 'prevention.rules.F1.then' },
  { id: 'F2', when: 'prevention.rules.F2.when', then: 'prevention.rules.F2.then' },
]

