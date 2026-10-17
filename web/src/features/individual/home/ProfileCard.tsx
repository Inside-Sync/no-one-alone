'use client'

import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/ui/Avatar'
import { Locked } from '@/components/ui/Locked'
import { OnceButton } from '@/components/ui/OnceButton'
import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import type { Person } from '@/data/types'
import { ConditionDrawerBody } from './drawers'
import { Head } from './parts'
import { textTone } from '@/lib/tone'

/** `About Margaret` (c12): ID, profile grid, tappable conditions (records category) and lifestyle chips. */
export function ProfileCard({ person }: { person: Person }) {
  const { t } = useTranslation('home')
  const drawer = useDrawer()
  const { profile } = person
  return (
    <GlassCard span={12} id="profile">
      <Head icon="user-round" title={t('profile.title')} meta={profile.checkedBy}>
        <OnceButton className="soft sm" toast={profile.shareToast} done={`✓ ${t('profile.share.done')}`}>{t('profile.share.label')}</OnceButton>
      </Head>
      <div className="prof">
        <div className="pf-id">
          <Avatar name={person.name} style={{ '--c': person.color, width: 64, height: 64, fontSize: 20 } as React.CSSProperties}>{person.initials}</Avatar>
          <div><b>{person.name}</b><small>{t('profile.born', { born: person.born, nickname: person.nickname })}</small></div>
        </div>
        <div className="pf-grid">
          {profile.rows.map((r) => <div key={r.label}><small><Glyph name={r.icon} />{r.label}</small><b>{r.value}</b></div>)}
        </div>
      </div>
      <div className="ch" style={{ marginTop: 2 }}>
        <h2 style={{ fontSize: 14 }}><Glyph name="stethoscope" />{t('profile.conditionsTitle')}</h2>
        <span className="meta">{t('profile.conditionsMeta')}</span>
      </div>
      <Locked cat="records" span={12}>
        <div className="conds">
          {person.conditions.map((cond) => (
            <button
              key={cond.title}
              type="button"
              className="cond"
              style={{ '--c': cond.color, '--c-text': textTone(cond.color) } as React.CSSProperties}
              onClick={() => drawer.open(cond.title, <ConditionDrawerBody condition={cond} />)}
            >
              <b><Glyph name={cond.icon} />{cond.title}</b><small>{cond.since}</small><em>{cond.now}</em>
            </button>
          ))}
        </div>
      </Locked>
      <div className="row">
        {profile.chips.map((chip) => (
          <span key={chip.text} className="chip" style={chip.danger ? { color: 'var(--bad-text)' } : undefined}><Glyph name={chip.icon} />{chip.text}</span>
        ))}
      </div>
    </GlassCard>
  )
}
