import type { CaseId, TestCaseEngine } from '../engine'
import type { FamRiskSetup, Scenario } from './types'

/** The case of the Test case tab a scenario opens as: safety scenarios use "Enter your own", prevention ones their case, family ones the family. */
export function caseOf(sc: Scenario): CaseId {
  const s = sc.setup
  return s.kind === 'safety' ? 'own' : s.kind === 'prev' ? s.pv : 'family'
}

/**
 * Put a scenario's inputs into an engine that has just loaded `caseOf(sc)` (the speech and the answers are left for the person to give).
 * A refused value is entered too, so the guardrail's message shows.
 */
export function prepareCase(e: TestCaseEngine, sc: Scenario): void {
  const s = sc.setup
  if (s.kind === 'safety') {
    if (s.person) e.setPerson(s.person)
    if (s.start != null) e.setStart(s.start)
    if (s.lang) e.setLang(s.lang)
    for (const k of ['still', 'fall'] as const) if (s.toggles?.[k] != null) e.setInputToggle(k, s.toggles[k] as boolean)
    for (const op of s.set ?? []) e.setInput(op.key as never, op.value)
  } else if (s.kind === 'prev') {
    if (s.nat) e.setNationality(s.nat)
    for (const op of s.set ?? []) e.setInput(op.key as never, op.value)
  } else if (s.kind === 'famRisk') {
    const r: FamRiskSetup = s
    for (const id of r.before ?? []) e.famAct(id)
    for (const ed of r.edits ?? []) {
      if (ed.op === 'set') e.setProfile(r.member, ed.field as never, ed.value)
      else if (ed.op === 'toggle') e.toggleProfile(r.member, ed.field as never)
      else e.setSex(r.member, ed.sex)
    }
    e.famSelect(r.member)
  }
}
