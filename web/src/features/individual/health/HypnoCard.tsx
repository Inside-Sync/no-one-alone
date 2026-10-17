'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Locked } from '@/components/ui/Locked'
import type { HealthData } from '@/data/types'
import { Head } from '../home/parts'
import { Hypnogram, STAGE_COLOURS } from './Hypnogram'
import { Legend } from './Legend'

/** `Last night's sleep` (c6, sleep category). */
export function HypnoCard({ hypnogram }: { hypnogram: HealthData['hypnogram'] }) {
  const { t } = useTranslation('health')
  return (
    <Locked cat="sleep" span={6}>
      <GlassCard span={6} className="chart">
        <Head icon="bed" title={t('hypno.title')} meta={hypnogram.title} />
        <div id="hypno"><Hypnogram hypnogram={hypnogram} ariaLabel={t('hypno.ariaLabel')} /></div>
        <Legend items={hypnogram.legend.map((label, i) => ({ label, color: STAGE_COLOURS[i] }))} />
      </GlassCard>
    </Locked>
  )
}
