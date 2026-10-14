'use client'

import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { AROUND_COPY, DRAWER_ACTIONS } from '@/data/repo'
import type { Surroundings, WatchAlert } from '@/data/types'
import { Actions, keyActivate } from '../home/parts'
import { textTone } from '@/lib/tone'

function AlertDrawerBody({ a }: { a: WatchAlert }) {
  return (
    <>
      <p style={{ fontSize: 14, lineHeight: 1.55 }}>{a.text}</p>
      <p className="fine">{a.source}</p>
      <Actions list={DRAWER_ACTIONS.alert} />
    </>
  )
}

/** `👀 Worth knowing, living alone` (c6): alerts sorted by urgency, each opening a detail drawer. */
export function AlertsCard({ heading, alerts }: { heading: Surroundings['alertsHeading']; alerts: WatchAlert[] }) {
  const drawer = useDrawer()
  return (
    <GlassCard span={6}>
      <div className="ch">
        <h2>{heading.title}</h2>
        <span className="meta">{heading.meta}</span>
      </div>
      <ul className="alerts" role="none">
        {alerts.map((a) => {
          const v = AROUND_COPY.severity[a.severity]
          const open = () => drawer.open(a.title, <AlertDrawerBody a={a} />)
          return (
            <li key={a.title} role="button" tabIndex={0} onClick={open} onKeyDown={keyActivate(open)}>
              <span className="sev" style={{ background: v.color }}></span>
              <span className="li" style={{ color: v.color }}><span className="ic"><Icon name={a.icon} /></span></span>
              <span><b>{a.title}</b><small>{a.text}</small><em>{a.source}</em></span>
              <span className="pill" style={{ color: textTone(v.color) }}>{v.label}</span>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}
