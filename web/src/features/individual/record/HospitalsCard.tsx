'use client'

import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import { getHospital, PACKET_NOTE, PAGE_ERROR, RECORD_COPY } from '@/data/repo'
import type { HospitalReadiness, LabelValue } from '@/data/types'
import { ClickRow } from '../ClickRow'
import { Head } from '../home/parts'
import { TableScroll } from '@/components/ui/TableScroll'

const plain = { fontWeight: 500 } as const

/** Prototype `DR.packet` body: the packet rows plus the FHIR footnote. */
function PacketBody({ rows }: { rows: LabelValue[] }) {
  return (
    <>
      <div className="packet">{rows.map(([k, v]) => <div key={k}><span>{k}</span><b style={plain}>{v}</b></div>)}</div>
      <p className="fine">{PACKET_NOTE}</p>
    </>
  )
}

/** `Hospital readiness` (c6): ranked table and the packet preview button. */
export function HospitalsCard({ hospitals }: { hospitals: HospitalReadiness[] }) {
  const drawer = useDrawer()
  const toast = useToast()
  const c = RECORD_COPY.hospitals
  // The packet lives with the hospital data; it is fetched when the button is pressed so the table never waits on it.
  const preview = () => {
    getHospital()
      .then((h) => drawer.open(c.packetTitle, <PacketBody rows={h.packet} />))
      .catch(() => toast(PAGE_ERROR.toast))
  }
  return (
    <GlassCard span={6}>
      <Head title={c.title} meta={c.meta} />
      <TableScroll>
        <table style={{ minWidth: 0 }}>
          <thead><tr>{c.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="hosps">
            {hospitals.map((h) => (
              <ClickRow
                key={h.name}
                title={h.name}
                details={[[c.head[0], <><b style={plain}>{h.name}</b>{h.recommended && <small style={{ color: 'var(--brand-text)' }}>{c.recommended}</small>}</>], [c.head[1], h.capability], [c.head[2], h.eta], [c.head[3], <Pill key="l" tone={h.tone}>{h.load}</Pill>]]}
              >
                <td><b style={plain}>{h.name}</b>{h.recommended && <small style={{ color: 'var(--brand-text)' }}>{c.recommended}</small>}</td>
                <td style={{ fontSize: '12px' }}>{h.capability}</td>
                <td className="n">{h.eta}</td>
                <td><Pill tone={h.tone}>{h.load}</Pill></td>
              </ClickRow>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <button type="button" className="btn soft" onClick={preview}>
        <span className="ic"><Icon name="file" /></span>{c.packet}
      </button>
    </GlassCard>
  )
}
