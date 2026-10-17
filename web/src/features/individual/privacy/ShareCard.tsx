'use client'

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/ui/Avatar'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { CATEGORIES } from '@/domain/consent'
import { useAppState, type SharePreset } from '@/state/AppState'
import { PauseButton } from './PauseButton'
import { TableScroll } from '@/components/ui/TableScroll'

/** `Who sees what` (c12): quick choices and the people x categories switch grid. */
export function ShareCard() {
  const { people, share, toggleShare, applyPreset } = useAppState()
  const toast = useToast()
  const { t } = useTranslation('privacy')
  return (
    <GlassCard span={12}>
      <div className="ch"><h2><Glyph name="lock" />{t('title')}</h2><span className="meta">{t('meta')}</span></div>
      <div className="row presets">
        <span className="muted" style={{ fontSize: '12.5px' }}>{t('quick')}</span>
        {t('presets', { returnObjects: true }).map((p) => (
          <button key={p.kind} type="button" className="btn sm soft" onClick={() => toast(applyPreset(p.kind as SharePreset, toast))}>{p.label}</button>
        ))}
        <PauseButton className="sm" />
      </div>
      <TableScroll>
        <table className="share">
          <thead>
            <tr>
              <th>{t('what')}</th>
              {people.map((p) => (
                <th key={p.id} style={{ textAlign: 'center' }}>
                  <Avatar name={p.name} className="av sm" style={{ '--c': p.color, margin: '0 auto' } as CSSProperties}>{p.initials}</Avatar>
                  <div style={{ textTransform: 'none', letterSpacing: 0, fontSize: '11.5px', marginTop: 4, color: 'var(--ink)' }}>{p.name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => (
              <tr key={cat.id}>
                <td><b style={{ fontWeight: 600 }}><Glyph name={cat.icon} />{t(`categories.${cat.id}.name`)}</b><small>{t(`categories.${cat.id}.detail`)}</small></td>
                {people.map((p) => {
                  const lock = cat.id === 'safety' && p.emergency
                  return (
                    <td key={p.id} style={{ textAlign: 'center' }}>
                      <Switch
                        checked={share?.[p.id]?.[cat.id] === true}
                        label={t('switchLabel', { category: t(`categories.${cat.id}.name`), name: p.name })}
                        disabled={lock}
                        title={lock ? t('lockedTitle') : undefined}
                        onChange={() => { const m = toggleShare(p.id, cat.id, toast); if (m) toast(m) }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <p className="fine"><Glyph name="siren" />{t('fine')}</p>
    </GlassCard>
  )
}
