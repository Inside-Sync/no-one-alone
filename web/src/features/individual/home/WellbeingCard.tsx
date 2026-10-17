'use client'

import { useTranslation } from 'react-i18next'
import { Radar } from '@/components/charts/Radar'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { Locked } from '@/components/ui/Locked'
import type { Forecast } from '@/data/types'
import { Head } from './parts'

const barColour = (v: number) => (v < 65 ? '#d9443f' : v < 75 ? '#c88a05' : '#1f8f5f')

/** `Overall wellbeing` (c5): radar plus one bar per area (`#comp`, check-in category). */
export function WellbeingCard({ forecast }: { forecast: Forecast }) {
  const { t } = useTranslation('home')
  const legend = t('wellbeing.legend', { returnObjects: true })
  const axes = forecast.wellbeingAxes.map((a) => ({ label: a.label, value: a.now, usual: a.lastMonth }))
  return (
    <Locked cat="checkin" span={5}>
      <GlassCard span={5}>
        <Head icon="compass" title={t('wellbeing.title')} meta={t('wellbeing.meta')} />
        <div className="radar-wrap">
          <div className="chart"><Radar axes={axes} score={forecast.wellbeing.score} ariaLabel={t('wellbeing.ariaLabel')} /></div>
          <div className="comp">
            {forecast.wellbeingAxes.map((a) => {
              const d = a.now - a.lastMonth
              return (
                <div key={a.label}>
                  <span><Glyph name={a.icon} />{a.label} <span className="muted mono" style={{ fontSize: '10.5px' }}>{(d > 0 ? '+' : '') + d}</span></span>
                  <b>{a.now}</b>
                  <span className="bar"><i style={{ width: `${a.now}%`, background: barColour(a.now) }}></i></span>
                </div>
              )
            })}
            <div className="legend">
              <span><i style={{ background: '#0b7f71' }}></i>{legend[0]}</span>
              <span><i style={{ background: '#8f6fd0' }}></i>{legend[1]}</span>
            </div>
          </div>
        </div>
        <p className="fine">{forecast.wellbeingNote}</p>
      </GlassCard>
    </Locked>
  )
}
