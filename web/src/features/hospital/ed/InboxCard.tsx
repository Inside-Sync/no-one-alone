import type { CSSProperties } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { HOSPITAL_COPY } from '@/data/repo'
import type { IncomingRow, InboxMessage } from '@/data/types'
import { HospitalRow } from '../shared'

const plain = { fontWeight: 500 } as const

export interface InboxItem extends InboxMessage {
  /** True for Margaret's packet, which arrives during the demo. */
  fresh: boolean
}

interface Props {
  items: InboxItem[]
  incoming: IncomingRow[]
  /** Shows the "1 new" pill. */
  showNew: boolean
  onSelect: (item: InboxItem) => void
}

/** `Pre-arrival inbox` (c7): message list plus the `Incoming ambulances` table. */
export function InboxCard({ items, incoming, showNew, onSelect }: Props) {
  const c = HOSPITAL_COPY.ed
  return (
    <GlassCard span={7}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="siren" /></span></span>
        <h2>{c.inbox.title}</h2>
        <span className="meta">{c.inbox.meta}</span>
        {showNew && <Pill tone="bad">{c.inbox.newPill}</Pill>}
      </div>
      <div className="inbox" id="inbox">
        {items.map((m) => (
          <button key={m.name} type="button" className={`msg${m.fresh ? ' new' : ''}`} onClick={() => onSelect(m)}>
            <span className="av" style={{ '--c': m.fresh ? '#ef4e4a' : '#7f9a99' } as CSSProperties}>{m.name[0]}</span>
            <span><b>{m.name}</b><small>{m.summary}</small></span>
            <Pill tone={m.pill.tone}>{m.pill.text}</Pill>
          </button>
        ))}
      </div>
      <div className="ch" style={{ marginTop: 6 }}>
        <h2 style={{ fontSize: 14 }}>{c.incoming.title}</h2>
        <span className="meta">{c.incoming.meta}</span>
      </div>
      <div className="tw">
        <table>
          <thead><tr>{c.incoming.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="incoming">
            {incoming.map((r) => {
              const mark = r.packet ? '✓' : '—'
              const markStyle = { color: r.packet ? 'var(--good)' : 'var(--muted)' }
              return (
                <HospitalRow
                  key={r.eta + r.patient}
                  title={r.eta}
                  details={[
                    [c.incoming.head[0], r.eta],
                    [c.incoming.head[1], <b key="p" style={plain}>{r.patient}</b>],
                    [c.incoming.head[2], r.presenting],
                    [c.incoming.head[3], <Pill key="t" tone={r.triageTone}>{r.triage}</Pill>],
                    [c.incoming.head[4], <span key="k" style={markStyle}>{mark}</span>],
                    [c.incoming.head[5], r.bed],
                  ]}
                >
                  <td className="n">{r.eta}</td>
                  <td><b style={plain}>{r.patient}</b></td>
                  <td>{r.presenting}</td>
                  <td><Pill tone={r.triageTone}>{r.triage}</Pill></td>
                  <td className="n" style={markStyle}>{mark}</td>
                  <td>{r.bed}</td>
                </HospitalRow>
              )
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
