'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { guard } from '@/features/familyHealth'
import { sayOutside } from '@/features/familyHealth/ui'
import { Icon } from '@/components/ui/Icon'
import { TableScroll } from '@/components/ui/TableScroll'
import { suppressRate, isSuppressed } from '@/domain/suppression'
import { intlLocale } from '@/i18n'
import gs from '../government.module.css'
import s from './prevention.module.css'

/**
 * Government > Population health, first section: "Prevention and screening" (the prototype's `#g04h`, `#g04k`, `#g04`).
 * Demo figures and every text come from `government:population.prevention` (en and ar); numbers are formatted for the
 * language in use. Groups under 10 people are hidden by the small-cell rule (`domain/suppression`).
 */

type Prevention = ReturnType<typeof usePrevention>

function usePrevention() {
  const { t } = useTranslation('government')
  return t('population.prevention', { returnObjects: true })
}

const int = (n: number) => n.toLocaleString(intlLocale())
/** A percent from a 0-100 value; `fixed` keeps one decimal (1.0%), otherwise up to one. */
const pct = (v: number, fixed = false) =>
  new Intl.NumberFormat(intlLocale(), { style: 'percent', minimumFractionDigits: fixed ? 1 : 0, maximumFractionDigits: 1 }).format(v / 100)

export function PreventionSection() {
  const p = usePrevention()
  return (
    <>
      <h2 className={`c12 ${gs.sec}`} id="g04h">{p.heading}</h2>
      <PreventionKpis p={p} />
      <PreventionCard p={p} />
    </>
  )
}

function PreventionKpis({ p }: { p: Prevention }) {
  const { t } = useTranslation('government')
  return (
    <div className={`c12 ${s.kpis}`} id="g04k">
      {p.kpis.map((k, i) => {
        const kpi = k as typeof k & { args?: number[]; warn?: boolean }
        const value = kpi.format === 'int' ? int(kpi.value) : kpi.format === 'oe' ? t('population.prevention.oe', { v: kpi.value.toLocaleString(intlLocale()) }) : pct(kpi.value)
        const [a, b] = kpi.args ?? []
        // Counts above 100 are people; small numbers in a note are percents ("target 75%", "96% of those attended").
        const fmt = (n: number | undefined) => (n === undefined ? '' : n > 100 ? int(n) : pct(n))
        return (
          <div key={kpi.label} className="glass">
            <small>{kpi.label}</small>
            <b>{value}</b>
            <span className={kpi.warn ? s.warn : undefined}>{t(`population.prevention.kpis.${i}.note` as 'population.prevention.heading', { a: fmt(a), b: fmt(b) })}</span>
          </div>
        )
      })}
    </div>
  )
}

function PreventionCard({ p }: { p: Prevention }) {
  return (
    <article className={`glass card c12 ${s.card}`} id="g04">
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="target" /></span></span>
        <h2>{p.card.title}</h2>
        <span className="pill plain">{p.card.pill}</span>
      </div>
      <p className={s.intro}>{p.card.intro}</p>
      <WeeklySummary p={p} />
      <div className={s.row}>
        <section><SegmentTable p={p} /></section>
        <section><CalibrationChart p={p} /></section>
      </div>
      <div className={s.row}>
        <section><OutcomeFunnel p={p} /></section>
        <section>
          <RecommendedMix p={p} />
          <SafeguardList p={p} />
        </section>
      </div>
    </article>
  )
}

type SegRow = { segment: string; eligible: number; recommended: number | null; uptake: number | null }
/** Uptake by segment as whole percents, only for groups the table shows (10 or more people recommended). */
function weeklyGroups(p: Prevention) {
  return (p.segments.rows as SegRow[]).flatMap((r) => {
    if (isSuppressed(r.eligible) || r.recommended == null || r.uptake == null || r.recommended < 10) return []
    const u = suppressRate((r.uptake / r.recommended) * 100, r.recommended)
    return u == null ? [] : [{ segment: r.segment, recommended: r.recommended, uptake_pct: Math.round(u) }]
  }).slice(0, 12)
}

/**
 * "This period": the Analyst sums up uptake for the programme manager. Prepared text from the same numbers at once; with the
 * live AI on, the model's two or three sentences (aggregates only, every number from the params, checked by the server).
 */
