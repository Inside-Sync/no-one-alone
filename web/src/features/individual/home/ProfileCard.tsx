'use client'

import { Locked } from '@/components/ui/Locked'
import { OnceButton } from '@/components/ui/OnceButton'
import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { HOME_COPY } from '@/data/repo'
import type { Person } from '@/data/types'
import { ConditionDrawerBody } from './drawers'
import { Head } from './parts'

/** `👤 About Margaret` (c12): ID, profile grid, tappable conditions (records category) and lifestyle chips. */
export function ProfileCard({ person }: { person: Person }) {
  const drawer = useDrawer()
  const c = HOME_COPY.profile
  const { profile } = person
  return (
    <GlassCard span={12} id="profile">
      <Head title={c.title} meta={profile.checkedBy}>
        <OnceButton className="soft sm" toast={profile.shareToast} done={`✓ ${c.share.done}`}>{c.share.label}</OnceButton>
      </Head>
      <div className="prof">
        <div className="pf-id">
          <span className="av" style={{ '--c': person.color, width: 64, height: 64, fontSize: 20 } as React.CSSProperties}>{person.initials}</span>
          <div><b>{person.name}</b><small>{`Born ${person.born} · prefers "${person.nickname}"`}</small></div>
        </div>
        <div className="pf-grid">
          {profile.rows.map((r) => <div key={r.label}><small>{`${r.emoji} ${r.label}`}</small><b>{r.value}</b></div>)}
        </div>
      </div>
      <div className="ch" style={{ marginTop: 2 }}>
        <h2 style={{ fontSize: 14 }}>{c.conditionsTitle}</h2>
        <span className="meta">{c.conditionsMeta}</span>
      </div>
      <Locked cat="records" span={12}>
        <div className="conds">
          {person.conditions.map((cond) => (
            <button
              key={cond.title}
              type="button"
              className="cond"
              style={{ '--c': cond.color } as React.CSSProperties}
              onClick={() => drawer.open(`${cond.emoji} ${cond.title}`, <ConditionDrawerBody condition={cond} />)}
            >
              <b>{`${cond.emoji} ${cond.title}`}</b><small>{cond.since}</small><em>{cond.now}</em>
            </button>
          ))}
        </div>
      </Locked>
      <div className="row">
        {profile.chips.map((chip) => (
          <span key={chip.text} className="chip" style={chip.danger ? { color: 'var(--bad)' } : undefined}>{chip.text}</span>
        ))}
      </div>
    </GlassCard>
  )
}
