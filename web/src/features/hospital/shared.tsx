'use client'

import { useTranslation } from 'react-i18next'
import { useRouter } from '@/app/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import type { Kpi as KpiData, MiniStat } from '@/data/types'
import { ClickRow } from '../individual/ClickRow'
import { KpiRow, MiniGrid, type ActionList } from '../shared/drawers'
import { useLiveIncident } from '@/state/LiveIncident'

/** `Ready for discharge: Margaret Collins, 78` (c12 sendbar on Pre-arrivals and Discharge follow-up) until her plan is sent. */
export function ReadyBanner() {
  const { t } = useTranslation('hospital')
  const router = useRouter()
  const { recovery } = useLiveIncident()
  if (recovery) return null
  return (
    <GlassCard span={12}>
      <div className="row" style={{ borderLeft: '4px solid var(--brand)', paddingLeft: 14, justifyContent: 'space-between', alignItems: 'center' }}>
        <span><b><Glyph name="stethoscope" />{t('ed.discharge.title')}</b><small className="meta" style={{ display: 'block' }}>{t('ed.discharge.sub')}</small></span>
        <button type="button" className="btn" onClick={() => router.push('/hospital/patient')}><Glyph name="notebook-pen" />{t('ed.discharge.open')}</button>
      </div>
    </GlassCard>
  )
}

/** `.kpis` row of a hospital page: six tiles, each opening its detail drawer. */
export function HospitalKpis({ id, kpis }: { id: string; kpis: KpiData[] }) {
  const { t } = useTranslation('hospital')
  return <KpiRow id={id} kpis={kpis} actions={t('actions.kpi', { returnObjects: true }) as unknown as ActionList} fallback="hospital" />
}

/** A `.mini` grid whose cells open the hospital info drawer. */
export function HospitalMini({ stats }: { stats: readonly MiniStat[] }) {
  const { t } = useTranslation('hospital')
  return <MiniGrid stats={stats} actions={t('actions.mini', { returnObjects: true }) as unknown as ActionList} fallback="hospital" />
}

/** A `tbody tr` of a hospital table: opens the "Open full chart / Message GP / Assign to me" drawer. */
export function HospitalRow(props: Omit<Parameters<typeof ClickRow>[0], 'actions'>) {
  const { t } = useTranslation('hospital')
  return <ClickRow {...props} actions={t('actions.row', { returnObjects: true }) as unknown as ActionList} />
}
