import { GlassCard } from '@/components/ui/GlassCard'
import { COMMUNITY_COPY } from '@/data/repo'
import type { LanguageRow } from '@/data/types'
import { Head } from '../../individual/home/parts'

const SUPPORT_COLOUR: Record<LanguageRow['support'], string> = { Full: '#1fb39c', Beta: '#c88a05', Interpreter: '#8f6fd0' }

/** `Languages` (c4): share of residents per preferred language, coloured by voice support. */
export function LanguagesCard({ rows }: { rows: LanguageRow[] }) {
  const c = COMMUNITY_COPY.overview.languages
  const max = Math.max(...rows.map((l) => l.percent))
  return (
    <GlassCard span={4}>
      <Head title={c.title} meta={c.meta} />
      <div className="hbars" id="langs">
        {rows.map((l) => (
          <div key={l.name}>
            <span>{l.name}</span>
            <span className="tr"><i style={{ width: `${(l.percent / max) * 100}%`, background: SUPPORT_COLOUR[l.support] }}></i></span>
            <b>{l.percent}% · {l.support}</b>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
