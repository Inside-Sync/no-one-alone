import { PEOPLE } from '../data/people'
import { tx, type Txt } from '../data/types'
import type { PrevInputs, SafetyInputs, State } from './types'
import { hm } from './text'

/**
 * "Right action, right time?": the checklist shown after a safety decision (prototype decisionChecks).
 * Each line is a Txt; `{{n}}`, `{{she}}` come from the token context.
 */
export function decisionChecks(S: State): Txt[] {
  const d = S.dec, c: Txt[] = []
  if (!d) return c
  const I = S.inp as SafetyInputs
  if (d.rule === 'R12') {
    c.push(tx('checks.noRule'))
    if (I.hr > 120 && !I.still) c.push(tx('checks.fastWhileMoving'))
    return c
  }
  const tTrig = S.tTrig ?? 0, tCheck = S.tCheck ?? 0, tAct = S.tAct ?? 0
  c.push(tx('checks.ruleMet', { rule: S.why1, at: hm(tTrig), check: hm(tCheck), lag: tCheck - tTrig }))
  if (S.why1 === 'R1') c.push(tx('checks.waitedTen'))
  if (d.standdown) { c.push(tx('checks.standDown')); return c }
  const em = d.path != null && /_em$/.test(d.path)
  if (em) c.push(tx(d.escalated ? 'checks.called998Recheck' : 'checks.called998', { at: hm(tAct), min: d.escalated ? 0 : tAct - tCheck }))
  if (d.path === 'hypo_em') c.push(tx('checks.hypoNotStroke'))
  if (d.path === 'hypo_home') c.push(tx('checks.hypoHome', { at: hm(tAct + 15) }))
  if (d.path === 'fall_em' && PEOPLE[S.pk].anticoag) c.push(tx('checks.headCt'))
  if (d.path === 'fall_minor') c.push(tx('checks.fallMinor'))
  if (d.path === 'hf_clinic') c.push(tx(S.ans === 'fine' ? 'checks.hfClinicFine' : 'checks.hfClinic'))
  if (d.path === 'stroke_em') c.push(tx('checks.lastKnownWell', { at: hm(S.start + 10) }))
  if (d.escalated) c.push(tx('checks.escalated'))
  return c
}

/** The prevention checklist (prototype prevChecks). */
export function prevChecks(S: State): Txt[] {
  const d = S.dec, c: Txt[] = []
  if (!d) return c
  const I = S.inp as PrevInputs
  if (d.rule === 'P2') { c.push(tx('checks.p2Eligibility'), tx('checks.p2NoNudge')); return c }
  c.push(I.rem > 0 ? tx(I.rem > 1 ? 'checks.askedAfterMany' : 'checks.askedAfterOne', { n: I.rem, next: I.rem + 1 }) : tx('checks.askedBefore'))
  if (d.rule === 'P8') { c.push(tx('checks.p8Recorded'), tx('checks.p8Kept')); return c }
  c.push(tx('checks.matched', { name: d.name }), tx('checks.oneTap'), tx('checks.choicePreserved'))
  if (S.ck === 'expat') c.push(tx('checks.expatNoNudge'))
  if (S.ck === 'wellchild' && S.barrier === 'access') c.push(tx('checks.oneTrip'))
  return c
}

/** The static checklist of the family hub (prototype famHubHTML). */
export const FAMILY_CHECKS: Txt[] = [tx('checks.fam.0'), tx('checks.fam.1'), tx('checks.fam.2'), tx('checks.fam.3'), tx('checks.fam.4')]
