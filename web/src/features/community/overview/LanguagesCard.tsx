import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { LanguageRow } from '@/data/types'
import { Head } from '../../individual/home/parts'

const SUPPORT_COLOUR: Record<LanguageRow['support'], string> = { Full: '#1fb39c', Beta: '#c88a05', Interpreter: '#8f6fd0' }

/** `Languages` (c4): share of residents per preferred language, coloured by voice support. */
export function LanguagesCard({ rows }: { rows: LanguageRow[] }) {
  const { t } = useTranslation('community')
  const max = Math.max(...rows.map((l) => l.percent))
  return (
    <GlassCard span={4}>
      <Head title={t('overview.languages.title')} meta={t('overview.languages.meta')} />
      <div className="hbars" id="langs">
        {rows.map((l) => (
          <div key={l.name}>
            <span>{l.name}</span>
            <span className="tr"><i style={{ width: `${(l.percent / max) * 100}%`, background: SUPPORT_COLOUR[l.support] }}></i></span>
            <b>{l.percent}% · {t(`overview.languages.support.${l.support}`)}</b>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
