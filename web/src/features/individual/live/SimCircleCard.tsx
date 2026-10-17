'use client'

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Orbit } from '@/components/canvas/Orbit'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import type { OrbitScene } from '@/data/types'
import { Head } from '../home/parts'

const orbitStyle: CSSProperties = { height: 290 }
const right: CSSProperties = { textAlign: 'right' }

/** Idle Simulator page (c4): the care circle at rest, beside Live readings. */
export function SimCircleCard({ scene }: { scene: OrbitScene | null }) {
  const { t } = useTranslation('live')
  return (
    <GlassCard span={4} id="simCircle">
      <Head title={t('sim.circle.title')} meta={<Pill tone="good">{t('sim.circle.pill')}</Pill>} />
      {scene ? (
        <Orbit scene={scene} ariaLabel={t('sim.circle.aria')} labels tilt={0.6} zoom={0.95} style={orbitStyle} />
      ) : (
        <div className="c3d" style={orbitStyle}></div>
      )}
      <div className="em-stat">
        <b className="v">0′</b>
        <span><span className="k">{t('since')}</span><br /><b>{t('sim.circle.state')}</b></span>
        <span style={{ flex: 1 }}></span>
        <span style={right}><b>{t('sim.circle.what')}</b><br /><small className="muted">{t('sim.circle.sub')}</small></span>
      </div>
    </GlassCard>
  )
}
