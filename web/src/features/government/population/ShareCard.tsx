import { GlassCard } from '@/components/ui/GlassCard'
import type { ShareRow } from '@/data/government.types'
import { Head } from '../../individual/home/parts'

/** Bar colour of a share in care in time: red below 70%, amber below 80%, teal from there. */
const RED_BELOW = 70, AMBER_BELOW = 80

const shareColour = (percent: number) => (percent < RED_BELOW ? '#d9443f' : percent < AMBER_BELOW ? '#c88a05' : '#1fb39c')

interface Props {
  title: string
  meta: string
  rows: ShareRow[]
  note: string
  id: string
}

/** `In care in time, by language` / `by contact` (c4): one bar per group, coloured by how far it is from the target. */
export function ShareCard({ title, meta, rows, note, id }: Props) {
  return (
    <GlassCard span={4}>
      <Head title={title} meta={meta} />
      <div className="hbars" id={id}>
        {rows.map((r) => (
          <div key={r.name}>
            <span>{r.name}</span>
            <span className="tr"><i style={{ width: `${r.percent}%`, background: shareColour(r.percent) }}></i></span>
            <b>{r.percent}%</b>
          </div>
        ))}
      </div>
      <p className="fine">{note}</p>
    </GlassCard>
  )
}
