'use client'

import { CASES } from '../../data/cases'
import type { Snapshot } from '../../engine'
import type { Resolve } from '../kinds/types'
import { useG, type TG } from './Provenance'

/** Plan item G1: the gates a case passes through. Everything here is read from the engine state; nothing is decided here. */
export type GateId = 'consent' | 'data' | 'urgent' | 'rule' | 'human'
export type GateStatus = 'pass' | 'hold' | 'pending' | 'bypassed'
export interface GateState { id: GateId; status: GateStatus; key: string; p?: Record<string, unknown> }
export const GATE_IDS: readonly GateId[] = ['consent', 'data', 'urgent', 'rule', 'human']

export function gateStates(snap: Snapshot, r: Resolve): GateState[] {
  const S = snap.state, c = CASES[S.ck]
  const fam = c.type === 'fam', prev = c.type === 'prev'
  const dec = S.dec
  const out: GateState[] = []

  // 1. Consent: the consents table, and the choice of who sees the plan.
  const nCons = snap.db.consents.length
  if (!nCons) out.push({ id: 'consent', status: 'hold', key: 'consent.none' })
  else if (!fam && !prev && !S.planSent && !S.fam.f1 && !S.fam.f2) out.push({ id: 'consent', status: 'hold', key: 'consent.nobody' })
  else out.push({ id: 'consent', status: 'pass', key: 'consent.pass', p: { n: nCons } })

  // 2. Data complete: required issues hold, recommended ones are only counted.
  const { required, recommended } = snap.inputIssues
  if (required.length) {
    out.push({ id: 'data', status: 'hold', key: required.length > 1 ? 'data.holdMore' : 'data.hold', p: { first: r(required[0].message), n: required.length - 1 } })
  } else if (recommended.length) out.push({ id: 'data', status: 'pass', key: 'data.passWarn', p: { n: recommended.length, count: recommended.length } })
  else out.push({ id: 'data', status: 'pass', key: 'data.pass' })

  // 3. Urgent bypass: a red or 998 path skips the routine flow.
  const em = !!dec?.path && /_em$/.test(dec.path)
  const redAlert = !!S.fm && S.fm.alerts.some((a) => a.lvl === 'red')
  if (em) out.push({ id: 'urgent', status: 'bypassed', key: 'urgent.bypassed', p: { rule: dec!.rule } })
  else if (redAlert) out.push({ id: 'urgent', status: 'bypassed', key: 'urgent.bypassedFam' })
  else if (dec || fam || S.phase === 'ask') out.push({ id: 'urgent', status: 'pass', key: 'urgent.pass' })
  else if (S.phase === 'check') out.push({ id: 'urgent', status: 'hold', key: 'urgent.check' })
  else out.push({ id: 'urgent', status: 'pending', key: 'urgent.pending' })

  // 4. Rule decision: the rule id and its name.
  if (dec) out.push({ id: 'rule', status: 'pass', key: 'rule.pass', p: { rule: dec.rule, name: r(dec.name) } })
  else if (fam && S.fm && S.fm.alerts.length) out.push({ id: 'rule', status: 'pass', key: 'rule.fam', p: { n: S.fm.alerts.length } })
  else if (S.phase === 'check' || S.phase === 'ask') out.push({ id: 'rule', status: 'hold', key: S.phase === 'ask' ? 'rule.ask' : 'rule.check' })
  else out.push({ id: 'rule', status: 'pending', key: 'rule.pending' })

  // 5. Human approval: a person or clinician accepts the action (accept / refer steps, bookings in the family).
  const accepted = snap.log.some((l) => l.m === 'ACCEPT')
  const step = snap.steps.findIndex((s) => s.kind === 'accept' || s.kind === 'refer')
  const decided = !!dec || (fam && !!S.fm && S.fm.alerts.length > 0)
  const accIdx = snap.steps.findIndex((s) => s.kind === 'accept')
  // Nothing to act on: no rule path, a healthy result, or a check-in on target (the accept step then has no alert to accept).
  const noAction = (!!dec && !dec.path) || (prev && S.route?.b === 'ok') || (S.daily.sent && !S.daily.alert) || (accIdx >= 0 && !!S.done[accIdx])
  if (accepted) out.push({ id: 'human', status: 'pass', key: 'human.pass' })
  else if (!decided) out.push({ id: 'human', status: 'pending', key: 'human.pending' })
  else if (noAction) out.push({ id: 'human', status: 'pending', key: 'human.none' })
  else if (em) out.push({ id: 'human', status: 'hold', key: step >= 0 ? 'human.holdEm' : 'human.bypassEm', p: { n: step + 1 } })
  else out.push({ id: 'human', status: 'hold', key: step >= 0 ? 'human.hold' : 'human.holdFam', p: { n: step + 1 } })
  return out
}

/** The strip at the top of each step card: an ordered list, each gate with its status in words and a one-line reason. */
export function GateStrip({ snap, r }: { snap: Snapshot; r: Resolve }) {
  const t: TG = useG()
  const gates = gateStates(snap, r)
  return (
    <ol className="gates" aria-label={t('gates.label')}>
      {gates.map((g) => (
        <li key={g.id} className={`gate gate-${g.status}`} data-gate={g.id} data-status={g.status}>
          <span className="gate-h"><span className="gate-dot" aria-hidden="true" /><b>{t(`gates.name.${g.id}`)}</b><span className="gate-st">{t(`gates.status.${g.status}`)}</span></span>
          <span className="gate-why"><span className="sr">: </span>{t(`gates.${g.key}`, g.p)}</span>
        </li>
      ))}
    </ol>
  )
}
