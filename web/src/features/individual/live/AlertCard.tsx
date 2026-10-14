'use client'

import type { CSSProperties } from 'react'
import { Orbit } from '@/components/canvas/Orbit'
import { useDrawer } from '@/components/ui/Drawer'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { LIVE_COPY } from '@/data/repo'
import type { OrbitScene } from '@/data/types'
import { orbitTargets, resolveStepView, STEPS } from '@/domain/emergency'
import { SosDrawerBody } from './SosDrawerBody'

const gap16: CSSProperties = { display: 'grid', gap: 16, alignContent: 'start' }
const orbitStyle: CSSProperties = { height: 360 }
const endStyle: CSSProperties = { marginLeft: 'auto' }
const ownerAv = { '--c': '#2f6fb0' } as CSSProperties
const medium: CSSProperties = { fontWeight: 500 }
const right: CSSProperties = { textAlign: 'right' }

/** Left column (c5): level tag, orbit, minutes, owner of the case and the call buttons. */
export function AlertCard({ step, scene, onEnd }: { step: number; scene: OrbitScene; onEnd: () => void }) {
  const toast = useToast()
  const drawer = useDrawer()
  const c = LIVE_COPY
  const s = STEPS[step]
  const v = resolveStepView(STEPS, step)
  const { mode, ...targets } = orbitTargets(step)
  return (
    <div className="c5" style={gap16}>
      <article className="glass card">
        <div className="ch">
          <span className="em-tag"><i></i><span id="emTag">{s.lv}</span></span>
          <button type="button" className="chip" id="endDemo" style={endStyle} onClick={onEnd}>{c.endDemo}</button>
        </div>
        <Orbit scene={scene} ariaLabel={c.orbitLabel} mode={mode} state={targets} labels night tilt={0.62} zoom={1.05} style={orbitStyle} />
        <div className="em-stat">
          <b className="v" id="emMin">{s.m}′</b>
          <span><span className="k">{c.since}</span><br /><span className="l" id="emLvl">{s.lv}</span></span>
          <span style={{ flex: 1 }}></span>
          <span style={right}><b id="emWhat" style={medium}>{v.what}</b><br /><small className="muted" id="emSub">{v.sub}</small></span>
        </div>
        <div className="owner">
          <span className="av" style={ownerAv}>D</span>
          <span><b id="ownT">{v.own[0]}</b><small id="ownS">{v.own[1]}</small></span>
          <span className="eta" id="ownE">{v.own[2]}</span>
        </div>
        <div className="actions">
          <button type="button" className="act primary" onClick={() => drawer.open(c.sos.title, <SosDrawerBody />)}>
            <span className="ic"><Icon name="phone" /></span>{c.actions.call000}
          </button>
          <button type="button" className="act" onClick={() => toast(c.actions.callMum.toast)}>
            <span className="ic"><Icon name="mic" /></span>{c.actions.callMum.label}
          </button>
          <button type="button" className="act" onClick={() => toast(c.actions.callDavid.toast)}>
            <span className="ic"><Icon name="people" /></span>{c.actions.callDavid.label}
          </button>
        </div>
      </article>
    </div>
  )
}
