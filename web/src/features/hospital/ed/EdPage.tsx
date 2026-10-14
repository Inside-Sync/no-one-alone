'use client'

import { useState } from 'react'
import { HOSPITAL_COPY } from '@/data/repo'
import type { LabelValue } from '@/data/types'
import { useAppState } from '@/state/AppState'
import { HospitalKpis } from '../shared'
import { PageError } from '@/features/shared/PageError'
import { useHospital } from '../useHospital'
import { InboxCard, type InboxItem } from './InboxCard'
import { PacketCard } from './PacketCard'

/** Hospital view · Pre-arrivals (`<main data-page="ed">`). */
export function EdPage() {
  const res = useHospital()
  const h = res.data
  const { packetNew, emergency } = useAppState()
  // A pick belongs to one inbox: when the demo's packet arrives or leaves, the pane goes back to its default (prototype re-renders it).
  const [pick, setPick] = useState<{ name: string; inbox: boolean } | null>(null)
  if (res.status === 'error') return <PageError page="ed" onRetry={res.retry} />
  if (!h) return null

  const items: InboxItem[] = h.inbox.map((m) => ({ ...m, fresh: false }))
  if (packetNew) {
    const d = h.inboxDemo
    items.unshift({
      name: d.name,
      summary: emergency.step >= 9 ? d.summaryArriving : d.summary,
      pill: { tone: 'bad', text: HOSPITAL_COPY.ed.inbox.newTag },
      fresh: true,
    })
  }
  const incoming = packetNew ? [h.incomingDemo, ...h.incoming] : h.incoming
  const picked = pick && pick.inbox === packetNew ? items.find((m) => m.name === pick.name) : undefined

  let rows: LabelValue[]
  if (picked) rows = picked.fresh ? h.packet : [['Status', picked.summary], ['Note', h.inboxArchivedNote]]
  else rows = packetNew ? h.packet : h.examplePacket.rows

  return (
    <main className="grid" data-page="ed">
      <HospitalKpis id="edKpis" kpis={h.edKpis} />
      <InboxCard items={items} incoming={incoming} showNew={packetNew} onSelect={(m) => setPick({ name: m.name, inbox: packetNew })} />
      <PacketCard
        meta={packetNew ? HOSPITAL_COPY.ed.packet.demoMeta : h.examplePacket.patient}
        rows={rows}
        pathway={h.pathway}
        window={packetNew ? h.pathwayWindow.demo : h.pathwayWindow.idle}
        step={packetNew ? emergency.step : null}
      />
    </main>
  )
}
