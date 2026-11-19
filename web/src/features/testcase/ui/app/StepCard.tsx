'use client'

import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { AGENTS } from '../../data/agents'
import { clk, hm, tx, type AgentId, type StepDef } from '../../engine'
import { GateStrip } from './Gates'
import { Handoffs } from './Flow'
import { ProvLine } from './Provenance'
import './gates.css'
import { useA, useAd, type SessionProps } from './parts'
import { KindSlot } from './registry'
import { scrollSoon, scrollToTarget } from './scrollTo'

/** "Noa agents on this step": what each working agent does, the hand-offs, and who decides (prototype agentHTML). */
function AgentBlock({ s, decides = true }: SessionProps & { decides?: boolean }) {
  const t = useA()
  const { snap, r, setDetails, setAgOpen } = s
  const st = snap.step
  // The agent's story opens in the team card (a detail): details on, the story open, the team in view.
  const story = (k: AgentId) => { setDetails(true); setAgOpen(k); scrollSoon('team', undefined, 60) }
  return (
    <div className="agent">
      <div className="hd"><span>{t('card.agents')}</span><span className="pill s-live" style={{ marginInlineStart: 'auto' }}>{t(st.back ? 'card.stepBack' : 'card.working')}</span></div>
      {st.agents.map((a) => (
        <div key={a.agent} className="ag1">
          <div className="ag1h">
            <span className="bot" aria-hidden="true"><span className="ic"><Icon name={AGENTS[a.agent].icon} /></span></span>
            <b>{t('team.agentName', { n: r(tx(AGENTS[a.agent].n)) })}</b><span className="agr">{r(tx(AGENTS[a.agent].role))}</span>
            <button type="button" className="agq" onClick={() => story(a.agent)}>{t('team.story')}</button>
          </div>
          <ul>{a.lines.map((l, i) => <li key={i}>{r(tx(l))}</li>)}</ul>
        </div>
      ))}
      <Handoffs flow={st.flow} r={r} />
      {decides && <div className="decides"><span className="ic" aria-hidden="true"><Icon name="user-round" /></span> {r(tx(st.decides))}</div>}
    </div>
  )
}

/** A step without its own text (always step 0) explains itself by who decides; that line then moves from the agents to "What this means". */
const byDecides = (st: StepDef) => !st.text

/**
 * "What this means" (top of the card, in the step's mode colour): one plain sentence, the step's own text or who decides. What to do next
 * stays in the sticky bar, and the mode in the step's own header below, so nothing is said twice and the box keeps its height.
 */
function Meaning({ s }: SessionProps) {
  const t = useAd()
  const { snap, r } = s
  const st = snap.step
  return (
    <p className={`tc-means mode-${st.mode}`}>
      <span className="lab">{t('card.means')}</span> {r(tx(byDecides(st) ? st.decides : st.text!))}
    </p>
  )
}

/** Back and Next (prototype navHTML); at the end of the case, Replay and Try another case. */
function Nav({ s }: SessionProps) {
  const t = useAd()
  const { engine, snap, r } = s
  const i = snap.state.step
  const nx = snap.steps[i + 1]
  return (
    <div className="nav">
      {i > 0 ? <button type="button" className="btn ghost sm" onClick={() => engine.go(i - 1)}>← {t('card.back')}</button> : <span />}
      {nx
        ? <button type="button" className="btn" data-act="next" disabled={!snap.canNext} onClick={() => engine.next()}>{t('card.next', { title: r(tx(nx.title)) })} →</button>
        : i > 0 ? (
          <span className="tc-endacts">
            {/* The end of the case: play it again with the same readings (after changing a detail), or start over. */}
            <button type="button" className="btn ghost sm" onClick={s.replay} title={t('header.replayHint')}>{t('header.replay')}</button>
            <button type="button" className="btn" data-act="restart" onClick={s.restart}>{t('card.again')}</button>
          </span>
        ) : null}
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
      <ProvLine kind={st.kind} live={engine.curExplain()?.src === 'live'} />
      <Meaning s={s} />
      <AgentBlock s={s} decides={!byDecides(st)} />
      <KindSlot type={engine.caseDef.type} engine={engine} snap={snap} step={st} r={r} />
      {/* Ours, not the prototype's: the safety checks sit after the step's own content, so the card reads as in the prototype. */}
      <GateStrip snap={snap} r={r} />
      <Nav s={s} />
    </>
  )
}
