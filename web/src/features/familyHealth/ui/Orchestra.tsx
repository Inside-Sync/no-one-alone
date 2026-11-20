import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { AGENTS, DOMAINS, DOMAIN_ORDER, skillsOf, type AgentId, type DomainId, type Snapshot } from '../index'
import { reducedMotion, useTexts } from './store'
import { E, c } from './bits'
import { Item } from './Feed'

type Dom = Exclude<DomainId, 'orch'>
const domOf = (a: AgentId): DomainId => AGENTS[a].domain

/** The aside: the Orchestrator and the four domain agents (curves, baton), the hand-off log, counters, history and rules. */
export function Orchestra({ snap }: { snap: Snapshot }) {
  const t = useTexts()
  const { u, x, raw } = t
  const wrap = useRef<HTMLDivElement>(null)
  const orc = useRef<HTMLDivElement>(null)
  const boxes = useRef<Partial<Record<Dom, HTMLDivElement | null>>>({})
  const baton = useRef<HTMLSpanElement>(null)
  const [curves, setCurves] = useState<{ w: number; h: number; paths: { k: Dom; d: string }[] } | null>(null)
  const j = snap.journey, running = !!j && !j.done
  const last = snap.hand.length ? snap.hand[snap.hand.length - 1] : null
  const hot = last ? [domOf(last.from), domOf(last.to)] : []
  const act = snap.active ? domOf(snap.active) : null
  const cnt: Partial<Record<DomainId, number>> = {}
  snap.hand.forEach((h) => { const d = domOf(h.to); cnt[d] = (cnt[d] ?? 0) + 1 })

  const draw = useCallback(() => {
    const w = wrap.current, o = orc.current
    if (!w || !o) return
    const wb = w.getBoundingClientRect()
    if (!wb.width) return
    const ob = o.getBoundingClientRect()
    const paths = DOMAIN_ORDER.map((k) => {
      const b = boxes.current[k]?.getBoundingClientRect()
      if (!b) return { k, d: '' }
      const x1 = ob.left - wb.left + ob.width / 2, y1 = ob.top - wb.top + ob.height, x2 = b.left - wb.left + b.width / 2, y2 = b.top - wb.top
      return { k, d: `M${x1} ${y1} C${x1} ${y1 + 18} ${x2} ${y2 - 18} ${x2} ${y2}` }
    })
    setCurves({ w: wb.width, h: wb.height, paths })
  }, [])
  useLayoutEffect(() => {
    draw()
    const w = wrap.current
    if (!w || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => draw())
    ro.observe(w)
    return () => ro.disconnect()
  }, [draw])
  useLayoutEffect(() => { draw() }, [draw, snap.version])

  // The baton flies from the giving agent to the Orchestrator and on to the receiving one, and exists only while it flies (B4).
  const flown = useRef(snap.hand.length)
  useLayoutEffect(() => {
    if (snap.hand.length <= flown.current) { flown.current = snap.hand.length; return }
    flown.current = snap.hand.length
    const h = snap.hand[snap.hand.length - 1], w = wrap.current, b = baton.current
    if (!h || !w || !b || reducedMotion() || typeof b.animate !== 'function') return
    const wb = w.getBoundingClientRect()
    if (!wb.width) return
    const box = (a: AgentId): [number, number] => {
      const d = domOf(a), e = d === 'orch' ? orc.current : boxes.current[d as Dom]
      const r = e?.getBoundingClientRect()
      return r ? [r.left - wb.left + r.width / 2 - 11, r.top - wb.top + r.height / 2 - 11] : [0, 0]
    }
    const a = box(h.from), o = box('orch'), z = box(h.to)
    b.hidden = false
    const an = b.animate([
      { transform: `translate(${a[0]}px,${a[1]}px) scale(.8)`, opacity: 0 },
      { transform: `translate(${a[0]}px,${a[1]}px) scale(1)`, opacity: 1, offset: 0.12 },
      { transform: `translate(${o[0]}px,${o[1]}px) scale(1.15)`, offset: 0.5 },
      { transform: `translate(${z[0]}px,${z[1]}px) scale(1)`, opacity: 1, offset: 0.88 },
      { transform: `translate(${z[0]}px,${z[1]}px) scale(.8)`, opacity: 0 },
    ], { duration: 1050, easing: 'ease-in-out' })
    an.onfinish = () => { b.hidden = true }
    an.oncancel = () => { b.hidden = true }
  }, [snap.hand])

  const name = j ? raw(`people.${j.person}.name`) : ''
  const short = (d: DomainId) => u(`dom.${d}`)
  const histCount = snap.feed.filter((m) => m.kind !== 'stage').length
  return (
    <aside className={c('team')} id="fh-team" aria-label={u('team.lab')}>
      <div className={c('orh')}><span className={c('lab')}>{u('team.lab')}</span><span className={c('mut sm')}>{u('team.sub')}</span></div>
      <div className={c('orchwrap')} ref={wrap}>
        <svg className={c('olines')} aria-hidden="true" {...(curves ? { viewBox: `0 0 ${curves.w} ${curves.h}`, width: curves.w, height: curves.h } : {})}>
          {curves?.paths.map((p) => <path key={p.k} d={p.d} className={c('ol', p.k, hot.includes(p.k) && running && 'hot')} />)}
        </svg>
        <div className={c('orc', (act === 'orch' || (last && running)) && 'live')} ref={orc}>
          <div className={c('oh')}><span className={c('oi')}><E n="orchestrator" /></span><div><b>{raw('domains.orch.name')}</b><small>{raw('domains.orch.does')}</small></div></div>
          <div className={c('os')}>
            {last ? (
              <>
                <span><E n={DOMAINS[domOf(last.from)].icon} /> {short(domOf(last.from))} {t.lang === 'ar' ? '←' : '→'} <E n={DOMAINS[domOf(last.to)].icon} /> {short(domOf(last.to))}</span>
                <span className={c('ok')}>{u('team.ruleOk', { rule: last.rule })}</span>
                <span className={c('ok')}>{u('team.consent')}</span>
                <span className={c('ok')}>{u('team.logged')}</span>
              </>
            ) : <span className={c('mut')}>{u('team.wait')}</span>}
          </div>
        </div>
        <div className={c('doms')}>
          {DOMAIN_ORDER.map((k) => {
            const on = act === k && running
            return (
              <div key={k} className={c('dom', k, on ? 'on' : cnt[k] ? 'was' : '')} ref={(el) => { boxes.current[k] = el }}>
                <div className={c('dh')}><span className={c('di')}><E n={DOMAINS[k].icon} /></span><b>{raw(`domains.${k}.name`)}</b>{cnt[k] ? <em>{cnt[k]}</em> : null}</div>
                <small>{raw(`domains.${k}.does`)}</small>
                <div className={c('sk')}>
                  {skillsOf(k).map((a) => (
                    <span key={a} className={c(snap.active === a && on && 'on')} title={u('team.can', { can: raw(`agents.${a}.can`), cannot: raw(`agents.${a}.cannot`) })}>
                      <E n={AGENTS[a].icon} /> {raw(`agents.${a}.name`)}
                    </span>
                  ))}
                </div>
                {on && <div className={c('hold')}>{u('team.holding', { name })}</div>}
              </div>
            )
          })}
        </div>
        <span className={c('baton')} ref={baton} hidden aria-hidden="true"><E n="package" /></span>
      </div>
      {snap.hand.length > 0 && (
        <div>
          <span className={c('lab')}>{u('team.log')}</span>
          <ol className={c('hlog')}>
            {snap.hand.slice(-6).reverse().map((h, i) => (
              <li key={`${snap.hand.length - i}`}>
                <span className={c('t')}>{h.t}</span>
                <span className={c('fr', domOf(h.from))}><E n={DOMAINS[domOf(h.from)].icon} /></span>
                <span className={c('ar')} aria-hidden="true">{t.lang === 'ar' ? '←' : '→'}</span>
                <span className={c('fr', domOf(h.to))}><E n={DOMAINS[domOf(h.to)].icon} /></span>
                <span className={c('hx')}><b>{raw(`agents.${h.to}.name`)}</b> {x(h.reason)}</span>
                <em>{h.rule}</em>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div>
        <div className={c('stats')}>
          <span><b>{snap.calls.live}</b> {u('team.live')}</span>
          <span><b>{snap.calls.prepared}</b> {u('team.prepared')}</span>
          <span><b>{snap.calls.guardrail}</b> {u('team.guardrail')}</span>
          <span><b>{snap.calls.overruled}</b> {u('team.overruled')}</span>
        </div>
        <p className={c('mut sm')}>{u('team.foot')}</p>
      {snap.feed.length > 0 && (
        <details className={c('hist')}>
          <summary>{u('team.hist', { n: histCount })}</summary>
          <div className={c('items')}>{snap.feed.map((m) => <Item key={m.id} m={m} snap={snap} t={t} compact />)}</div>
        </details>
      )}
      {snap.rulesHit.length > 0 && (
        <details className={c('hist')}>
          <summary>{u('team.rules', { n: snap.rulesHit.length })}</summary>
          <ul className={c('rl')}>{snap.rulesHit.map((r) => <li key={r.rule}><b>{r.rule}</b> {raw(`rules.${r.rule}`)}</li>)}</ul>
        </details>
      )}
      <div className={c('govp')}>
        <span className={c('lab gov')}>{u('team.gov')}</span>
        <div className={c('kp')}>
          <span><b>{snap.gov.journeys}</b>{u('team.k.journeys')}</span>
          <span><b>{snap.gov.booked}</b>{u('team.k.booked')}</span>
          <span><b>{snap.gov.barriers}</b>{u('team.k.why')}</span>
          <span><b>{snap.gov.referrals}</b>{u('team.k.referrals')}</span>
          <span><b>{snap.gov.refAccepted}</b>{u('team.k.refAccepted')}</span>
          <span><b>{snap.gov.refDeclined}</b>{u('team.k.refDeclined')}</span>
          <span><b>{snap.rulesHit.length}</b>{u('team.k.rules')}</span>
          <span><b>{snap.gov.notNow}</b>{u('team.k.notNow')}</span>
        </div>
      </div>
      </div>
    </aside>
  )
}
