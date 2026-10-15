import { GlassCard } from '@/components/ui/GlassCard'
import { useTranslation } from 'react-i18next'
import type { Forecast } from '@/data/types'

/** `ℹ️ How this forecast works` (c12): the only card that carries the "Example figures" label (R6). */
export function ModelCard({ model, meta }: { model: Forecast['model']; meta: string }) {
  const { t } = useTranslation('forecast')
  return (
    <GlassCard span={12}>
      <div className="ch">
        <h2>{t('modelTitle')}</h2>
        <span className="meta">{meta}</span>
      </div>
      <div className="model">
        {model.map((m) => (
          <div key={m.label}>{m.emoji} {m.label}<b>{m.value}</b></div>
        ))}
      </div>
    </GlassCard>
  )
}
