'use client'

import { useTranslation } from 'react-i18next'
import { LineChart } from '@/components/charts/LineChart'
import { GlassCard } from '@/components/ui/GlassCard'
import { ALERT_MIN, alertRun, clockText, watchNote, type Watch } from '@/domain/simulator'
import { Head } from '../home/parts'

const ALERT_HR = 120

/** Live mode (c8): the watch's last 40 readings, the movement strip and how far the rule has counted. */
export function LiveReadingsCard({ watch: w }: { watch: Watch }) {
  const { t } = useTranslation('live')
  const { readings } = w
  const run = alertRun(readings)
  const n = Math.min(run, ALERT_MIN)
  const now = clockText(w.clock)
  return (
    <GlassCard span={8} id="simReadings">
      <Head title={t('sim.readings.title')} meta={t('sim.readings.meta')}>
        <b style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 300 }}>{now}</b>
      </Head>
      <div className="chart">
        <LineChart
          yLabel={t('sim.readings.hr')}
          series={[
            { name: t('sim.readings.hr'), values: readings.map((r) => r.hr), color: '#ef6a5e', width: 2.2, endLabel: true },
            ...(run > 0 ? [{ name: t('sim.readings.run'), values: readings.slice(-run).map((r) => r.hr), start: readings.length - run, color: '#ef6a5e', dots: { r: 2.5 } }] : []),
            { name: t('sim.readings.alert'), values: readings.map(() => ALERT_HR), color: '#d9443f', dashed: true, width: 1.4 },
          ]}
          y={{ min: 40, max: 180, ticks: [60, 100, 120, 160] }}
          x={{ count: readings.length }}
        />
      </div>
      <div role="img" aria-label={t('sim.readings.movement', { n: w.stillMin })} style={{ display: 'flex', gap: 2 }}>
        {readings.map((r) => (
          <i key={r.minute} style={{ flex: 1, height: 10, borderRadius: 2, background: r.moving ? '#1fb39c' : '#c9d3d1' }} />
        ))}
      </div>
      <div className="fine" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{t('sim.readings.ago')}</span><span>{t('sim.readings.now', { time: now })}</span>
      </div>
      <p className="chip" style={{ whiteSpace: 'normal', color: run >= ALERT_MIN ? 'var(--bad)' : 'var(--muted-text)' }}>
        <b>{t('sim.readings.rule')}</b>
      </p>
      <p className="fine">
        {t('sim.readings.progress', { n, hr: w.hr, state: t(w.stillMin === 0 ? 'sim.readings.moving' : 'sim.readings.still') })}
      </p>
      <div role="progressbar" aria-label={t('sim.readings.rule')} aria-valuenow={n} aria-valuemin={0} aria-valuemax={ALERT_MIN} className="wbar">
        <i style={{ width: `${(n / ALERT_MIN) * 100}%` }} />
      </div>
      <p className="fine">{t(`sim.readings.note.${watchNote(w)}`)}</p>
    </GlassCard>
  )
}
