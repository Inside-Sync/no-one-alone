'use client'

import { FAMILY_MEMBERS, FAMILY_RESULTS } from '../../../data/family'
import { pct, tx } from '../../../engine'
import type { KindProps } from '../types'
import { Range, StatusBox, YourTurn, useP } from '../prevention/parts'
import { ReviewQueue } from '../prevention/queue'
import { haText } from './Forecast'

type ResId = keyof typeof FAMILY_RESULTS

/**
 * Hospital step "Results" (prototype famResultHTML): a slider for each result of a booked person (nine inputs in all), each routed by its
 * threshold when sent; Khalid's cholesterol and blood pressure feed his Noa Forecast; new family connections can appear (C4, C5); the
 * flagged results are queued for the doctor. A value outside its range is clamped and the engine's warning shows under the slider.
 */
export function FamResultCard({ engine, snap, r }: KindProps) {
  const t = useP()
  const S = snap.state
  const F = S.fm
  const dn = !!S.done[S.step]
  const ks = (Object.keys(FAMILY_RESULTS) as ResId[]).filter((k) => F?.booked[FAMILY_RESULTS[k].who])
  if (!F || !ks.length) {
    return (
      <YourTurn mode="hosp" label={t('fam.res.turnPlain')}>
        <StatusBox tone="green" title={t('fam.res.none')}>{t('fam.res.noneText')}</StatusBox>
      </YourTurn>
    )
  }
  const name = (k: string) => r(tx(FAMILY_MEMBERS.find((m) => m.id === k)!.name))
  const flagged = ks.filter((k) => F.routes[k]?.b === 'refer')
  const issues = [...snap.inputIssues.required, ...snap.inputIssues.recommended]
  const blocked = snap.inputIssues.required.length > 0
  const kf = dn && F.booked.khalid ? engine.forecast('khalid') : null
  return (
    <YourTurn mode="hosp" what={t('fam.res.turn')}>
      <div className="met">
        {ks.map((k) => {
          const def = FAMILY_RESULTS[k]
          const v = F.res[k] != null ? F.res[k] : def.def
          const mine = issues.filter((i) => i.subject === def.who && i.field === `res.${k}`)
          return (
            <div key={k} className="pfrow">
              <Range id={`tcp-fr-${k}`} label={r(tx(def.label))} value={v} min={def.min} max={def.max} step={def.step} unit={def.unit ? r(tx(def.unit)) : ''} disabled={dn} onChange={(x) => engine.setFamResult(k, x)} />
              {mine.length > 0 && (
                <ul className="tc-issues" aria-label={t('fam.res.issues')}>
                  {mine.map((i) => <li key={i.field} className={i.level} role="status">{r(i.message)}</li>)}
                </ul>
              )}
            </div>
          )
        })}
      </div>
      {dn ? (
        <>
          {ks.map((k) => {
            const ro = F.routes[k]
            if (!ro || (ro.b === 'ok' && ro.used)) return null
            return (
              <StatusBox key={k} tone={ro.b === 'refer' ? 'amber' : 'green'} title={`${r(tx(FAMILY_RESULTS[k].label))} → ${ro.team ? r(ro.team) : t('fam.res.passport')}`}>{r(ro.text)}</StatusBox>
            )
          })}
          {kf && kf.ok && (
            <StatusBox tone={kf.cat.tone} title={t('fam.res.fcTitle')}>
              {t('fam.res.fcText', { r: pct(kf.r), cat: r(kf.cat.lower), ha: haText(kf.ha, r), r5: pct(kf.r5), p5: pct(kf.p5) })}
            </StatusBox>
          )}
          {flagged.length > 0 && (
            <ReviewQueue rows={flagged.map((k) => ({ id: k, who: name(FAMILY_RESULTS[k].who), finding: r(F.routes[k].text), team: r(F.routes[k].team) }))} />
          )}
        </>
      ) : (
        <>
          <p className="note">{t('fam.res.khalidNote')}{F.booked.khalid ? ` ${t('fam.res.tryC4')}` : ''}</p>
          <button type="button" className="btn" disabled={blocked} onClick={() => engine.famSendResults()}>{t('fam.res.send')}</button>
        </>
      )}
    </YourTurn>
  )
}
