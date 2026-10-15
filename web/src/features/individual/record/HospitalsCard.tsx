'use client'

import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from 'react-i18next'
import { getHospital } from '@/data/repo'
import { useLiveIncident } from '@/state/LiveIncident'
import type { HospitalReadiness, LabelValue } from '@/data/types'
import { ClickRow } from '../ClickRow'
import { Head } from '../home/parts'
import { TableScroll } from '@/components/ui/TableScroll'

const plain = { fontWeight: 500 } as const

/** Prototype `DR.packet` body: the packet rows plus the FHIR footnote. */
function PacketBody({ rows }: { rows: LabelValue[] }) {
  const { t } = useTranslation(['record', 'common'])
  return (
    <>
      <div className="packet">{rows.map(([k, v]) => <div key={k}><span>{k}</span><b style={plain}>{v}</b></div>)}</div>
      <p className="fine">{t('common:packetNote')}</p>
    </>
  )
}

/** `Hospital readiness` (c6): ranked table and the packet preview button. */
export function HospitalsCard({ hospitals }: { hospitals: HospitalReadiness[] }) {
  const drawer = useDrawer()
  const toast = useToast()
  const { t } = useTranslation(['record', 'common'])
  const head = t('hospitals.head', { returnObjects: true })
  const recommended = t('hospitals.recommended')
  // The packet lives with the hospital data; it is fetched when the button is pressed so the table never waits on it.
  const { live, view } = useLiveIncident()
  const preview = () => {
    // Live mode: show the packet the hospital actually received, when there is one.
    if (live && view?.packet) {
      drawer.open(t('hospitals.packetTitle'), <PacketBody rows={view.packet.rows} />)
      return
    }
    getHospital()
      .then((h) => drawer.open(t('hospitals.packetTitle'), <PacketBody rows={h.packet} />))
      .catch(() => toast(t('common:pageError.toast')))
  }
  return (
    <GlassCard span={6}>
      <Head title={t('hospitals.title')} meta={t('hospitals.meta')} />
      <TableScroll>
        <table style={{ minWidth: 0 }}>
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="hosps">
            {hospitals.map((h) => (
              <ClickRow
                key={h.name}
                title={h.name}
                details={[[head[0], <><b style={plain}>{h.name}</b>{h.recommended && <small style={{ color: 'var(--brand-text)' }}>{recommended}</small>}</>], [head[1], h.capability], [head[2], h.eta], [head[3], <Pill key="l" tone={h.tone}>{h.load}</Pill>]]}
              >
                <td><b style={plain}>{h.name}</b>{h.recommended && <small style={{ color: 'var(--brand-text)' }}>{recommended}</small>}</td>
                <td style={{ fontSize: '12px' }}>{h.capability}</td>
                <td className="n">{h.eta}</td>
                <td><Pill tone={h.tone}>{h.load}</Pill></td>
              </ClickRow>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <button type="button" className="btn soft" onClick={preview}>
        <span className="ic"><Icon name="file" /></span>{t('hospitals.packet')}
      </button>
    </GlassCard>
  )
}
