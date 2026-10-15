import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { OnceButton } from '@/components/ui/OnceButton'
import type { LabelValue, PathwayStep } from '@/data/types'
import { Head } from '../../individual/home/parts'

const plain = { fontWeight: 500 } as const

interface Props {
  meta: string
  rows: LabelValue[]
  pathway: PathwayStep[]
  /** Pathway text for the treatment window. */
  window: string
  /** Demo step, or null while Margaret's packet has not arrived. */
  step: number | null
}

/** `Packet` (c5): the selected packet, the stroke pathway checklist and the treatment window. */
export function PacketCard({ meta, rows, pathway, window, step }: Props) {
  const { t } = useTranslation(['hospital', 'common'])
  const once = t('common:onceLabels', { returnObjects: true }) as Record<string, string | undefined>
  const doneOf = (label: string) => once[label] ?? `✓ ${label}`
  const page = t('ed.page.label')
  const divert = t('ed.divert.label')
  return (
    <GlassCard span={5}>
      <Head title={t('ed.packet.title')} meta={meta} />
      <div className="packet" id="packet2">
        {rows.map(([k, v]) => <div key={k}><span>{k}</span><b style={plain}>{v}</b></div>)}
      </div>
      <div className="ch">
        <h2 style={{ fontSize: 14 }}>{t('ed.pathway.title')}</h2>
        <span className="meta" id="window">{window}</span>
      </div>
      <ul className="check" id="pathway">
        {pathway.map((p) => {
          const done = step !== null && step >= p.doneFromStep
          return (
            <li key={p.text}>
              <span className={`bx${done ? ' on' : ''}`}>{done ? '✓' : ''}</span>
              <span>{p.text}</span>
              <em>{done ? p.note : t('ed.pathway.pending')}</em>
            </li>
          )
        })}
      </ul>
      <div className="row">
        <OnceButton toast={t('ed.page.toast')} done={doneOf(page)}>{page}</OnceButton>
        <OnceButton className="soft" toast={t('ed.divert.toast')} done={doneOf(divert)}>{divert}</OnceButton>
      </div>
    </GlassCard>
  )
}
