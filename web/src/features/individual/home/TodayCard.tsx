'use client'

import { useTranslation } from 'react-i18next'
import { Glyph, Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { Locked } from '@/components/ui/Locked'
import type { Person } from '@/data/types'
import { ChatDrawerBody } from './drawers'
import { Head } from './parts'

/** `Margaret today` (c4, check-in category): status, devices, "Today so far" timeline and the two actions. */
export function TodayCard({ person }: { person: Person }) {
  const { t } = useTranslation(['home', 'common'])
  const drawer = useDrawer()
  const onceLabels = t('common:onceLabels', { returnObjects: true }) as Record<string, string | undefined>
  const { today } = person
  return (
    <Locked cat="checkin" span={4}>
    <GlassCard span={4}>
      <Head icon="dot-green" title={t('today.title')} meta={today.updated} />
      <div className="status-big"><b>{today.headline}</b><span>{person.lastChat}</span></div>
      <div className="devs">
        {today.devices.map((d) => <div className="dev" key={d.label}><span>{d.label}</span><b>{d.value}</b></div>)}
      </div>
      <Head title={t('today.soFar')} meta={t('today.soFarMeta')} small />
      <ul className="dayline">
        {person.dayline.map((d) => (
          <li key={d.time + d.text}>
            <span className="t">{d.time}</span>
            <span className={d.flag ? `d ${d.flag}` : 'd'}></span>
            <span>{d.icon && <Glyph name={d.icon} />}{d.text}</span>
          </li>
        ))}
      </ul>
      <div className="row">
        {today.actions.map((a) =>
          a.kind === 'chat' ? (
            <button key={a.label} type="button" className="btn sm" onClick={() => drawer.open(t('today.askAgent'), <ChatDrawerBody />)}>
              {a.icon && <span className="ic"><Icon name={a.icon} /></span>}{a.label}
            </button>
          ) : (
            <OnceButton key={a.label} className="soft sm" toast={a.toast} done={onceLabels[a.label] ?? `✓ ${a.label}`}>{a.label}</OnceButton>
          ),
        )}
      </div>
    </GlassCard>
    </Locked>
  )
}
