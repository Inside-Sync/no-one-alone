'use client'

import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { pct, type ForecastChart } from '../../../engine'
import { useP } from '../prevention/parts'

const W = 300
const H = 110
const L = 30
const R = W - 10

/**
 * The 5-year Noa Forecast chart (prototype fcChart) as inline SVG: three bands (low, moderate, high), today's score (dot), the line "if today's
 * trends continue" (solid) and "with the plan" (dashed). It is an image with a text alternative (`aria-label`, `<title>`, `<desc>`) and a
 * visually hidden list with every year's value. In a right-to-left language time runs right to left and the axis sits on the right.
 */
export function ForecastChartSvg({ chart, tone }: { chart: ForecastChart; tone?: string }) {
  const t = useP()
  const { i18n } = useTranslation()
  const rtl = i18n.dir() === 'rtl'
  const uid = useId()
  const flip = (x: number) => (rtl ? W - x : x)
  const x = (i: number) => flip(L + (i * (R - L)) / 5)
  const y = (v: number) => H - 18 - (v / chart.max) * (H - 30)
  const xs = Math.min(flip(L), flip(R))
  const line = (vals: number[]) => vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = chart.years.length - 1
  const label = t('fam.chart.label', { now: pct(chart.now), trend: pct(chart.trend[last]), plan: pct(chart.plan[last]) })
  const bandTone = { low: 'var(--good-s)', mid: 'var(--warn-s)', high: 'var(--bad-s)' } as const
  const bandName = { low: 'fam.chart.bandLow', mid: 'fam.chart.bandMid', high: 'fam.chart.bandHigh' } as const
  const axisX = flip(L - 4)
  return (
    <div className={`tcp-chart${tone ? ` ${tone}` : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} aria-describedby={`${uid}-d`} className="tcp-chart-svg">
        <title id={`${uid}-t`}>{label}</title>
        <desc id={`${uid}-d`}>{t('fam.chart.title')}</desc>
        {chart.bands.map((b) => (
          <rect key={b.id} x={xs} width={R - L} y={y(Math.min(b.to, chart.max))} height={y(b.from) - y(Math.min(b.to, chart.max))} fill={bandTone[b.id]} opacity={0.5}>
            <title>{t(bandName[b.id])}</title>
          </rect>
        ))}
        {chart.ticks.map((v) => (
          <text key={v} x={axisX} y={y(v) + 3} textAnchor={rtl ? 'start' : 'end'} fill="var(--muted)">{Math.round(v * 100)}%</text>
        ))}
        {chart.years.map((yr, i) => (
          <text key={yr} x={x(i)} y={H - 5} textAnchor="middle" fill="var(--muted)">{i ? t('fam.chart.year', { n: i }) : t('fam.chart.now')}</text>
        ))}
        <polyline fill="none" stroke="var(--bad)" strokeWidth={2.4} points={line(chart.trend)} />
        <polyline fill="none" stroke="var(--m-ind)" strokeWidth={2.4} strokeDasharray="5 4" points={line(chart.plan)} />
        <circle cx={x(0)} cy={y(chart.now)} r={4} fill="var(--ink)" />
      </svg>
      <div className="fc-key">
        <span><i className="solid" aria-hidden="true" />{t('fam.chart.trend', { v: pct(chart.trend[last]) })}</span>
        <span><i className="dash" aria-hidden="true" />{t('fam.chart.plan', { v: pct(chart.plan[last]) })}</span>
      </div>
      <ul className="tcp-sr">
        {chart.years.map((yr, i) => (
          <li key={yr}>{t('fam.chart.yearRow', { y: i ? t('fam.chart.year', { n: i }) : t('fam.chart.now'), trend: pct(chart.trend[i]), plan: pct(chart.plan[i]) })}</li>
        ))}
      </ul>
    </div>
  )
}
