import { FAMILY_ALERTS, FAMILY_FOLLOW, FAMILY_INIT, FAMILY_MEMBERS, FAMILY_PROFILES, FAMILY_RESULTS, FAMILY_STEPS, FAMILY_VISITS } from '../data/family'
import { FAMILY_DEVICES } from '../data/forecast'
import { WC_AGES } from '../data/prevention'
import { tx, type AgentId, type FamilyProfile, type Row, type StepDef, type Txt } from '../data/types'
import { fcFor, ifhasOk, pct, wcDone, wcNext, type ForecastResult } from './forecast'
import { wcName } from './prevention'
import type { FamAlert, FamRoute, FamState } from './types'

/**
 * Result thresholds for the family results (prototype FRES): where each person's result goes. `id` is a result id
 * (`hind`, `maitha_a1c`, `khalid_a1c`, `khalid_tc`, `khalid_hdl`, `khalid_sbp`, `amna_a1c`, `saeed_acr`, `sultan_sbp`).
 * A route with `used: true` is not a finding: the value only feeds Khalid's / Sultan's heart risk ("Used in his heart risk").
 */
export function routeFamilyResult(id: string, v: number): FamRoute {
  const mk = (name: string, b: 'refer' | 'ok', team: boolean, used = false): FamRoute => ({
    b,
    text: tx(`family.routes.${id}.${name}.t`),
    low: tx(`family.routes.${id}.${name}.low`),
    team: team ? tx(`family.routes.${id}.${name}.team`) : null,
    used,
  })
  const a1c = (): FamRoute => (v >= 6.5 ? mk('dm', 'refer', true) : v >= 5.7 ? mk('pre', 'refer', true) : mk('ok', 'ok', false))
  switch (id) {
    case 'hind': return v < 3 ? mk('refer', 'refer', true) : mk('ok', 'ok', false)
    case 'maitha_a1c':
    case 'khalid_a1c':
    case 'amna_a1c': return a1c()
    case 'khalid_tc': return v >= 7.5 ? mk('refer', 'refer', true) : mk('ok', 'ok', false, true)
    case 'khalid_hdl': return mk('ok', 'ok', false, true)
    case 'khalid_sbp': return v >= 160 ? mk('refer', 'refer', true) : mk('ok', 'ok', false, true)
    case 'saeed_acr': return v >= 3 ? mk('refer', 'refer', true) : mk('ok', 'ok', false)
    case 'sultan_sbp': return v >= 140 ? mk('refer', 'refer', true) : mk('ok', 'ok', false)
    default: throw new Error(`no family result for ${id}`)
  }
}

/** Score weights per status (prototype famScore): the passport score is their mean in percent. */
const WEIGHT: Record<string, number> = { ok: 1, care: 0.85, booked: 0.7, due: 0.4, declined: 0.3, overdue: 0, alert: 0.2 }
export function famScore(F: FamState): number {
  const ks = Object.keys(F.status)
  return Math.round((100 * ks.reduce((a, k) => a + (WEIGHT[F.status[k]] ?? 0), 0)) / ks.length)
}
/** How many members are up to date or in care. */
export const famUp = (F: FamState): number => Object.values(F.status).filter((x) => x === 'ok' || x === 'care').length

/** Hind's alert title from her profile: "18-month visit is 3 weeks overdue", "... is due", or "All 14 visits done". */
export function childAlertTitle(p: FamilyProfile): Txt {
  if (!p.child) return tx('family.alerts.hind.done')
  const a = wcNext(p, WC_AGES)
  if (a == null) return tx('family.alerts.hind.done')
  if (!p.overdueW) return tx('family.alerts.hind.due', { visit: wcName(a) })
  return tx(p.overdueW > 1 ? 'family.alerts.hind.overdueN' : 'family.alerts.hind.overdue1', { visit: wcName(a), n: p.overdueW })
}
/** Title of a Noa Forecast alert: "High heart risk: 26% in 10 years" or "Heart risk review" when the member is no longer scored. */
export const fcAlertTitle = (f: ForecastResult): Txt => (f.ok ? tx('family.alerts.fc.t', { pct: pct(f.r) }) : tx('family.alerts.fc.review'))

export function initFamily(): FamState {
  const prof = structuredClone(FAMILY_PROFILES)
  return {
    prof,
    status: { ...FAMILY_INIT.status },
    booked: {},
    declined: {},
    fcNo: {},
    conn: [...FAMILY_INIT.conn],
    badges: [...FAMILY_INIT.badges],
    sel: FAMILY_INIT.sel,
    res: {},
    routes: {},
    alerts: FAMILY_ALERTS.map((a): FamAlert => ({ id: a.id, who: a.who, lvl: a.lvl, title: a.id === 'hind' ? childAlertTitle(prof.hind) : tx(a.title), why: tx(a.why), agent: a.agent, acts: a.acts.map((x) => ({ label: tx(x.label), id: x.id })), state: a.state, conn: a.conn })),
  }
}

