'use client'

import type { CSSProperties } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { PRIVACY_COPY } from '@/data/repo'
import { CATEGORIES } from '@/domain/consent'
import { useAppState } from '@/state/AppState'
import { PauseButton } from './PauseButton'
import { TableScroll } from '@/components/ui/TableScroll'

/** `🔐 Who sees what` (c12): quick choices and the people x categories switch grid. */
export function ShareCard() {
  const { people, share, toggleShare, applyPreset } = useAppState()
  const toast = useToast()
  const c = PRIVACY_COPY
  return (
    <GlassCard span={12}>
      <div className="ch"><h2>{c.title}</h2><span className="meta">{c.meta}</span></div>
      <div className="row presets">
        <span className="muted" style={{ fontSize: '12.5px' }}>{c.quick}</span>
        {c.presets.map((p) => (
          <button key={p.kind} type="button" className="btn sm soft" onClick={() => toast(applyPreset(p.kind, toast))}>{p.label}</button>
        ))}
        <PauseButton className="sm" />
      </div>
      <TableScroll>
        <table className="share">
          <thead>
            <tr>
              <th>{c.what}</th>
              {people.map((p) => (
                <th key={p.id} style={{ textAlign: 'center' }}>
                  <span className="av sm" style={{ '--c': p.color, margin: '0 auto' } as CSSProperties}>{p.initials}</span>
                  <div style={{ textTransform: 'none', letterSpacing: 0, fontSize: '11.5px', marginTop: 4, color: 'var(--ink)' }}>{p.name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => (
              <tr key={cat.id}>
                <td><b style={{ fontWeight: 600 }}>{cat.emoji} {cat.name}</b><small>{cat.detail}</small></td>
                {people.map((p) => {
                  const lock = cat.id === 'safety' && p.emergency
                  return (
                    <td key={p.id} style={{ textAlign: 'center' }}>
                      <Switch
                        checked={share?.[p.id]?.[cat.id] === true}
                        label={`Share ${cat.name} with ${p.name}`}
                        disabled={lock}
                        title={lock ? c.lockedTitle : undefined}
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
      <p className="fine">{c.fine}</p>
    </GlassCard>
  )
}
