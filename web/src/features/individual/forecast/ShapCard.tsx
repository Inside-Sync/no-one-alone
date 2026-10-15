import { Waterfall } from '@/components/charts/Waterfall'
import { GlassCard } from '@/components/ui/GlassCard'
import { useTranslation } from 'react-i18next'
import type { Forecast } from '@/data/types'
import { Head } from '../home/parts'

/** `⚖️ What pushes her stroke chance up or down` (c5): `SH` bars. */
export function ShapCard({ shap, note }: { shap: Forecast['shap']; note: string }) {
  const { t } = useTranslation('forecast')
  return (
    <GlassCard span={5}>
      <Head title={t('shap.title')} meta={t('shap.meta')} />
      <Waterfall items={shap.map((s) => ({ label: s.label, delta: s.value }))} base={0.6} />
      <p className="fine">{note}</p>
    </GlassCard>
  )
}
