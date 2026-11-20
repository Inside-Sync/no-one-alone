import { CASES } from '../../data/cases'
import { FAMILY_ALERTS, FAMILY_RESULTS } from '../../data/family'
import { TestCaseEngine, runAutopilot, type CaseId, type TFn } from '../../engine'

/**
 * Plan item Y3: the KPIs a pilot would report, computed from the running engine's own state and demo database (not typed in).
 * Each KPI is a ratio (`a` of `b`) or a mean (`a` summed over `b` cases); all of it is fictional demo data.
 */
export type KpiId = 'screened' | 'days' | 'barriers' | 'to998' | 'teach' | 'care'
export type KpiVal = { state: 'na' } | { state: 'wait' } | { state: 'ready'; a: number; b: number }
export type KpiSet = Record<KpiId, KpiVal>

export const KPI_IDS: readonly KpiId[] = ['screened', 'days', 'barriers', 'to998', 'teach', 'care']
/** `ratio`: a of b as a share; `mean`: a / b with a unit. */
export const KPI_MODE: Record<KpiId, 'ratio' | 'mean'> = { screened: 'ratio', days: 'mean', barriers: 'ratio', to998: 'mean', teach: 'ratio', care: 'ratio' }

const NA: KpiVal = { state: 'na' }
const WAIT: KpiVal = { state: 'wait' }
const ready = (a: number, b: number): KpiVal => ({ state: 'ready', a, b })

/** The KPIs of one running (or finished) case. */
export function computeKpis(e: TestCaseEngine): KpiSet {
  const S = e.S
  const F = S.fm
  const steps = e.steps()
  const doneKind = (kind: string) => steps.some((st, i) => st.kind === kind && !!S.done[i])
  const out: KpiSet = { screened: NA, days: NA, barriers: NA, to998: NA, teach: NA, care: NA }

  // Teach-back right the first time: any case whose journey has a teach-back step.
  if (steps.some((st) => st.kind === 'teach')) out.teach = S.tb === 'ok' ? ready(S.tbWrong == null ? 1 : 0, 1) : WAIT

  if (e.isFam && F) {
    // results belong to members (`who`): a member is screened once any of their results is recorded
    const ids = Object.keys(FAMILY_RESULTS), members = [...new Set(ids.map((k) => FAMILY_RESULTS[k].who))]
    const bookedN = Object.keys(F.booked).length
    // Everyone with a screening to do: the four who book; "completed" is a result recorded.
    out.screened = bookedN ? ready(members.filter((w) => ids.some((k) => FAMILY_RESULTS[k].who === w && F.routes[k])).length, members.length) : WAIT
    // The booking is made the moment the invitation is opened (the engine's clock moves five minutes): days from invite to booking.
    out.days = bookedN ? ready(0, bookedN) : WAIT
    const open = FAMILY_ALERTS.filter((a) => a.state === 'open').map((a) => a.id)
    out.barriers = ready(open.filter((id) => F.alerts.some((a) => a.id === id && a.state === 'done')).length, open.length)
    const flagged = [...new Set(Object.keys(F.routes).filter((k) => F.routes[k].b === 'refer').map((k) => FAMILY_RESULTS[k].who))]
    out.care = !doneKind('famresult') ? WAIT : flagged.length ? ready(flagged.filter((k) => F.status[k] === 'care').length, flagged.length) : NA
    return out
  }

  if (e.isPrev) {
    const d = S.dec
    if (!d) { out.screened = WAIT; out.days = WAIT; out.barriers = WAIT; out.care = WAIT; return out }
    if (d.rule === 'P2') return out
    out.screened = ready(S.path === 'prev' && doneKind('result') ? 1 : 0, 1)
    out.days = S.path === 'prev' ? ready(Math.round(((S.tAct ?? S.start) - S.start) / 1440), 1) : ready(0, 0)
    if (out.days.state === 'ready' && out.days.b === 0) out.days = NA
    out.barriers = ready(S.path === 'prev' && S.barrier ? 1 : 0, 1)
    out.care = S.branch === 'refer' ? ready(doneKind('refer') ? 1 : 0, 1) : S.branch === 'ok' ? NA : WAIT
    return out
  }

  // Safety cases.
  const d = S.dec
  if (!d) { out.to998 = WAIT; out.care = WAIT; return out }
  const em = d.path != null && /_em$/.test(d.path)
  if (em && S.tAct != null && S.tCheck != null) out.to998 = ready(d.escalated ? 0 : S.tAct - S.tCheck, 1)
  if (d.path) out.care = ready(steps.some((st, i) => st.kind === 'btn' && !!S.done[i]) ? 1 : 0, 1)
  return out
}

/** Pooled over several cases: sum `a` and `b` of the cases the KPI applies to; `n` is how many cases contributed. */
export type Pooled = Record<KpiId, { a: number; b: number; n: number }>

/** Run every case's autopilot to the end in throwaway engines and pool the KPIs (instant, no timers). */
/** `t` is the `testcase` translator: the speech check scores real sentences. */
export function pooledKpis(t: TFn, ids: CaseId[] = Object.keys(CASES) as CaseId[]): Pooled {
  const pool = Object.fromEntries(KPI_IDS.map((k) => [k, { a: 0, b: 0, n: 0 }])) as Pooled
  for (const id of ids) {
    const e = new TestCaseEngine({ caseId: id, t })
    runAutopilot(e)
    const k = computeKpis(e)
    for (const key of KPI_IDS) {
      const v = k[key]
      if (v.state === 'ready') { pool[key].a += v.a; pool[key].b += v.b; pool[key].n += 1 }
    }
  }
  return pool
}
