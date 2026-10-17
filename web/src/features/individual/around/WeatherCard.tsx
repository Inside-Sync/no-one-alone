'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import type { Surroundings } from '@/data/types'
import { Head, MiniGrid } from '../home/parts'

/** `Weather in Marrickville` (c4): now, the 7-day strip and six readings. */
export function WeatherCard({ s }: { s: Surroundings }) {
  const w = s.weather
  return (
    <GlassCard span={4}>
      <Head icon={w.icon} title={w.heading} meta={w.meta} />
      <div className="wx-now"><b>{w.temp}</b><span>{w.summary}<br /><small className="muted">{w.feelsLike}</small></span></div>
      <div className="week">
        {s.week.map((d) => (
          <div key={d.day} className={d.hot ? 'hot' : ''}>
            <span>{d.day}</span>
            <span className="ic"><Icon name={d.icon} /></span>
            <b>{d.high}°</b>
            <span className="muted">{d.low}°</span>
          </div>
        ))}
      </div>
      <MiniGrid stats={w.stats} />
      <p className="fine">{w.note}</p>
    </GlassCard>
  )
}
