'use client'

import { Glyph } from '@/components/ui/Icon'
import { AGENTS } from '../../../data/agents'
import { FAMILY_MEMBERS } from '../../../data/family'
import { pct, tx, type ForecastYes, type HeartAge } from '../../../engine'
import type { Resolve, ScreenProps } from '../types'
import { signed } from '../signed'
import { useP } from '../prevention/parts'
import { ForecastChartSvg } from './Chart'

/** Heart age as text: a number, or "30 or less" / "over 100". */
export const haText = (ha: HeartAge, r: Resolve): string => (typeof ha === 'number' ? String(ha) : r(tx(`forecast.ha.${ha}`)))

/** The evidence a score used and what it lacked (prototype: the BMI estimate before cholesterol is measured), with the engine's own note. */
function Evidence({ f, r }: { f: ForecastYes; r: Resolve }) {
  const t = useP()
  const ev = f.evidence
  const val = (id: string, v: number | string | boolean): string => {
    if (typeof v === 'boolean') return t(v ? 'fam.ev.yes' : 'fam.ev.no')
    if (id === 'sex') return t(v === 'F' ? 'fam.ev.F' : 'fam.ev.M')
    return String(v)
  }
  return (
    <div className="fc-ev">
      <span className="lab">{t('fam.fc.evidence')}</span>
      <p className="fc-ev-note"><b>{r(ev.note)}</b></p>
      <div className="fc-ev-row">
        <span className="fc-ev-h">{t('fam.fc.used')}</span>
        <ul className="chips" aria-label={t('fam.fc.used')}>
          {ev.used.map((u) => <li key={u.id}>{t('fam.ev.pair', { label: t(`fam.ev.${u.id}`), value: val(u.id, u.value) })}</li>)}
        </ul>
      </div>
      {ev.missing.length > 0 && (
        <div className="fc-ev-row">
          <span className="fc-ev-h">{t('fam.fc.missing')}</span>
          <ul className="chips miss" aria-label={t('fam.fc.missing')}>
            {ev.missing.map((u) => <li key={u.id}>{t(`fam.ev.${u.id}`)}</li>)}
          </ul>
        </div>
      )}
      <p className="note">{t('fam.fc.trends', { sbp: signed(ev.trends.sbp), bmi: signed(ev.trends.bmi) })}</p>
    </div>
  )
}

/**
 * Noa Forecast of the selected member (prototype famForecastHTML): risk now, category, heart age, the 5-year chart with its three lines, the
 * evidence used and missing, or why the member is not scored; the signals each agent collected; the next action; for a child the visits
 * (n of 14); the IFHAS status. It says in words that this is a signal, not a diagnosis.
 */
export function FamilyForecast({ snap, r }: ScreenProps) {
  const t = useP()
  const F = snap.state.fm
  const fam = snap.family
  if (!F || !fam) return null
  const k = F.sel
  const m = FAMILY_MEMBERS.find((x) => x.id === k)!
  const p = F.prof[k]
  const f = fam.forecast[k]
  const name = r(tx(m.name))
  const child = fam.child[k]
  return (
    <div className="fcpanel">
      <span className="lab"><Glyph name={AGENTS.forecast.icon} />{t('fam.fc.title', { n: name })}</span>
      {f.ok ? (
        <>
          <div className="fc-top">
            <div className={`fc-big ${f.cat.cls}`} aria-label={pct(f.r)}>{pct(f.r)}</div>
            <div>
              <b>{t('fam.fc.headline', { cat: r(f.cat.label) })}</b>
              <span>{t('fam.fc.detail', { ha: haText(f.ha, r), age: p.child ? '' : p.age, variant: t(f.lab ? 'fam.fc.withLab' : 'fam.fc.withoutLab') })}</span>
            </div>
          </div>
          <ForecastChartSvg chart={f.chart} />
          <Evidence f={f} r={r} />
          <p className="fc-signal" role="note"><Glyph name="triangle-alert" />{t('fam.fc.signalNote')}</p>
        </>
      ) : (
        <div className="fc-na" role="status">
          <b>{t('fam.fc.notScored')}</b>
          <span>{r(f.why)}</span>
        </div>
      )}
      {child && <p className="fc-child">{t('fam.fc.childLine', { n: child.done, total: child.total })}</p>}
      {!p.child && <p className="fc-ifhas"><span className={`pill ${fam.ifhas[k] ? 'p-ok' : 'p-no'}`}>{t(fam.ifhas[k] ? 'fam.fc.ifhas' : 'fam.fc.noIfhas')}</span></p>}
      <span className="lab">{t('fam.fc.signals')}</span>
      <ul className="sigs">
        {fam.signals[k].map((s, i) => (
          <li key={i}>
            <span className="sg-a"><Glyph name={AGENTS[s.agent].icon} /><span className="tcp-sr">{r(tx(AGENTS[s.agent].n))}</span></span>
            <span><b>{r(s.source)}</b><em>{r(s.value)}</em></span>
          </li>
        ))}
      </ul>
      {f.ok && <p className="note">{t('fam.fc.caveat', { n: name })}</p>}
    </div>
  )
}
