'use client'

import { CASES } from '../../../data/cases'
import { PV } from '../../../data/prevention'
import { pct, routeResult, tx, type PvId } from '../../../engine'
import { Glyph } from '@/components/ui/Icon'
import { AGENTS } from '../../../data/agents'
import { minus } from '../signed'
import { haText } from '../family/Forecast'
import type { KindProps } from '../types'
import { Range, StatusBox, YourTurn, tok, useP } from './parts'
import { ReviewQueue } from './queue'

/** Hospital step "Result": enter the result; rule P9 routes it, and the doctor's review queue shows the flagged one (plan item Y2). */
export function ResultCard({ engine, snap, r }: KindProps) {
  const t = useP()
  const S = snap.state
  const pvId = CASES[S.ck].pv as PvId
  const R0 = PV[pvId].result
  const v = S.resVal ?? R0.def
  const dn = !!S.done[S.step]
  const unit = R0.unit ? r(tx(R0.unit)) : ''
  const preview = routeResult(pvId, v)
  const vShown = `${minus(v)}${unit ? `${unit === '%' ? '' : ' '}${unit}` : ''}`
  const route = S.route
  const fc = engine.prevForecast()
  return (
    <YourTurn mode="hosp" what={t('result.enter')}>
      <div className="met">
        <Range id="tcp-res" label={r(tx(R0.label))} value={v} min={R0.min} max={R0.max} step={R0.step} unit={unit} disabled={dn} onChange={(x) => engine.setResVal(x)} />
      </div>
      <p className="note" id="tcp-res-rule">{t('result.routing')}: {r(tx(R0.rule))}</p>
      {fc && (
        <div className="fcmini">
          <span className="lab"><Glyph name={AGENTS.forecast.icon} />{r(tx('prevention.forecast.label'))}</span>
          {fc.f.ok ? (
            <>
              <b className={fc.f.cat.cls}>{r(tx('prevention.forecast.top', { pct: pct(fc.f.r), cat: r(fc.f.cat.lower), ha: haText(fc.f.ha, r) }))}</b>
              <span>{r(tx('prevention.forecast.detail', { dm: fc.dm ? r(tx('prevention.forecast.dmNote')) : '', r5: pct(fc.f.r5), p5: pct(fc.f.p5) }))} {r(fc.hint)}</span>
            </>
          ) : <span>{r(fc.f.why)}</span>}
        </div>
      )}
      {!dn && (
        <p className="note" aria-live="polite">
          {preview.b === 'refer' ? t('result.previewRefer', { v: vShown, team: r(preview.team) }) : t('result.previewOk', { v: vShown })}
        </p>
      )}
      {dn && route ? (
        <>
          {S.branch === 'refer'
            ? <StatusBox tone="amber" title={t('result.routed', { team: r(route.team) })}>{r(route.tCap)}.</StatusBox>
            : <StatusBox tone="green" title={t('result.healthyTitle')}>{r(route.tCap)}. {t('result.healthyNext', { next: r(route.next) })}</StatusBox>}
          {S.branch === 'refer' && (
            <ReviewQueue rows={[{ id: 'p9', who: tok(engine, r, 'full'), finding: r(route.tCap), team: r(route.team) }]} />
          )}
        </>
      ) : (
        <button type="button" className="btn" onClick={() => engine.sendResult()}>{t('result.send')}</button>
      )}
    </YourTurn>
  )
}