function WeeklySummary({ p }: { p: Prevention }) {
  const { t, i18n } = useTranslation('government')
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en'
  const w = p.weekly
  const groups = weeklyGroups(p)
  const sorted = [...groups].sort((a, b) => a.uptake_pct - b.uptake_pct)
  const low = sorted[0], high = sorted[sorted.length - 1]
  const fallback = low && high ? t('population.prevention.weekly.prepared', { low: low.segment, lowPct: pct(low.uptake_pct), high: high.segment, highPct: pct(high.uptake_pct) }) : ''
  const [live, setLive] = useState<{ lang: string; text: string } | null>(null)
  const key = JSON.stringify(groups)
  useEffect(() => {
    if (!groups.length) return
    let on = true
    void sayOutside({
      callId: 'analyst.weekly', tier: 'fast', skill: 'analyst', domain: 'gov', audience: w.audience, lang, maxWords: 60,
      facts: { period: w.period, groups },
      task: 'For a health department manager, two or three sentences on screening uptake: the lowest and highest groups and one plain observation. Aggregates only.',
      fallback,
    }).then((r) => { if (on && r?.source === 'live' && !guard(r.text)) setLive({ lang, text: r.text }) })
    return () => { on = false }
    // The groups and texts change only with the language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, key])
  if (!fallback) return null
  const text = live?.lang === lang ? live.text : null
  return (
    <p className={s.weekly} id="g04w">
      <b>{w.title}</b> <span>{text ?? fallback}</span> <span className={`pill plain ${text ? s.liveTag : ''}`}>{text ? w.live : w.prep}</span>
    </p>
  )
}

function SegmentTable({ p }: { p: Prevention }) {
  const g = p.segments
  const c = g.columns
  const dash = <i>{g.none}</i>
  return (
    <>
      <h3>{g.title}</h3>
      <TableScroll label={g.title}>
        <table>
          <thead>
            <tr><th>{c.segment}</th><th>{c.eligible}</th><th>{c.reached}</th><th>{c.recommended}</th><th>{c.uptake}</th><th>{c.falsePositive}</th><th>{c.missed}</th></tr>
          </thead>
          <tbody id="g04seg">
            {g.rows.map((row) => {
              const r = row as { segment: string; eligible: number; reached: number | null; recommended: number | null; uptake: number | null; falsePositive: number | null; missed: number | null }
              if (isSuppressed(r.eligible)) {
                return <tr key={r.segment} className={s.sup}><td>{r.segment}</td><td colSpan={6}>{g.suppressed}</td></tr>
              }
              const reached = r.reached == null ? null : suppressRate((r.reached / r.eligible) * 100, r.eligible)
              const uptake = r.uptake == null || r.recommended == null ? null : suppressRate((r.uptake / r.recommended) * 100, r.recommended)
              return (
                <tr key={r.segment}>
                  <td>{r.segment}</td>
                  <td>{int(r.eligible)}</td>
                  <td>{reached == null ? dash : pct(Math.round(reached))}</td>
                  <td>{r.recommended == null ? dash : int(r.recommended)}</td>
                  <td>{uptake == null ? <i>{g.notEnoughData}</i> : <b className={uptake < 40 ? s.lo : undefined}>{pct(Math.round(uptake))}</b>}</td>
                  <td>{r.falsePositive == null ? dash : pct(r.falsePositive)}</td>
                  <td>{r.missed == null ? <i>{g.notEnoughFollowUp}</i> : pct(r.missed, true)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
      <p className={s.note}>{g.note}</p>
    </>
  )
}

const W = 320
const H = 190
const X = (v: number) => 34 + (v / 30) * (W - 46)
const Y = (v: number) => H - 26 - (v / 30) * (H - 40)

function CalibrationChart({ p }: { p: Prevention }) {
  const c = p.calibration
  return (
    <>
      <h3>{c.title}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className={s.cal} role="img" aria-label={c.ariaLabel}>
        <line x1={X(0)} y1={Y(0)} x2={X(30)} y2={Y(30)} className={s.diag} />
        <line x1={X(0)} y1={Y(0)} x2={X(30)} y2={Y(0)} className={s.ax} />
        <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(30)} className={s.ax} />
        {c.points.map(([pr, ob]) => <circle key={pr} cx={X(pr)} cy={Y(ob)} r={5} />)}
        <text x={X(15)} y={H - 6} textAnchor="middle">{c.x}</text>
        <text x={12} y={Y(15)} transform={`rotate(-90 12 ${Y(15)})`} textAnchor="middle">{c.y}</text>
        <text x={X(27)} y={Y(27) - 12} textAnchor="end" className={s.flag}>{c.flag}</text>
      </svg>
      <p className={s.note}>{c.note}</p>
    </>
  )
}

function OutcomeFunnel({ p }: { p: Prevention }) {
  const { t } = useTranslation('government')
  const f = p.funnel
  const top = f.stages[0].value
  return (
    <>
      <h3>{f.title}</h3>
      <div className={s.funnel}>
        {f.stages.map((st, i) => (
          <div key={st.label} className={s.fr}>
            <span>{st.label}</span>
            <i style={{ width: `${Math.max(8, Math.round((st.value / top) * 100))}%` }} />
            <b>{int(st.value)}</b>
            <em>{i ? t('population.prevention.funnel.ofPrevious', { pct: pct(Math.round((st.value / f.stages[i - 1].value) * 100)) }) : ''}</em>
          </div>
        ))}
      </div>
    </>
  )
}

function RecommendedMix({ p }: { p: Prevention }) {
  const m = p.mix
  const max = Math.max(...m.rows.map((r) => r.value))
  return (
    <>
      <h3>{m.title}</h3>
      <div className={s.mix}>
        {m.rows.map((r) => (
          <div key={r.label}>
            <span>{r.label}</span>
            <i style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
            <b>{int(r.value)}</b>
          </div>
        ))}
      </div>
    </>
  )
}

function SafeguardList({ p }: { p: Prevention }) {
  const { t } = useTranslation('government')
  return (
    <ul className={`list ${s.safe}`}>
      {p.safeguards.map((g, i) => {
        const args = g.args as { n?: number; a?: number; b?: number }
        const vals = {
          n: args.n === undefined ? '' : int(args.n),
          a: args.a === undefined ? '' : pct(args.a),
          b: args.b === undefined ? '' : pct(args.b),
        }
        return (
          <li key={g.title}>
            <span className="li"><span className="ic"><Icon name="target" /></span></span>
            <span><b>{g.title}</b><small>{t(`population.prevention.safeguards.${i}.detail` as 'population.prevention.heading', vals)}</small></span>
            <span className={`pill ${g.tone}`}>{g.pill}</span>
          </li>
        )
      })}
    </ul>
  )
}
