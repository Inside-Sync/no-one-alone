import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { PEOPLE, PERSON_IDS, isChild, type PersonId, type Snapshot } from '../index'
import { getEngine, setUi, useTexts, useUi } from './store'
import { E, c } from './bits'
import { showRun } from './layout'

/** Grid row and first column of each person (each spans two of the six node columns; prototype TPOS). */
const POS: Record<PersonId, [number, number]> = { moza: [1, 2], saeed: [1, 4], khalid: [2, 2], amna: [2, 4], hamdan: [3, 2], hind: [3, 4] }

/** The family tree: nodes in a grid, lines drawn from the real node rectangles (redrawn on resize). */
export function Tree({ snap }: { snap: Snapshot }) {
  const { u, x, raw } = useTexts()
  const { treeOpen } = useUi()
  const strip = !!snap.journey && treeOpen === false
  const grid = useRef<HTMLDivElement>(null)
  const nodes = useRef<Partial<Record<PersonId, HTMLButtonElement | null>>>({})
  const [lines, setLines] = useState<{ w: number; h: number; d: string; dm: string; cx: number; cy: number } | null>(null)

  const draw = useCallback(() => {
    const g = grid.current
    if (!g) return
    const gb = g.getBoundingClientRect()
    if (!gb.width) return
    const B = (k: PersonId) => {
      const e = nodes.current[k]?.getBoundingClientRect()
      if (!e) return { x: 0, y: 0, w: 0, h: 0, cx: 0 }
      return { x: e.left - gb.left, y: e.top - gb.top, w: e.width, h: e.height, cx: e.left - gb.left + e.width / 2 }
    }
    const Mo = B('moza'), Sa = B('saeed'), K = B('khalid'), A = B('amna'), Ha = B('hamdan'), Hi = B('hind')
    const vline = (a: typeof Mo, b: typeof Mo) => { const mid = (a.y + a.h + b.y) / 2; return `M${a.cx} ${a.y + a.h}V${mid}H${b.cx}V${b.y}` }
    let d = vline(Mo, K) + vline(Sa, A)
    // Marriage line between the facing edges (works in both directions, so Arabic mirrors it).
    const [l, r] = K.x <= A.x ? [K, A] : [A, K]
    const c2 = K.y + K.h / 2, m2 = (l.x + l.w + r.x) / 2
    const dm = `M${l.x + l.w} ${c2}H${r.x}`
    const b2 = (K.y + K.h + Ha.y) / 2
    d += `M${m2} ${c2}V${b2}M${Ha.cx} ${b2}H${Hi.cx}M${Ha.cx} ${b2}V${Ha.y}M${Hi.cx} ${b2}V${Hi.y}`
    setLines({ w: gb.width, h: gb.height, d, dm, cx: m2, cy: c2 })
  }, [])

  useLayoutEffect(() => {
    draw()
    const g = grid.current
    if (!g || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => draw())
    ro.observe(g)
    return () => ro.disconnect()
  }, [draw, strip])
  useLayoutEffect(() => { draw() }, [draw, snap.version])

  const open = (k: PersonId, el: HTMLElement) => {
    setUi({ drawer: k, opener: el })
    const e = getEngine()
    if (!snap.journey || snap.journey.person !== k) {
      void e.startJourney(k)
      if (window.innerWidth < 900) document.getElementById('fh-now')?.scrollIntoView({ block: 'start' })
      else showRun()
    }
  }
  if (strip) {
    return (
      <div className={c('fam')} role="group" aria-label={u('tree.label')} data-tour="lineage">
        <div className={c('fstrip')}>
          <span className={c('fsl')}>{u('tree.family')}</span>
          {PERSON_IDS.map((k) => {
            const st = snap.status[k], act = snap.journey?.person === k, name = raw(`people.${k}.name`)
            return (
              <button type="button" key={k} className={c('fch', act && 'act')} data-person={k} aria-pressed={act}
                aria-label={`${u('tree.open', { name })} · ${x(st.label)}`} onClick={(ev) => open(k, ev.currentTarget)}>
                <span><E n={PEOPLE[k].icon} /></span><b>{name}</b><i className={c(st.tone)} title={x(st.label)} />
              </button>
            )
          })}
          <button type="button" className={c('fexp gDown')} aria-expanded={false} onClick={() => setUi({ treeOpen: true })}>{u('tree.show')}</button>
        </div>
      </div>
    )
  }
  return (
    <div className={c('fam')} role="group" aria-label={u('tree.label')} data-tour="lineage">
      <div className={c('tw')}>
        <div className={c('tree')} ref={grid}>
          <svg className={c('lines')} aria-hidden="true" {...(lines ? { viewBox: `0 0 ${lines.w} ${lines.h}`, width: lines.w, height: lines.h } : {})}>
            {lines && <><path d={lines.d} className={c('lp')} /><path d={lines.dm} className={c('lm')} /><circle cx={lines.cx} cy={lines.cy} r="4" className={c('ring')} /></>}
          </svg>
          {[1, 2, 3].map((r) => <span key={r} className={c('gl')} style={{ gridRow: r }}>{u(`tree.gen.${r}`)}</span>)}
          {PERSON_IDS.map((k) => {
            const p = snap.profiles[k], st = snap.status[k], hp = snap.heart[k], act = snap.journey?.person === k, pos = POS[k]
            const name = raw(`people.${k}.name`)
            const age = isChild(p) ? (p.ageM < 24 ? u('tree.months', { n: p.ageM }) : String(Math.floor(p.ageM / 12))) : String(p.age)
            return (
              <button type="button" key={k} ref={(el) => { nodes.current[k] = el }} className={c('node', act && 'act')} data-person={k}
                style={{ gridRow: pos[0], gridColumn: `${pos[1] + 1} / span 2` }} aria-pressed={act} aria-label={u('tree.open', { name })}
                onClick={(ev) => open(k, ev.currentTarget)}>
                <span className={c('ni')}><E n={PEOPLE[k].icon} /></span>
                <span className={c('nb')}>
                  <b>{u('tree.nameAge', { name, age })}</b>
                  <small>{u('tree.small', { rel: raw(`people.${k}.rel`), line: raw(`people.${k}.tree`) })}</small>
                  <span className={c('nt')}>
                    <em className={c(st.tone)}>{x(st.label)}</em>
                    {hp && <em className={c('rk', hp.tone, 'gHeart')}>{hp.pct}</em>}
                  </span>
                </span>
              </button>
            )
          })}
          <div className={c('legend')} style={{ gridRow: '1 / span 2', gridColumn: 7 }}>
            <span><i className={c('lm')} />{u('tree.married')}</span>
            <span><i className={c('lp')} />{u('tree.parentOf')}</span>
            <span className={c('mut')}>{u('tree.legend')}</span>
            {snap.journey && <button type="button" className={c('fexp gUp')} aria-expanded onClick={() => setUi({ treeOpen: false })}>{u('tree.collapse')}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
