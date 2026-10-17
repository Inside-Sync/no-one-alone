'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@/app/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import type { LabelValue } from '@/data/types'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import { HospitalKpis } from '../shared'
import { PageError } from '@/features/shared/PageError'
import { useHospital } from '../useHospital'
import { InboxCard, type InboxItem } from './InboxCard'
import { PacketCard } from './PacketCard'

/** Hospital view · Pre-arrivals (`<main data-page="ed">`). */
export function EdPage() {
  const { t } = useTranslation('hospital')
  const res = useHospital()
  const h = res.data
  const { packetNew, emergency } = useAppState()
  const { live, view, incident } = useLiveIncident()
  const router = useRouter()
  // Live mode: the packet hospital-agent returned (contract 4.4); the mock replays the scripted one.
  const livePacket = live ? view?.packet ?? null : null
  // A pick belongs to one inbox: when the demo's packet arrives or leaves, the pane goes back to its default (prototype re-renders it).
  const [pick, setPick] = useState<{ name: string; inbox: boolean } | null>(null)
  if (res.status === 'error') return <PageError page="ed" onRetry={res.retry} />
  if (!h) return null

  const items: InboxItem[] = h.inbox.map((m) => ({ ...m, fresh: false }))
  if (packetNew) {
    const d = h.inboxDemo
    items.unshift({
      name: livePacket?.meta ?? d.name,
      summary: livePacket ? livePacket.summary : emergency.step >= 9 ? d.summaryArriving : d.summary,
      pill: { tone: 'bad', text: t('ed.inbox.newTag') },
      fresh: true,
    })
  }
  const demoRow = livePacket ? { ...h.incomingDemo, ...livePacket.incoming } : h.incomingDemo
  const incoming = packetNew ? [demoRow, ...h.incoming] : h.incoming
  const packet = livePacket?.rows ?? h.packet
  const picked = pick && pick.inbox === packetNew ? items.find((m) => m.name === pick.name) : undefined

  let rows: LabelValue[]
  if (picked) rows = picked.fresh ? packet : [[t('ed.packet.statusLabel'), picked.summary], [t('ed.packet.noteLabel'), h.inboxArchivedNote]]
  else rows = packetNew ? packet : h.examplePacket.rows

  return (
    <main className="grid" data-page="ed">
      {live && incident?.handoff && !incident.recovery && (
        <GlassCard span={12}>
          <div className="row" style={{ borderLeft: '4px solid var(--brand)', paddingLeft: 14, justifyContent: 'space-between' }}>
            <span><b><Glyph name="stethoscope" />{t('ed.discharge.title')}</b><small className="meta" style={{ display: 'block' }}>{t('ed.discharge.sub')}</small></span>
            <button type="button" className="btn" onClick={() => router.push('/hospital/discharge')}>{t('ed.discharge.open')}</button>
          </div>
        </GlassCard>
      )}
      <HospitalKpis id="edKpis" kpis={h.edKpis} />
      <InboxCard items={items} incoming={incoming} showNew={packetNew} onSelect={(m) => setPick({ name: m.name, inbox: packetNew })} />
      <PacketCard
        meta={packetNew ? livePacket?.meta ?? t('ed.packet.demoMeta') : h.examplePacket.patient}
        rows={rows}
        pathway={h.pathway}
        window={packetNew ? h.pathwayWindow.demo : h.pathwayWindow.idle}
        step={packetNew ? (live ? view?.pathwayStep ?? null : emergency.step) : null}
      />
    </main>
  )
}
