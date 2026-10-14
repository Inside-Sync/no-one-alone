'use client'

import { Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { HOME_COPY, ONCE_LABELS } from '@/data/repo'
import type { Person } from '@/data/types'
import { ChatDrawerBody } from './drawers'
import { Head } from './parts'

/** `🟢 Margaret today` (c4): status, devices, "Today so far" timeline and the two actions. */
export function TodayCard({ person }: { person: Person }) {
  const drawer = useDrawer()
  const { today } = person
  const c = HOME_COPY.today
  return (
    <GlassCard span={4}>
      <Head title={c.title} meta={today.updated} />
      <div className="status-big"><b>{today.headline}</b><span>{person.lastChat}</span></div>
      <div className="devs">
        {today.devices.map((d) => <div className="dev" key={d.label}><span>{d.label}</span><b>{d.value}</b></div>)}
      </div>
      <Head title={c.soFar} meta={c.soFarMeta} small />
      <ul className="dayline">
        {person.dayline.map((d) => (
          <li key={d.time + d.text}>
            <span className="t">{d.time}</span>
            <span className={d.flag ? `d ${d.flag}` : 'd'}></span>
            <span>{d.text}</span>
          </li>
        ))}
      </ul>
      <div className="row">
        {today.actions.map((a) =>
          a.kind === 'chat' ? (
            <button key={a.label} type="button" className="btn sm" onClick={() => drawer.open('Ask the agent', <ChatDrawerBody />)}>
              {a.icon && <span className="ic"><Icon name={a.icon} /></span>}{a.label}
            </button>
          ) : (
            <OnceButton key={a.label} className="soft sm" toast={a.toast} done={ONCE_LABELS[a.label] ?? `✓ ${a.label}`}>{a.label}</OnceButton>
          ),
        )}
      </div>
    </GlassCard>
  )
}
