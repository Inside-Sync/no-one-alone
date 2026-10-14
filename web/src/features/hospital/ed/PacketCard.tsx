import { GlassCard } from '@/components/ui/GlassCard'
import { OnceButton } from '@/components/ui/OnceButton'
import { HOSPITAL_COPY, ONCE_LABELS } from '@/data/repo'
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
  const c = HOSPITAL_COPY.ed
  return (
    <GlassCard span={5}>
      <Head title={c.packet.title} meta={meta} />
      <div className="packet" id="packet2">
        {rows.map(([k, v]) => <div key={k}><span>{k}</span><b style={plain}>{v}</b></div>)}
      </div>
      <div className="ch">
        <h2 style={{ fontSize: 14 }}>{c.pathway.title}</h2>
        <span className="meta" id="window">{window}</span>
      </div>
      <ul className="check" id="pathway">
        {pathway.map((p) => {
          const done = step !== null && step >= p.doneFromStep
          return (
            <li key={p.text}>
              <span className={`bx${done ? ' on' : ''}`}>{done ? '✓' : ''}</span>
              <span>{p.text}</span>
              <em>{done ? p.note : c.pathway.pending}</em>
            </li>
          )
        })}
      </ul>
      <div className="row">
        <OnceButton toast={c.page.toast} done={ONCE_LABELS[c.page.label]}>{c.page.label}</OnceButton>
        <OnceButton className="soft" toast={c.divert.toast} done={ONCE_LABELS[c.divert.label]}>{c.divert.label}</OnceButton>
      </div>
    </GlassCard>
  )
}
