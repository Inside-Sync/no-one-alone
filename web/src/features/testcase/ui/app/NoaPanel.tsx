'use client'

import type { ComponentType, ReactNode } from 'react'
import { DAILY } from '../../data/daily'
import { FAMILY_MEMBERS } from '../../data/family'
import { FAMILY_STATUS } from '../../data/status'
import { PV } from '../../data/prevention'
import { REPORT } from '../../data/report'
import { Glyph } from '@/components/ui/Icon'
import { clk, hm, pct, tx, type Cell, type PvId } from '../../engine'
import type { ScreenProps } from '../kinds/types'
import { Facts, tokText, useA, type SessionProps } from './parts'

const lvOf = (tone: string) => (tone === 'good' ? 'green' : tone === 'bad' ? 'red' : tone === 'warn' ? 'amber' : 'info')
const isAccepted = (status: Cell | undefined) => typeof status === 'object' && status != null && status.k === 'status.accepted'

function Row({ lvl, who, due, what, label }: { lvl: string; who: string; due: string; what: ReactNode; label: string }) {
  return (
    <div className="wl-row fresh">
      <span className={`lv lv-${lvl}`}>{label}</span><span className="who">{who}</span><span className="due">{due}</span><span className="what">{what}</span>
    </div>
  )
}

/** The family case: the consolidated record of every family member from every source place (prototype noaFam). */
function NoaFamily({ s }: SessionProps) {
  const t = useA()
  const { snap, r } = s
  const F = snap.state.fm, fc = snap.family?.forecast
  if (!F) return null
  return (
    <>
      <div className="lab">{t('noa.famRecord')}</div>
      <div className="explain">
        {FAMILY_MEMBERS.map((m) => {
          const st = FAMILY_STATUS[F.status[m.id]] ?? FAMILY_STATUS.ok
          const f = fc?.[m.id]
          const heart = f?.ok ? <> <span className={`lv lv-${f.cat.tone}`}><Glyph name="heart" /><span aria-hidden="true">{pct(f.r)}</span><span className="tcp-sr">{t('noa.heart', { pct: pct(f.r) })}</span></span></> : null
          return (
            <div key={m.id} className="fnd">
              <div className="h"><Glyph name={m.icon} />{r(tx(m.name))} <span className={`lv lv-${lvOf(st.tone)}`}>{r(tx(st.label))}</span>{heart}</div>
              <div className="meta">
                {m.src.map((x) => r(tx(x))).join(' · ')}
                {F.booked[m.id] ? ` · ${t('noa.booked', { slot: r(F.booked[m.id]) })}` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/** Prevention cases: what the clinic sees (prototype noaPrev). */
function NoaPrevention({ s }: SessionProps) {
  const t = useA()
  const { engine, snap, r } = s
  const S = snap.state, st = snap.step, i = S.step
  const hosp = tokText(s, 'hosp')
  if (i === 0) {
    return S.dec?.path
      ? <><div className="lab">{t('noa.clinicView')}</div><Row lvl="amber" label={t('noa.lvl.due')} who={tokText(s, 'full')} due={t('noa.bookingOffered')} what={t('noa.itemSupport', { item: tokText(s, 'item'), enabler: tokText(s, 'enabler') })} /></>
      : <div className="empty">{t('noa.clinicsWait')}</div>
  }
  const pv = PV[engine.caseDef.pv as PvId]
  if (st.kind === 'result') {
    return (
      <>
        <div className="lab">{t('noa.results', { hosp })}</div>
        {S.done[i]
          ? <Facts rows={[
            [r(tx(pv.result.label)), `${S.resVal ?? ''}${pv.result.unit ? ' ' + r(tx(pv.result.unit)) : ''}`],
            [t('noa.routedTo'), S.branch === 'refer' ? r(S.route?.team) : t('noa.passport')],
            [t('noa.why'), r(tx(pv.result.rule))],
          ]} />
          : <div className="empty">{t('noa.waitingResult')}</div>}
      </>
    )
  }
  const a = snap.db.alerts.slice().reverse().find((x) => x.rule === 'P9')
  return (
    <>
      <div className="lab">{t('noa.worklist', { team: S.route?.team ? r(S.route.team) : t('noa.clinic') })}</div>
      {a ? (
        <>
          <Row lvl="amber" label={t('noa.lvl.amber')} who={tokText(s, 'full')} due={t('noa.twoWeeks')} what={<>{r(a.finding)}{isAccepted(a.status) ? <> · <b>{t('noa.accepted')}</b></> : null}</>} />
          {!S.done[i] && <div className="btnrow"><button type="button" className="btn sm" onClick={() => engine.referAct()}>{t('noa.acceptReferral')}</button></div>}
        </>
      ) : <div className="empty">{t('noa.nothingToRefer')}</div>}
    </>
  )
}

/** Safety cases (and the shared steps of the others): the hospital's worklist and record (prototype renderNoa, hospital tab). */
function NoaSafety({ s }: SessionProps) {
  const t = useA()
  const { engine, snap, r } = s
  const S = snap.state, st = snap.step, i = S.step
  if (i === 0) {
    const em = !!S.dec?.path && /_em$/.test(S.dec.path)
    return S.dec?.path
      ? <Row lvl={em ? 'red' : 'amber'} label={t(em ? 'noa.lvl.red' : 'noa.lvl.amber')} who={t('noa.whoAge', { full: tokText(s, 'full'), age: tokText(s, 'age') })} due={t(em ? 'noa.now' : 'noa.today')} what={t('noa.nameRule', { name: r(S.dec.name), rule: S.dec.rule })} />
      : <div className="empty">{t('noa.nothingFrom', { n: tokText(s, 'n') })}</div>
  }
  if (st.kind === 'btn') {
    const kind = st.label === 'stepLabel.pre_arrival' ? 'preArrival' : st.label === 'stepLabel.book' ? 'booking' : 'referral'
    return (
      <>
        <div className="lab">{t(`noa.${kind}`)} · {clk(engine.stepTime(st))}</div>
        <Facts rows={engine.packet(st).map((p) => [r(p.title), r(p.detail)])} />
        {!S.done[i] && <div className="btnrow"><button type="button" className="btn sm" onClick={() => engine.btnAct()}>{r(tx(st.btn ?? ''))}</button></div>}
      </>
    )
  }
  if (st.kind === 'tl' && st.mode === 'hosp') {
    const k = S.prog[i] || 0
    return (
      <>
        <div className="lab">{r(tx(st.title))}</div>
        {k ? <Facts rows={engine.items(st).slice(0, k).map((x) => [`${hm(engine.stepTime(st) + x.at)} · ${r(x.title)}`, r(x.detail)])} /> : <div className="empty">{t('noa.updatesAppear')}</div>}
      </>
    )
  }
  if (st.kind === 'accept' || st.kind === 'daily') {
    const a = engine.targetAlert()
    const D = DAILY[engine.meta().daily ?? 'stroke']
    return (
      <>
        <div className="lab">{t('noa.worklist', { team: r(tx(D.team)) })}</div>
        {a ? (
          <>
            <Row lvl="amber" label={t('noa.lvl.amber')} who={tokText(s, 'full')} due={t('noa.today')} what={<>{r(a.finding)}{isAccepted(a.status) ? <> · <b>{t('noa.accepted')}</b></> : null}</>} />
            {st.kind === 'accept' && !S.done[i] && <div className="btnrow"><button type="button" className="btn sm" onClick={() => engine.accept()}>{t('noa.acceptAct')}</button></div>}
          </>
        ) : <div className="empty">{t(S.daily.sent ? 'noa.noAlertOnTarget' : 'noa.noAlertWaiting')}</div>}
      </>
    )
  }
  if (st.kind === 'report') return <div className="empty">{t(S.done[i] ? 'noa.reportSent' : 'noa.reportReady')}</div>
  return (
    <>
      <div className="lab">{t('noa.sharedRecord', { full: tokText(s, 'full') })}</div>
      <Facts rows={[[t('noa.medicines'), tokText(s, 'meds')], [t('noa.history'), tokText(s, 'hist')], [t('noa.thisCase'), S.dec ? r(S.dec.name) : '—']]} />
    </>
  )
}

/** Government tab: the Department of Health's monthly view, without names (prototype renderNoa, `doh`). */
function NoaGovernment({ s }: SessionProps) {
  const t = useA()
  const { engine, snap, r } = s
  const rep = snap.state.path ? REPORT[engine.meta().report] : undefined
  const sent = snap.db.reports.length > 0
  return (
    <>
      <div className="lab">{t('noa.dohTitle', { title: rep ? r(tx(rep.title)) : t('noa.pathways') })}</div>
      {sent && rep ? (
        <>
          <div className="kpis">
            {rep.kpi.map((k, n) => (
              <div key={n} className="kpi"><div className="lab">{r(tx(k.label))}</div><div className="v">{r(tx(k.value))}</div><div className="d">{k.note ? r(tx(k.note)) : ''}</div></div>
            ))}
          </div>
          <div className="src">{t('noa.fictional')}</div>
        </>
      ) : <div className="empty">{t('noa.waitingReports')}</div>}
    </>
  )
}

/** Screen 3: the hospital's and the Department of Health's views, with the mode tabs. `Custom` replaces the hospital body when a case family brings its own. */
export function NoaPanel({ s, Custom }: SessionProps & { Custom?: ComponentType<ScreenProps> }) {
  const t = useA()
  const { engine, snap, r } = s
  const S = snap.state, st = snap.step
  const hosp = S.noaTab === 'hosp'
  const nm = hosp ? 'hosp' : 'gov'
  let body: ReactNode
  if (!hosp) body = <NoaGovernment s={s} />
  else if (Custom) body = <Custom engine={engine} snap={snap} r={r} />
  else if (engine.isFam && st.kind !== 'report') body = <NoaFamily s={s} />
  else if (engine.isPrev && (S.step === 0 || st.kind === 'result' || st.kind === 'refer')) body = <NoaPrevention s={s} />
  else body = <NoaSafety s={s} />
  return (
    <>
      <div className={`win-bar mode-${nm}`}>
        <i /><i /><i />
        <span className="t">{t('noa.title')} · <span className="mt">{r(tx(`modes.${nm}`))}</span></span>
        <div className="tabs2" role="group" aria-label={t('noa.tabs')}>
          <button type="button" className="mode-hosp" aria-pressed={hosp} onClick={() => engine.setNoaTab('hosp')}>{r(tx('modes.hosp'))}</button>
          <button type="button" className="mode-gov" aria-pressed={!hosp} onClick={() => engine.setNoaTab('doh')}>{r(tx('modes.gov'))}</button>
        </div>
      </div>
      <div className={`win-body mode-${nm}`} tabIndex={0}>{body}</div>
    </>
  )
}
