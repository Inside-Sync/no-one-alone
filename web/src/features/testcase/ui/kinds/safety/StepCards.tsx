import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { DAILY, REPORT } from '../../../data'
import { hm, tx } from '../../../engine'
import type { KindProps } from '../types'
import { Done, Range, YourTurn } from './Controls'
import { SpeechCheck } from './SpeechCheck'

/** Timeline step: reveal the updates one by one. */
export function TlCard({ engine, snap, step, r }: KindProps) {
  const { t } = useTranslation('tcSafety')
  const S = snap.state
  const items = engine.items(step), k = S.prog[S.step] || 0, base = engine.stepTime(step)
  return (
    <YourTurn mode={step.mode} what={t('tl.follow')} r={r}>
      <ol className="tl">
        {items.map((it, i) => (
          <li key={i} className={i < k ? '' : 'future'} aria-hidden={i < k ? undefined : true}>
            <span className="d">{hm(base + it.at)}</span>
            <span><b>{r(it.title)}</b> · {r(it.detail)}</span>
          </li>
        ))}
      </ol>
      {k < items.length
        ? <button type="button" className="btn" onClick={() => engine.tlNext()}>{k ? t('tl.next') : <><span className="ic" aria-hidden="true"><Icon name="play" /></span> {t('tl.start')}</>}</button>
        : <Done title={r(tx(step.done!))} />}
    </YourTurn>
  )
}

/** "Act as the care team": one button that records the hospital's action. */
export function BtnCard({ engine, snap, step, r }: KindProps) {
  const { t } = useTranslation('tcSafety')
  const dn = !!snap.state.done[snap.state.step]
  return (
    <YourTurn mode={step.mode} what={t('btn.what')} r={r}>
      <p>{t('btn.read')}</p>
      {dn
        ? <Done title={r(tx(step.done!))} />
        : <button type="button" className="btn" disabled={snap.busy} onClick={() => engine.btnAct()}>{r(tx(step.btn!))}</button>}
    </YourTurn>
  )
}

/** Low-sugar recheck 15 minutes later; two low values escalate to 998. */
export function RecheckCard({ engine, snap, step, r }: KindProps) {
  const { t } = useTranslation('tcSafety')
  const S = snap.state
  const dn = !!S.done[S.step], tAct = S.tAct ?? 0
  const lastV = S.rc.vals[S.rc.vals.length - 1]
  return (
    <YourTurn mode={step.mode} what={t('recheck.what')} r={r}>
      <p>{t('recheck.coach')}</p>
      {S.rc.vals.length > 0 && (
        <div className="nums" dir="ltr">
          {S.rc.vals.map((x, j) => <span key={j}>{t('recheck.reading', { at: hm(tAct + 15 * (j + 1)), v: x })}</span>)}
        </div>
      )}
      {dn ? (
        <Done title={t('recheck.recoveredTitle', { v: lastV })}>{t('recheck.recoveredText')}</Done>
      ) : (
        <>
          <div className="met">
            <Range label={t('recheck.at', { at: hm(tAct + 15 * (S.rc.n + 1)) })} value={S.rc.val} min={1.5} max={12} step={0.1} unit={t('units.mmol')} onChange={(v) => engine.setRecheckVal(v)} />
          </div>
          {S.rc.n === 1 && <div className="result status st-amber" role="status"><b>{t('recheck.stillLow')}</b>{t('recheck.stillLowText')}</div>}
          <button type="button" className="btn" onClick={() => engine.recheck()}>{t('recheck.again')}</button>
        </>
      )}
      <p className="note">{t('recheck.note')}</p>
    </YourTurn>
  )
}

/** The Monitor step: the speech check and one daily reading. Off target raises an alert for the clinician. */
export function DailyCard({ engine, snap, step, r }: KindProps) {
  const { t } = useTranslation('tcSafety')
  const S = snap.state
  const meta = engine.meta()
  const D = meta.daily ? DAILY[meta.daily] : null
  if (!D) return null
  const v = S.daily.val != null ? S.daily.val : D.def
  const nm = r(tx(engine.person.t.n!))
  return (
    <>
      <SpeechCheck engine={engine} snap={snap} r={r} which="daily" sample={['usual', 'slurred']} title={t('home.speechTitle', { n: nm })} ask={t('speech.askDaily', { n: nm })} />
      <YourTurn mode={step.mode} what={t('daily.what')} r={r}>
        <div className="met">
          <Range label={r(tx(D.label))} value={v} min={D.min} max={D.max} step={D.step} unit={D.unit} disabled={S.daily.sent} onChange={(x) => engine.setDailyVal(x)} />
        </div>
        <p className="note">{t('daily.target', { t: r(tx(D.target)), u: D.unit })}</p>
        {S.daily.sent
          ? S.daily.alert
            ? <div className="result status st-amber" role="status"><b>{t('daily.toTeam', { team: r(tx(D.team)) })}</b>{r(tx(D.finding, { v }))}. {t('daily.alertNote')}</div>
            : <Done title={t('daily.onTarget')}>{t('daily.onTargetText')}</Done>
          : <button type="button" className="btn" onClick={() => engine.sendDaily()}>{t('daily.send')}</button>}
      </YourTurn>
      {S.speech.daily?.lvl === 'red' && <p className="note bad" role="status">{t('daily.redNote')}</p>}
    </>
  )
}

/** The care team accepts the off-target alert and acts on it. */
export function AcceptCard({ engine, snap, step, r }: KindProps) {
  const { t } = useTranslation('tcSafety')
  const dn = !!snap.state.done[snap.state.step]
  const a = engine.targetAlert()
  const meta = engine.meta()
  const D = meta.daily ? DAILY[meta.daily] : null
  return (
    <YourTurn mode={step.mode} what={t('accept.what')} r={r}>
      {a ? (
        dn
          ? <Done title={t('accept.done')}>{t('accept.doneText', { act: D ? r(tx(D.act)) : '' })}</Done>
          : (
            <>
              <p>{r(a.finding)}.</p>
              <button type="button" className="btn" onClick={() => engine.accept()}>{t('accept.go')}</button>
            </>
          )
      ) : (
        <Done title={t('accept.nothing')}>{t('accept.nothingText')}</Done>
      )}
    </YourTurn>
  )
}

/** The monthly report to the Department of Health: used by every case. Once sent, its figures show. */
export function ReportCard({ engine, snap, step, r }: KindProps) {
  const { t } = useTranslation('tcSafety')
  const dn = !!snap.state.done[snap.state.step]
  const R0 = REPORT[engine.meta().report]
  return (
    <YourTurn mode={step.mode} what={t('report.what')} r={r}>
      {dn ? (
        <>
          <Done title={t('report.sent')}>{t('report.sentText')}</Done>
          {R0 && (
            <section aria-label={t('report.kpis')}>
              <div className="lab">{t('report.title', { title: r(tx(R0.title)) })}</div>
              <div className="kpis">
                {R0.kpi.map((k, i) => (
                  <div className="kpi" key={i}>
                    <div className="lab">{r(tx(k.label))}</div>
                    <div className="v">{r(tx(k.value))}</div>
                    {k.note && <div className="d">{r(tx(k.note))}</div>}
                  </div>
                ))}
              </div>
              <div className="src">{t('report.fictional')}</div>
            </section>
          )}
        </>
      ) : (
        <button type="button" className="btn" disabled={snap.busy} onClick={() => engine.report()}>{t('report.send')}</button>
      )}
    </YourTurn>
  )
}
