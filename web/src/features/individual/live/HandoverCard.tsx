'use client'

import { useTranslation } from 'react-i18next'
import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph, Icon, type IconName } from '@/components/ui/Icon'
import type { IncidentDoc } from '@/data/contract'
import type { AgentView } from '@/domain/agent'
import { clockTime, memberName, type LivePeople, type LiveView } from '@/domain/incident'
import { Kv } from '@/features/shared/drawers'

interface Hand { id: string; at: number; icon: IconName; to: string; what: string; rows: [string, string][] }

const RELATION_ICON: Record<string, IconName> = { neighbour: 'home', neighbor: 'home' }
const first = (s: string) => s.split(' ')[0]

/** `Who got what` (c5): each hand-over Noa made, newest last; tap one for exactly what was shared. */
export function HandoverCard({ incident, view, people, agent }: { incident: IncidentDoc | null; view: LiveView | null; people: LivePeople; agent: AgentView }) {
  const { t } = useTranslation('live')
  const drawer = useDrawer()
  const tz = people.person?.timezone ?? 'Asia/Ho_Chi_Minh'
  const num = people.person?.emergencyNumber ?? '000'
  const hands: Hand[] = []
  if (incident) {
    const ms = (iso?: string) => (iso ? Date.parse(iso) : NaN)
    const alerted = incident.timeline.find((e) => e.kind === 'ALERTED')
    const message = alerted ? alerted.text.slice(alerted.text.indexOf(': ') + 2) : ''
    const icon = (id: string) => RELATION_ICON[people.person?.circle?.find((c) => c.memberId === id)?.relation.toLowerCase() ?? ''] ?? 'user-round'
    for (const c of [...(people.person?.circle ?? [])].sort((a, b) => a.priority - b.priority)) {
      const a = incident.assignments?.find((x) => x.memberId === c.memberId && x.state !== 'QUEUED')
      const call = agent.calls.find((x) => x.id === c.memberId)
      const name = first(memberName(people, c.memberId))
      if (a) {
        const missed = a.state === 'EXPIRED' || a.state === 'DECLINED'
        const what = t(`hand.${c.role === 'NEARBY' ? (missed ? 'nearbyMissed' : 'nearby') : missed ? 'distantMissed' : 'distant'}`)
        hands.push({
          id: c.memberId, at: ms(a.notifiedAt) || ms(alerted?.at), icon: icon(c.memberId), to: call ? `${name} (${call.sub.split(' · ').slice(1).join(' · ')})` : name, what,
          rows: [[t('hand.how'), call?.status ?? ''], [t('hand.told'), a.message ?? message], ...(a.etaMin !== undefined ? [[t('hand.eta'), t('units.min', { n: a.etaMin })] as [string, string]] : [])],
        })
      } else if (alerted && c.criticalAlerts) {
        hands.push({ id: c.memberId, at: ms(alerted.at), icon: icon(c.memberId), to: name, what: t('hand.safety'), rows: [[t('hand.how'), t('hand.push')], [t('hand.message'), message]] })
      }
    }
    const called = incident.timeline.find((e) => e.kind === 'CALLED_115')
    if (called) {
      hands.push({ id: 'ooo', at: ms(called.at), icon: 'ambulance', to: t('hand.ambulance', { num }), what: t('hand.fullCall'),
        rows: [[t('hand.how'), called.text], ...(incident.callScript ? [[t('hand.script'), incident.callScript] as [string, string]] : [])] })
    }
    const sent = incident.timeline.find((e) => e.kind === 'HANDOFF_SENT')
    if (sent && incident.handoff) {
      hands.push({ id: 'hosp', at: ms(incident.handoff.sentAt) || ms(sent.at), icon: 'hospital', to: incident.handoff.hospitalName.replace(/\s*\(demo\)$/, ''),
        what: t('hand.packet'), rows: view?.packet ? view.packet.rows.map(([k, v]) => [k, String(v)]) : [[t('hand.status'), incident.handoff.status]] })
    }
    hands.sort((a, b) => a.at - b.at)
  }
  return (
    <GlassCard span={5} id="handCard">
      <div className="ch"><h2><Glyph name="package" />{t('hand.title')}</h2><span className="meta">{t('hand.meta')}</span></div>
      <ul className="list hlist">
        {hands.length ? hands.map((h) => (
          <li key={h.id} className="clk" tabIndex={0} role="button"
            onClick={() => drawer.open(h.to, <><p className="fine">{h.what} · {clockTime(h.at, tz)}</p><Kv rows={h.rows} /><p className="fine">{t('hand.fine', { name: first(people.person?.displayName ?? '') })}</p></>)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click() } }}>
            <span className="h-ic"><span className="ic"><Icon name={h.icon} tint /></span></span>
            <span><b>{h.to}</b><small>{h.what}</small></span>
            <span className="h-tm">{clockTime(h.at, tz)}</span>
            <span className="h-chev" aria-hidden="true">›</span>
          </li>
        )) : (
          <li><span className="li"><span className="ic"><Icon name="lock" tint /></span></span><span><b>{t('hand.none')}</b><small>{t('hand.noneSub')}</small></span></li>
        )}
      </ul>
    </GlassCard>
  )
}
