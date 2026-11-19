'use client'

import { Fragment, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { AGENTS, AGENT_IDS } from '../../data/agents'
import { NODES } from '../../data/agents'
import { tx, type FlowNode } from '../../engine'
import { scrollSoon } from './scrollTo'
import { tokText, useA, type SessionProps } from './parts'

/**
 * The steps of the case, one button each; only steps already reached can be opened, the ones ahead are dashed. In a safety case the
 * journey Noa chose is a branch: a small "After Noa decides" label sits before its first step.
 */
export function Stepper({ s }: SessionProps) {
  const t = useA()
  const { engine, snap, r } = s
  const S = snap.state
  const steps = snap.steps
  const n = Math.max(steps.length + (S.path ? 0 : 1), 2)
  const branch = !engine.isFam && !engine.isPrev && steps.length > 1
  const { t: tShell } = useTranslation('testcaseShell')
  // With the label the wide grid gets one narrow column for it: the step before it, the label, then the journey.
  const style = { '--n': n, ...(branch ? { '--cols': `minmax(0,1fr) auto repeat(${n - 1},minmax(0,1fr))` } : {}) } as CSSProperties
  return (
    <ol className={`stepper${branch ? ' tc-branched' : ''}`} aria-label={tShell('layout.steps')} style={style}>
      {steps.map((st, i) => (
        <Fragment key={i}>
          {/* A label in the grid, not a step: hidden from the list semantics, said instead at the start of the first journey step. */}
          {branch && i === 1 && <li className="tc-branch" aria-hidden="true"><span>{t('stepper.afterDecides')}</span></li>}
          <li>
            <button
              type="button"
              className={`mode-${st.mode} ${i < S.max || S.done[i] ? 'done' : ''}${i > S.max ? ' tc-ahead' : ''}`}
              disabled={i > S.max}
              aria-current={i === S.step ? 'step' : undefined}
              title={r(tx(st.title))}
              onClick={() => { engine.go(i); scrollSoon('card', { focus: true }) }}
            >
              {branch && i === 1 && <span className="tc-vh">{t('stepper.afterDecides')}: </span>}
              <span className="n">{i + 1} · {r(tx(st.label))}</span>
              <span className="t">{r(tx(st.title))}</span>
            </button>
          </li>
        </Fragment>
      ))}
      {!S.path && (
        <li>
          <button type="button" disabled className="mode-ind tc-ahead">
            <span className="n">{t('stepper.next')}</span>
            <span className="t">{S.dec ? (S.dec.standdown || S.dec.rule === 'R12' ? t('stepper.nothingMore') : '') : t('stepper.noaDecides')}</span>
          </button>
        </li>
      )}
    </ol>
  )
}

/** "Hand-offs" of a step: Guardian → Voice → ... (a person, a place or an agent). */
export function Handoffs({ flow, r, label = true }: { flow: FlowNode[]; r: SessionProps['s']['r']; label?: boolean }) {
  const t = useA()
  return (
    <div className="handoff">
      {label && <span className="lab">{t('card.handoffs')}</span>}
      {flow.map((w, i) => (
        <span key={i} className="tc-hop">
          {i > 0 && <span className="arr" aria-hidden="true">→</span>}
          {'agent' in w
            ? <span className="who ai"><span className="ic" aria-hidden="true"><Icon name={AGENTS[w.agent].icon} /></span> {r(tx(AGENTS[w.agent].n))}</span>
            : <span className="who">{r(tx(w.label))}</span>}
        </span>
      ))}
    </div>
  )
}

/** Who holds the person's care at every step (the baton), one row of chips; the hand-offs are in the step card. */
export function Baton({ s }: SessionProps) {
  const t = useA()
  const { snap, r } = s
  const S = snap.state
  const who = s.engine.isFam ? t('baton.family') : t('baton.person', { n: tokText(s, 'n') })
  return (
    <>
      <div className="tc-baton-row">
        <span className="lab">{t('baton.label', { who })}</span>
        {snap.steps.map((st, i) => (
          <span key={i} className="tc-hop">
            {i > 0 && <span className="arr" aria-hidden="true">›</span>}
            <span className={`bt mode-${st.mode}${i === S.step ? ' on' : i < S.max ? ' done' : ''}`} aria-current={i === S.step ? 'step' : undefined}>{i + 1} · {st.hold ? r(tx(st.hold)) : ''}</span>
          </span>
        ))}
      </div>
    </>
  )
}

/** The nine Noa agents; the ones working on this step are lit; a tap tells an agent's story. */
export function Team({ s }: SessionProps) {
  const t = useA()
  const { snap, r, agOpen: open, setAgOpen: setOpen } = s
  const on = snap.step.agents.map((a) => a.agent)
  return (
    <>
      <div className="team-h"><span className="lab">{t('team.title')}</span><span className="note">{t('team.note')}</span></div>
      <div className="team-row">
        {AGENT_IDS.map((k) => (
          <button key={k} type="button" className={`agc${on.includes(k) ? ' on' : ''}${open === k ? ' open' : ''}`} aria-expanded={open === k} title={r(tx(AGENTS[k].role))} onClick={() => setOpen(open === k ? null : k)}>
            <span className="bot" aria-hidden="true"><span className="ic"><Icon name={AGENTS[k].icon} /></span></span>
            <span><b>{r(tx(AGENTS[k].n))}</b><small>{r(tx(AGENTS[k].role))}</small></span>
          </button>
        ))}
      </div>
      {open && (
        <div className="agstory">
          <div className="ag1h">
            <span className="bot" aria-hidden="true"><span className="ic"><Icon name={AGENTS[open].icon} /></span></span>
            <b>{t('team.agentName', { n: r(tx(AGENTS[open].n)) })}</b><span className="agr">{r(tx(AGENTS[open].role))}</span>
            <button type="button" className="agq" onClick={() => setOpen(null)}>{t('team.close')}</button>
          </div>
          <p>{r(tx(AGENTS[open].story))}</p>
          <div className="agcan"><span>✓ {t('team.can', { v: r(tx(AGENTS[open].can)) })}</span><span>✕ {t('team.cannot', { v: r(tx(AGENTS[open].cannot)) })}</span></div>
        </div>
      )}
    </>
  )
}

/** The data path: where the information is right now (sensors, phone, cloud, consent, agents, hospital, government). */
export function Pipe({ s }: SessionProps) {
  const { snap, r } = s
  const { t: tShell } = useTranslation('testcaseShell')
  return (
    <ol className="pipe card" aria-label={tShell('layout.dataPath')}>
      {NODES.map((n, i) => {
        const st = snap.state.pipe[i]
        return (
          <li key={i} className={`node ${n.kind} ${st?.c ?? ''}`} title={st ? r(st.t) : undefined}>
            <div className="who">{r(tx(n.who))}</div>
            <div className="nm">{r(tx(n.name))}</div>
            <div className="st">{st ? r(st.t) : ''}</div>
          </li>
        )
      })}
    </ol>
  )
}
