'use client'

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Orbit } from '@/components/canvas/Orbit'
import { useDrawer } from '@/components/ui/Drawer'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import type { OrbitScene } from '@/data/types'
import { emSteps, orbitTargets, resolveStepView } from '@/domain/emergency'
import { SosDrawerBody } from './SosDrawerBody'

const gap16: CSSProperties = { display: 'grid', gap: 16, alignContent: 'start' }
const orbitStyle: CSSProperties = { height: 360 }
const endStyle: CSSProperties = { marginLeft: 'auto' }
const ownerAv = { '--c': '#2f6fb0' } as CSSProperties
const medium: CSSProperties = { fontWeight: 500 }
const right: CSSProperties = { textAlign: 'right' }

/** Left column (c5): level tag, orbit, minutes, owner of the case and the call buttons. */
export function AlertCard({ step, scene, onEnd }: { step: number; scene: OrbitScene | null; onEnd: () => void }) {
  const toast = useToast()
  const drawer = useDrawer()
  const { t } = useTranslation('live')
  const steps = emSteps()
  const s = steps[step]
  const v = resolveStepView(steps, step)
  const { mode, ...targets } = orbitTargets(step)
  return (
    <div className="c5" style={gap16}>
      <article className="glass card">
        <div className="ch">
          <span className="em-tag"><i></i><span id="emTag">{s.lv}</span></span>
          <button type="button" className="chip" id="endDemo" style={endStyle} onClick={onEnd}>{t('endDemo')}</button>
        </div>
        {scene ? (
          <Orbit scene={scene} ariaLabel={t('orbitLabel')} mode={mode} state={targets} labels night tilt={0.62} zoom={1.05} style={orbitStyle} />
        ) : (
          <div className="c3d" style={orbitStyle}></div>
        )}
        <div className="em-stat">
          <b className="v" id="emMin">{s.m}′</b>
          <span><span className="k">{t('since')}</span><br /><span className="l" id="emLvl">{s.lv}</span></span>
          <span style={{ flex: 1 }}></span>
          <span style={right}><b id="emWhat" style={medium}>{v.what}</b><br /><small className="muted" id="emSub">{v.sub}</small></span>
        </div>
        <div className="owner">
          <span className="av" style={ownerAv}>D</span>
          <span><b id="ownT">{v.own[0]}</b><small id="ownS">{v.own[1]}</small></span>
          <span className="eta" id="ownE">{v.own[2]}</span>
        </div>
        <div className="actions">
          <button type="button" className="act primary" onClick={() => drawer.open(t('sos.title'), <SosDrawerBody />)}>
            <span className="ic"><Icon name="phone" /></span>{t('actions.call000')}
          </button>
          <button type="button" className="act" onClick={() => toast(t('actions.callMum.toast'))}>
            <span className="ic"><Icon name="mic" /></span>{t('actions.callMum.label')}
          </button>
          <button type="button" className="act" onClick={() => toast(t('actions.callDavid.toast'))}>
            <span className="ic"><Icon name="people" /></span>{t('actions.callDavid.label')}
          </button>
        </div>
      </article>
    </div>
  )
}
