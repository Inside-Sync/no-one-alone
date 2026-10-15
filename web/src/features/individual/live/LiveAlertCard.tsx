'use client'

import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Orbit } from '@/components/canvas/Orbit'
import { useDrawer } from '@/components/ui/Drawer'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { apiErrorCode } from '@/data/repo'
import type { AssignmentAction, IncidentDoc, ServerAction } from '@/data/contract'
import type { OrbitScene } from '@/data/types'
import { isServerAction, memberButtons, memberName, type LivePeople, type LiveView } from '@/domain/incident'
import { LiveScriptBody } from './LiveScriptBody'

const gap16: CSSProperties = { display: 'grid', gap: 16, alignContent: 'start' }
const orbitStyle: CSSProperties = { height: 360 }
const endStyle: CSSProperties = { marginLeft: 'auto', display: 'flex', gap: 8 }
const ownerAv = { '--c': '#2f6fb0' } as CSSProperties
const medium: CSSProperties = { fontWeight: 500 }
const right: CSSProperties = { textAlign: 'right' }
const chips: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 }

interface Props {
  view: LiveView
  incident: IncidentDoc
  people: LivePeople
  scene: OrbitScene | null
  /** The family viewer from the context bar: their buttons are shown first. */
  viewer: string
  act: (memberId: string, action: ServerAction) => Promise<void>
  onReset: () => void
}

/** Left column (c5) for a live incident: level, orbit, minutes, owner, the 000 script and one member's buttons. */
export function LiveAlertCard({ view, incident, people, scene, viewer, act, onReset }: Props) {
  const toast = useToast()
  const drawer = useDrawer()
  const { t } = useTranslation('live')
  const [pending, setPending] = useState(false)

  // Whose buttons: the viewer if alerted, otherwise the first alerted member; any alerted member can be picked.
  const alerted = (incident.assignments ?? []).filter((a) => a.state !== 'QUEUED').map((a) => a.memberId)
  const [picked, setPicked] = useState<string | null>(null)
  const actor = picked && alerted.includes(picked) ? picked : alerted.includes(viewer) ? viewer : alerted[0] ?? null
  const buttons = actor ? memberButtons(incident, people, actor) : null
  const personFirst = view.personName.split(' ')[0]
  const nearbyName = (incident.assignments ?? []).find((a) => a.role === 'NEARBY' && a.state !== 'QUEUED')?.memberId

  const label = (a: AssignmentAction) => {
    if (a === 'CALLED_115') return t('live.action.CALLED_115', { num: view.emergencyNumber })
    if (a === 'CALL_PERSON') return t('live.action.CALL_PERSON', { name: personFirst })
    return t(`live.action.${a}`)
  }

  const press = (a: AssignmentAction) => {
    if (!buttons) return
    if (!isServerAction(a)) {
      toast(t('live.calling', { who: a === 'CALL_PERSON' ? personFirst : nearbyName ? memberName(people, nearbyName) : t('live.action.CALL_NEARBY') }))
      return
    }
    setPending(true)
    act(buttons.memberId, a).then(
      () => toast(t(`live.actionDone.${a}`)),
      // ALREADY_OWNED: the server's message says who owns the case; show it as is.
      (e: unknown) => toast(apiErrorCode(e) === 'ALREADY_OWNED' && e instanceof Error ? e.message : t('live.failed')),
    ).finally(() => setPending(false))
  }

  const close = () => {
    setPending(true)
    act('console', 'CLOSE').then(() => toast(t('live.closed')), () => toast(t('live.failed'))).finally(() => setPending(false))
  }

  return (
    <div className="c5" style={gap16}>
      <article className="glass card">
        <div className="ch">
          <span className="em-tag"><i></i><span id="emTag">{view.levelLabel}</span></span>
          <span style={endStyle}>
            {view.open && <button type="button" className="chip" disabled={pending} onClick={close}>{t('live.close')}</button>}
            <button type="button" className="chip" id="endDemo" onClick={onReset}>{t('live.reset')}</button>
          </span>
        </div>
        {scene ? (
          <Orbit scene={scene} ariaLabel={t('orbitLabel')} mode={view.orbit.mode} state={view.orbit} labels night tilt={0.62} zoom={1.05} style={orbitStyle} />
        ) : (
          <div className="c3d" style={orbitStyle}></div>
        )}
        <div className="em-stat">
          <b className="v" id="emMin">{view.minutes}′</b>
          <span><span className="k">{t('since')}</span><br /><span className="l" id="emLvl">{view.levelLabel}</span></span>
          <span style={{ flex: 1 }}></span>
          <span style={right}><b id="emWhat" style={medium}>{view.what}</b><br /><small className="muted" id="emSub">{view.sub}</small></span>
        </div>
        <div className="owner">
          <span className="av" style={ownerAv}>{view.owner.initials}</span>
          <span><b id="ownT">{view.owner.title}</b><small id="ownS">{view.owner.subtitle}</small></span>
          <span className="eta" id="ownE">{view.owner.eta}</span>
        </div>
        <div className="actions">
          <button type="button" className="act primary" onClick={() => drawer.open(t('live.scriptTitle', { num: view.emergencyNumber }), <LiveScriptBody view={view} />)}>
            <span className="ic"><Icon name="phone" /></span>{t('script.call', { num: view.emergencyNumber })}
          </button>
        </div>
      </article>
      {alerted.length > 0 && view.open && (
        <article className="glass card">
          <div className="ch"><h2>{t('live.actionsTitle', { name: actor ? memberName(people, actor) : '' })}</h2></div>
          <div style={chips} role="group" aria-label={t('actAs')}>
            {alerted.map((id) => (
              <button key={id} type="button" className={`chip${id === actor ? ' on' : ''}`} aria-pressed={id === actor} onClick={() => setPicked(id)}>
                {memberName(people, id)}
              </button>
            ))}
          </div>
          {buttons?.assignment.message && <p className="fine">{buttons.assignment.message}</p>}
          {buttons && buttons.actions.length > 0 ? (
            <div className="actions">
              {buttons.actions.map((a) => (
                <button key={a} type="button" className={`act${a === 'ACCEPT' || a === 'ARRIVED' ? ' primary' : ''}`} disabled={pending} onClick={() => press(a)}>
                  {label(a)}
                </button>
              ))}
            </div>
          ) : (
            <p className="fine">{t('live.noActions', { name: actor ? memberName(people, actor) : '' })}</p>
          )}
        </article>
      )}
    </div>
  )
}
