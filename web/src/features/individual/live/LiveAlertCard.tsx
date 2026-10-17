'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Orbit } from '@/components/canvas/Orbit'
import { Avatar } from '@/components/ui/Avatar'
import { useDrawer } from '@/components/ui/Drawer'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { apiErrorCode } from '@/data/repo'
import type { AssignmentAction, IncidentDoc, ServerAction } from '@/data/contract'
import type { OrbitScene } from '@/data/types'
import { circleAtRest, circleTone } from '@/domain/agent'
import { isServerAction, memberButtons, memberName, orbitWithHospital, type LivePeople, type LiveView } from '@/domain/incident'
import { LiveScriptBody } from './LiveScriptBody'

const gap16: CSSProperties = { display: 'grid', gap: 16, alignContent: 'start' }
const orbitStyle: CSSProperties = { height: 270 }
const IDLE_ORBIT = { mode: 'check', app: 0, call: 0, hosp: 0, arrived: 0 } as const
const endStyle: CSSProperties = { marginLeft: 'auto', display: 'flex', gap: 8 }
const avSm = { '--c': '#2f6fb0', width: 22, height: 22, fontSize: 10, marginRight: 6 } as CSSProperties
const initialsOf = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
const chips: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 }

interface Props {
  /** Null before any alert: the circle at rest. */
  view: LiveView | null
  incident: IncidentDoc | null
  people: LivePeople
  scene: OrbitScene | null
  /** The family viewer from the context bar: their buttons are shown first. */
  viewer: string
  act: (memberId: string, action: ServerAction) => Promise<void>
  /**
   * Nobody answers for the circle (an incident this tab did not start from the Simulator): show the members' own
   * buttons and Close. When the Simulator's autopilot answers, the card is the prototype's, without them.
   */
  manual?: boolean
}

/** `Margaret's circle` (c4): level, orbit, minutes, owner, the 000 script and one alerted member's buttons. */
export function LiveAlertCard({ view, incident, people, scene, viewer, act, manual = true }: Props) {
  const toast = useToast()
  const drawer = useDrawer()
  const { t } = useTranslation('live')
  const [pending, setPending] = useState(false)

  // Whose buttons: the viewer if alerted, otherwise the first alerted member; any alerted member can be picked.
  const alerted = (incident?.assignments ?? []).filter((a) => a.state !== 'QUEUED').map((a) => a.memberId)
  const [picked, setPicked] = useState<string | null>(null)
  const actor = picked && alerted.includes(picked) ? picked : alerted.includes(viewer) ? viewer : alerted[0] ?? null
  const buttons = actor && incident ? memberButtons(incident, people, actor) : null
  const personFirst = (view?.personName ?? people.person?.displayName ?? '').split(' ')[0]
  const num = view?.emergencyNumber ?? people.person?.emergencyNumber ?? '000'
  const nearbyName = (incident?.assignments ?? []).find((a) => a.role === 'NEARBY' && a.state !== 'QUEUED')?.memberId
  const hospital = incident?.handoff?.hospitalName
  const orbitScene = useMemo(() => (scene ? orbitWithHospital(scene, hospital) : null), [scene, hospital])

  const label = (a: AssignmentAction) => {
    if (a === 'CALLED_115') return t('live.action.CALLED_115', { num })
    if (a === 'CALL_PERSON') return t('live.action.CALL_PERSON', { name: personFirst })
    if (a === 'CALL_NEARBY' && nearbyName) return t('live.action.CALL_PERSON', { name: memberName(people, nearbyName).split(' ')[0] })
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

  const tone = circleTone(incident)
  // The prototype's circle: calm (teal, dark labels) at rest or once all clear, else the incident's own orbit.
  const orbitMode = !view ? 'calm' : view.open ? view.orbit.mode : tone === 'bad' ? 'sos' : 'calm'
  const checking = incident?.status === 'VERIFYING' || incident?.status === 'CHECKING_IN'
  const now = !view ? { ic: '✓', c: 'g', title: t('agent.circle.inPlace'), sub: circleAtRest(people) }
    : checking ? { ic: '…', c: 'w', title: t('agent.circle.checking', { name: personFirst }), sub: t('agent.circle.checkingSub') }
    : tone === 'good' ? { ic: '✓', c: 'g', title: t('agent.circle.allClear'), sub: t('agent.circle.allClearSub') }
    : { ic: view.owner.eta === '✓' || !view.open ? '✓' : view.owner.initials || '!', c: view.owner.eta === '✓' || !view.open ? 'g' : 'b', title: view.owner.title, sub: view.owner.subtitle }

  const close = () => {
    setPending(true)
    act('console', 'CLOSE').then(() => toast(t('live.closed')), () => toast(t('live.failed'))).finally(() => setPending(false))
  }

  return (
    <div className="c4" style={gap16}>
      <article className="glass card circ" id="circCard">
        <div className="ch">
          <h2>{t('agent.circle.title', { name: personFirst })}</h2>
          <span className={`pill ${tone === 'good' ? 'plain' : tone}`} id="emTag">{view?.levelLabel ?? t('agent.circle.allNormal')}</span>
          {view?.open && manual && <span style={endStyle}><button type="button" className="chip" disabled={pending} onClick={close}>{t('live.close')}</button></span>}
        </div>
        {orbitScene ? (
          <Orbit scene={orbitScene} ariaLabel={t('orbitLabel')} mode={orbitMode} state={view?.orbit ?? IDLE_ORBIT} labels tilt={0.62} zoom={1.3} style={orbitStyle} />
        ) : (
          <div className="c3d" style={orbitStyle}></div>
        )}
        <div className="circ-stat">
          <div className="circ-min">
            <b id="emMin">{view?.minutes ?? 0}′</b>
            <span><small>{t('since')}</small><em id="emLvl" className={view ? tone : 'good'}>{view?.levelLabel ?? t('agent.circle.allNormal')}</em></span>
          </div>
          <div className="circ-r"><b id="emWhat">{view?.what ?? t('agent.circle.watching')}</b><small id="emSub">{view ? view.sub : t('agent.circle.lkw')}</small></div>
        </div>
        <div className="circ-now">
          <span className={`circ-ic ${now.c}`}>{now.ic}</span>
          <span><b id="ownT">{now.title}</b><small id="ownS">{now.sub}</small></span>
        </div>
        <button type="button" className="btn sos circ-call"
          onClick={() => (view ? drawer.open(t('live.scriptTitle', { num }), <LiveScriptBody view={view} />) : toast(t('live.calling', { who: num })))}>
          <span className="ic"><Icon name="phone" /></span>{t('script.call', { num })}
        </button>
      </article>
      {alerted.length > 0 && view?.open && manual && (
        <article className="glass card">
          <div className="ch"><h2>{t('live.actionsTitle', { name: actor ? memberName(people, actor) : '' })}</h2></div>
          <div style={chips} role="group" aria-label={t('actAs')}>
            {alerted.map((id) => (
              <button key={id} type="button" className={`chip${id === actor ? ' on' : ''}`} aria-pressed={id === actor} onClick={() => setPicked(id)}>
                <Avatar name={memberName(people, id)} className="av sm" style={avSm}>{initialsOf(memberName(people, id))}</Avatar>
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
