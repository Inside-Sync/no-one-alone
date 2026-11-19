'use client'

import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { AGENTS } from '../../data/agents'
import { clk, hm, tx } from '../../engine'
import { GateStrip } from './Gates'
import { Handoffs } from './Flow'
import { ProvLine } from './Provenance'
import './gates.css'
import { useA, useAd, type SessionProps } from './parts'
import { KindSlot } from './registry'
import { scrollToTarget } from './scrollTo'

/** "Noa agents on this step": what each working agent does, the hand-offs, and who decides (prototype agentHTML). */
function AgentBlock({ s }: SessionProps) {
  const t = useA()
  const { snap, r } = s
  const st = snap.step
  return (
    <div className="agent">
      <div className="hd"><span>{t('card.agents')}</span><span className="pill s-live" style={{ marginInlineStart: 'auto' }}>{t(st.back ? 'card.stepBack' : 'card.working')}</span></div>
      {st.agents.map((a) => (
        <div key={a.agent} className="ag1">
          <div className="ag1h">
            <span className="bot" aria-hidden="true"><span className="ic"><Icon name={AGENTS[a.agent].icon} /></span></span>
            <b>{t('team.agentName', { n: r(tx(AGENTS[a.agent].n)) })}</b><span className="agr">{r(tx(AGENTS[a.agent].role))}</span>
          </div>
          <ul>{a.lines.map((l, i) => <li key={i}>{r(tx(l))}</li>)}</ul>
        </div>
      ))}
      <Handoffs flow={st.flow} r={r} />
      <div className="decides"><span className="ic" aria-hidden="true"><Icon name="user-round" /></span> {r(tx(st.decides))}</div>
    </div>
  )
}

/** Back and Next (prototype navHTML). */
function Nav({ s }: SessionProps) {
  const t = useAd()
  const { engine, snap, r } = s
  const i = snap.state.step
  const nx = snap.steps[i + 1]
  // Next is off: say why, from what this step needs (not while the engine is busy playing, which ends by itself).
  const why = nx && !snap.canNext && !snap.busy ? t(`card.wait.${snap.step.kind}`, { defaultValue: t('card.wait.default') }) : null
  return (
    <div className="nav">
      {i > 0 ? <button type="button" className="btn ghost sm" onClick={() => engine.go(i - 1)}>← {t('card.back')}</button> : <span />}
      {nx
        ? <button type="button" className="btn" data-act="next" disabled={!snap.canNext} aria-describedby={why ? 'tc-nextwhy' : undefined} onClick={() => engine.next()}>{t('card.next', { title: r(tx(nx.title)) })} →</button>
        : i > 0 ? <button type="button" className="btn" data-act="restart" onClick={s.restart}>{t('card.again')}</button> : null}
      {why && <p className="tc-nextwhy" id="tc-nextwhy" role="status">{why}</p>}
    </div>
  )
}

/** The step card (left column): the step's title, the agents, then the card of the step's kind, then Back / Next. */
export function StepCard({ s }: SessionProps) {
  const t = useA()
  const { engine, snap, r } = s
  const S = snap.state, st = snap.step, i = S.step
  const when = i === 0 ? (engine.isPrev ? clk(S.start) : t('card.onwards', { at: hm(S.start) })) : clk(engine.stepTime(st))
  const prev = useRef(i)
  // On a phone the card is below the case header: bring it into view when a later step opens (not while "Run it for me" is on).
  useEffect(() => {
    const changed = prev.current !== i
    prev.current = i
    if (changed && i > 0 && !S.auto && window.innerWidth < 980) scrollToTarget('card')
  }, [i, S.auto])
  return (
    <>
      <span className="when">{when}</span>
      <h3>{i + 1} · {r(tx(st.title))}</h3>
      <GateStrip snap={snap} r={r} />
      <ProvLine kind={st.kind} />
      <AgentBlock s={s} />
      {i > 0 && st.text && <p>{r(tx(st.text))}</p>}
      <KindSlot type={engine.caseDef.type} engine={engine} snap={snap} step={st} r={r} />
      <Nav s={s} />
    </>
  )
}
