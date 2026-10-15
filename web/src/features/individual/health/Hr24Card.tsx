'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Locked } from '@/components/ui/Locked'
import type { Hr24 } from '@/data/types'
import { Head } from '../home/parts'
import { Hr24Chart } from './Hr24Chart'
import { Legend } from './Legend'

/** `❤️ Heartbeat over the last day` (c8, heart category). */
export function Hr24Card({ hr }: { hr: Hr24 }) {
  const { t } = useTranslation('health')
  return (
    <Locked cat="heart" span={8}>
      <GlassCard span={8} className="chart">
        <Head title={t('hr.title')} meta={t('hr.meta')} />
        <div id="hr24"><Hr24Chart hr={hr} ariaLabel={t('hr.ariaLabel')} asleepLabel={t('hr.asleep')} /></div>
        <Legend items={t('hr.legend', { returnObjects: true })} />
      </GlassCard>
    </Locked>
  )
}
