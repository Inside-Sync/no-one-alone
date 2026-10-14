import { Waterfall } from '@/components/charts/Waterfall'
import { GlassCard } from '@/components/ui/GlassCard'
import { FORECAST_COPY } from '@/data/repo'
import type { Forecast } from '@/data/types'
import { Head } from '../home/parts'

/** `⚖️ What pushes her stroke chance up or down` (c5): `SH` bars. */
export function ShapCard({ shap, note }: { shap: Forecast['shap']; note: string }) {
  const c = FORECAST_COPY.shap
  return (
    <GlassCard span={5}>
      <Head title={c.title} meta={c.meta} />
      <Waterfall items={shap.map((s) => ({ label: s.label, delta: s.value }))} base={0.6} />
      <p className="fine">{note}</p>
    </GlassCard>
  )
}
