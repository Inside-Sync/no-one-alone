'use client'

import { useTranslation } from 'react-i18next'
import { LineChart } from '@/components/charts/LineChart'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { ruleChecks, simSeries, type SimSettings } from '@/domain/simulator'
import { Head } from '../home/parts'

const hidden = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' } as const

/** Live mode (c7): the 40 minutes of readings the Simulator settings describe, and the verify rule they meet. */
export function LiveReadingsCard({ settings, baseline }: { settings: SimSettings; baseline: number }) {
  const { t } = useTranslation('live')
  const series = simSeries(settings, baseline)
  const checks = ruleChecks(settings, baseline)
  const stillMin = series.filter((r) => !r.moving).length
  const rows = [
    { ok: checks.still, text: t('sim.readings.still') },
    { ok: checks.hr, text: t('sim.readings.hrCheck', { threshold: checks.threshold }) },
  ]
  return (
    <GlassCard span={7} id="simReadings">
      <Head title={t('sim.readings.title')} meta={t('sim.readings.meta')} />
      <div className="chart">
        <LineChart
          yLabel={t('sim.readings.hr')}
          series={[
            { name: t('sim.readings.hr'), values: series.map((r) => r.hr), color: 'var(--bad)', endLabel: true },
            { name: t('sim.readings.alert'), values: series.map(() => checks.threshold), color: 'var(--muted)', dashed: true, width: 1.4 },
          ]}
          y={{ min: 40, max: 180, ticks: [60, 100, 140, 180] }}
          x={{ count: 40, labels: [{ at: 0, text: t('sim.readings.ago') }, { at: 39, text: t('sim.readings.now') }] }}
        />
      </div>
      <div role="img" aria-label={t('sim.readings.movement', { n: stillMin })} style={{ display: 'flex', gap: 2 }}>
        {series.map((r) => (
          <i key={r.minute} style={{ flex: 1, height: 10, borderRadius: 2, background: r.moving ? 'var(--brand)' : 'rgba(13,42,42,.14)' }} />
        ))}
      </div>
      <ul className="row" aria-label={t('sim.readings.checks')} style={{ listStyle: 'none' }}>
        {rows.map((c) => (
          <li key={c.text} className="chip" style={{ whiteSpace: 'normal', color: c.ok ? 'var(--good-text)' : 'var(--muted-text)' }}>
            <span className="ic"><Icon name={c.ok ? 'check' : 'x'} /></span>
            <span>{c.text}</span>
            <span style={hidden}>{c.ok ? t('sim.readings.met') : t('sim.readings.notMet')}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