/** The six family steps (prototype famSteps): visits are the bookings, follow-up is the referrals, the heart-risk alert and the connections. */
export function familySteps(F: FamState): StepDef[] {
  const v: Row[] = []
  for (const k of ['hind', 'maitha', 'khalid', 'amna', 'saeed', 'sultan'] as const) {
    if (!F.booked[k]) continue
    if (k === 'hind') {
      const a = F.prof.hind && F.prof.hind.child ? wcNext(F.prof.hind, WC_AGES) : null
      v.push(...FAMILY_VISITS.hind.map((r): Row => (a != null ? { ...r, p: { visit: wcName(a) } } : { ...r, title: 'family.visits.hind.0.titleNone' })))
    } else v.push(...FAMILY_VISITS[k])
  }
  if (!v.length) v.push(...FAMILY_VISITS.none)
  const fu: Row[] = []
  const ref = (k: string) => Object.keys(F.routes).some((x) => FAMILY_RESULTS[x]?.who === k && F.routes[x].b === 'refer')
  if (ref('hind')) fu.push(...FAMILY_FOLLOW.hind)
  if (ref('khalid')) fu.push(...FAMILY_FOLLOW.khalid)
  if (F.alerts.some((a) => a.id === 'fc_khalid')) fu.push(...FAMILY_FOLLOW.khalid_fc)
  if (ref('amna')) fu.push(...FAMILY_FOLLOW.amna)
  if (ref('maitha')) fu.push(...FAMILY_FOLLOW.maitha)
  if (ref('saeed')) fu.push(...FAMILY_FOLLOW.saeed)
  if (ref('sultan')) fu.push(...FAMILY_FOLLOW.sultan)
  if (F.conn.includes('C4')) fu.push(...FAMILY_FOLLOW.C4)
  if (F.conn.includes('C5')) fu.push(...FAMILY_FOLLOW.C5)
  fu.push(...FAMILY_FOLLOW.passport)
  return FAMILY_STEPS.map((s, i) => (i === 1 ? { ...s, items: v } : i === 4 ? { ...s, items: fu } : s))
}

/** The one next thing Noa Navigator would do for a member (prototype nextAction). */
export function nextAction(F: FamState, k: string, f: ForecastResult): Txt {
  const p = F.prof[k]
  if (F.booked[k]) return tx('family.next.booked', { slot: F.booked[k] })
  if (F.declined[k]) return tx('family.next.declined')
  if (f.ok && f.cat.id === 'high') return tx('family.next.review')
  if (f.ok && !f.lab) return tx('family.next.cholesterol')
  if (ifhasOk(p) && F.status[k] !== 'ok') return tx('family.next.ifhas')
  if (!ifhasOk(p) && !p.child && !p.emirati) return tx('family.next.noIfhas')
  return tx('family.next.none')
}

/** Age to show: "18 months" under two years, whole years otherwise (prototype ageT). */
export const ageText = (p: FamilyProfile): Txt | number => (p.child ? (p.ageM < 24 ? tx('family.ageMonths', { n: p.ageM }) : Math.floor(p.ageM / 12)) : p.age)

/** One line of "how Noa's agents collected the signals": which agent, from where, and what it found. */
export interface SignalRow { agent: AgentId; source: Txt; value: Txt }

/** The signals behind a member's forecast (prototype famSignals), as data. Children get the visit signals instead. */
export function famSignals(F: FamState, k: string, f: ForecastResult): SignalRow[] {
  const p = F.prof[k], m = FAMILY_MEMBERS.find((x) => x.id === k)!
  const row = (agent: AgentId, source: string, value: Txt): SignalRow => ({ agent, source: tx(`family.signals.${source}`), value })
  if (p.child) {
    const a = wcNext(p, WC_AGES)
    return [
      row('courier', 'records', tx('family.signals.visitsDone', { n: wcDone(p, WC_AGES) })),
      row('guardian', 'schedule', a == null ? tx('family.signals.allDone') : tx(p.overdueW ? 'family.signals.nextVisitOverdue' : 'family.signals.nextVisit', { visit: wcName(a), n: p.overdueW })),
      row('voice', 'askedParent', tx(k === 'hind' ? 'family.signals.barrierClinic' : 'family.signals.barrierNone')),
    ]
  }
  const dev = FAMILY_DEVICES[k] ?? { bp: 'clinic', wt: 'clinic' }
  const rows: SignalRow[] = [
    row('guardian', `bp.${dev.bp}`, tx('family.signals.bpValue', { sbp: p.sbp, trend: p.sbpTrend ? tx(p.sbpTrend > 0 ? 'family.signals.rising' : 'family.signals.falling', { n: Math.abs(p.sbpTrend) }) : '', tx: p.bpTx ? tx('family.signals.onTablets') : '' })),
    row('guardian', `wt.${dev.wt}`, tx('family.signals.bmiValue', { bmi: p.bmi, trend: p.bmiTrend ? tx('family.signals.bmiTrend', { n: `${p.bmiTrend > 0 ? '+' : ''}${p.bmiTrend}` }) : '' })),
    row('voice', 'checkin', tx('family.signals.checkinValue', { smoker: tx(p.smoker ? 'common.yes' : 'common.no'), dm: tx(p.dm ? 'common.yes' : 'common.no') })),
    row('courier', 'labs', p.tc != null && p.hdl != null ? tx('family.signals.labsValue', { tc: p.tc, hdl: p.hdl }) : tx('family.signals.labsMissing')),
    row('insight', 'links', tx(m.fh)),
    row('forecast', 'framingham', f.ok ? tx('family.signals.fcValue', { pct: pct(f.r), cat: f.cat.lower, ha: f.ha === 'atMost30' ? tx('forecast.ha.atMost30') : f.ha === 'over100' ? tx('forecast.ha.over100') : f.ha }) : tx('family.signals.fcNone', { why: f.short })),
    row('navigator', 'next', nextAction(F, k, f)),
  ]
  return rows
}

/** `fcFor` of a member's current profile. */
export const memberForecast = (F: FamState, k: string): ForecastResult => fcFor(F.prof[k])
