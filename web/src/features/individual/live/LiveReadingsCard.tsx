'use client'

import { useTranslation } from 'react-i18next'
import { LineChart } from '@/components/charts/LineChart'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { ALERT_HR, ALERT_MIN, alertRun, clockText, watchNote, type Watch } from '@/domain/simulator'
import { Head } from '../home/parts'


/** Live mode (c8): the watch's last 40 readings, the movement strip and how far the rule has counted. */
export function LiveReadingsCard({ watch: w }: { watch: Watch }) {
  const { t } = useTranslation('live')
  const { readings } = w
  const run = alertRun(readings)
  const n = Math.min(run, ALERT_MIN)
  const now = clockText(w.clock)
  const note = watchNote(w)
  return (
    <GlassCard span={8} id="simReadings">
      <Head icon="trend" title={t('sim.readings.title')} meta={t('sim.readings.meta')}>
        <b style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 300 }}>{now}</b>
      </Head>
      <div className="chart">
        <LineChart
          yLabel={t('sim.readings.hr')}
          series={[
            { name: t('sim.readings.hr'), values: readings.map((r) => r.hr), color: '#ef6a5e', width: 2.4, endLabel: true, area: 'rgba(239,106,94,.16)' },
            ...(run > 0 ? [{ name: t('sim.readings.run'), values: readings.slice(-run).map((r) => r.hr), start: readings.length - run, color: '#ef6a5e', dots: { r: 2.5 } }] : []),
            { name: t('sim.readings.alert'), values: readings.map(() => ALERT_HR), color: '#d9443f', dashed: true, width: 1.4 },
          ]}
          y={{ min: 40, max: 180, ticks: [60, 100, 120, 160] }}
          x={{ count: readings.length }}
        />
      </div>
      <div className="mvrow">
        <span>{t('sim.readings.movementLabel')}</span>
        <div className="mv" role="img" aria-label={t('sim.readings.movement', { n: w.stillMin })}>
          {readings.map((r, i) => <i key={r.minute} className={r.moving ? '' : i >= readings.length - run ? 'still run' : 'still'} />)}
        </div>
      </div>
      <div className="fine" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{t('sim.readings.ago')}</span><span>{t('sim.readings.now', { time: now })}</span>
      </div>
      <p className="fine">{t('sim.readings.rule')}</p>
      <div className="conds">
        <div className={w.hr > ALERT_HR ? 'cond on' : 'cond'}>
          <span className="ck" aria-hidden="true">{w.hr > ALERT_HR ? '✓' : ''}</span>
          <span><b>{t('sim.readings.condHr')}</b><small>{t('sim.readings.condHrSub', { hr: w.hr })}</small></span>
        </div>
        <div className={w.stillMin > 0 ? 'cond on' : 'cond'}>
          <span className="ck" aria-hidden="true">{w.stillMin > 0 ? '✓' : ''}</span>
          <span><b>{t('sim.readings.condStill')}</b><small>{w.stillMin > 0 ? t('sim.readings.condStillSub', { n: w.stillMin }) : t('sim.readings.condMoving')}</small></span>
        </div>
        <div role="progressbar" aria-label={t('sim.readings.rule')} aria-valuenow={n} aria-valuemin={0} aria-valuemax={ALERT_MIN}
          aria-valuetext={t('sim.readings.progress', { n, hr: w.hr, state: t(w.stillMin === 0 ? 'sim.readings.moving' : 'sim.readings.still') })}
          className={n >= ALERT_MIN ? 'meter on' : 'meter'}>
          <b>{n}/{ALERT_MIN}</b><small>{t('sim.readings.meter')}</small>
          <i className="wbar"><i style={{ width: `${(n / ALERT_MIN) * 100}%` }} /></i>
        </div>
      </div>
      <p className={`noteline ${note}`}>{note === 'alert' && <Glyph name="siren" />}{t(`sim.readings.note.${note}`)}</p>
    </GlassCard>
  )
}
