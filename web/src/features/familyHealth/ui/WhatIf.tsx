import { useEffect, useRef } from 'react'
import {
  CHILD_FIELDS, isChild, pct, scenariosFor, showsGlucose, signalRules, trackStops, urgentOf, whatIfFields, zoneOf,
  type AdultProfile, type PersonId, type Profile, type SliderDef, type Snapshot, type ToggleField,
} from '../index'
import { getEngine, reducedMotion, setUi, useTexts, useUi } from './store'
import { Bold, c } from './bits'
import { showRun } from './layout'

type Texts = ReturnType<typeof useTexts>
const TOGGLES: readonly ToggleField[] = ['smoker', 'dm', 'bpTx', 'cvd']

/**
 * "Try it · <Name>'s readings" (prototype renderWhatIf): drag a reading or pick a scenario and see at once what Noa would do;
 * "Run Noa with these readings" re-runs the journey with them. Collapsible; it closes when the person starts a check.
 */
export function WhatIf({ snap }: { snap: Snapshot }) {
  const t = useTexts()
  const { u, raw } = t
  const { wiOpen } = useUi()
  const j = snap.journey
  if (!j) return <div className={c('wi')} />
  const k = j.person, p = snap.profiles[k], name = raw(`people.${k}.name`)
  const e = getEngine()
  const run = () => { void e.startJourney(k); showRun() }
  return (
    <div className={c('wi')}>
      <details className={c('wiw')} open={wiOpen} id="fh-wi" onToggle={(ev) => { const o = (ev.currentTarget as HTMLDetailsElement).open; if (o !== wiOpen) setUi({ wiOpen: o }) }}>
        <summary>
          <span className={c('wk')}>{u('wi.try')}</span>
          <b>{u('wi.readings', { name })}</b>
          <span className={c('mut sm wsh')}>{u('wi.hint')}</span>
          <Summary k={k} p={p} t={t} />
          <span className={c('wtg', wiOpen ? 'gUp' : 'gDown')}>{u(wiOpen ? 'wi.hide' : 'wi.edit')}</span>
        </summary>
        <div className={c('wig')}>
          <div>
            {isChild(p) ? (
              <div className={c('msg2')}>{CHILD_FIELDS.map((d) => <Slider key={d.id} k={k} def={d} v={p[d.id as 'ageM' | 'overdueW']} p={p} t={t} />)}</div>
            ) : (
              <>
                <div className={c('wpre')} role="group" aria-label={u('wi.scenarios')}>
                  <span className={c('wpl')}>{u('wi.scenarios')}</span>
                  {scenariosFor(k, p).map((s) => <button type="button" key={s} className={c('scn')} onClick={() => e.applyScenario(k, s)}>{u(`wi.sc.${s}`)}</button>)}
                </div>
                <div className={c('msg2')}>
                  {whatIfFields(k, p).map((d) => <Slider key={d.id} k={k} def={d} v={(p as unknown as Record<string, number | undefined>)[d.id] ?? 6.8} p={p} t={t} />)}
                </div>
                <div className={c('tgs')}>
                  {TOGGLES.map((f) => (
                    <button type="button" key={f} className={c('tg2')} aria-pressed={!!p[f]} onClick={() => e.toggleProfile(k, f)}><i />{u(`wi.t.${f}`)}</button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className={c('wiside')}>
            <Result k={k} snap={snap} t={t} />
            <div className={c('btnrow')}>
              <button type="button" className={c('btn')} onClick={run}>{u('wi.run')}</button>
              <button type="button" className={c('btn ghost sm')} aria-label={u('wi.resetAria', { name })} onClick={() => e.resetProfile(k)}>{u('wi.reset')}</button>
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}

function Slider({ k, def, v, p, t }: { k: PersonId; def: SliderDef; v: number; p: Profile; t: Texts }) {
  const { u, x, lang } = t
  const z = zoneOf(def, v, p)
  const st = trackStops(def)
  const deg = lang === 'ar' ? 270 : 90
  const bg = st.length ? `linear-gradient(${deg}deg,${st.map((s) => `${s.color} ${s.at}%`).join(',')})` : 'linear-gradient(90deg,rgba(150,160,185,.35),rgba(150,160,185,.35))'
  const label = u(`wi.f.${def.id}`)
  return (
    <div className={c('ms', z.zone)} data-ms={def.id}>
      <div className={c('msh')}><span className={c('ml')}>{label}</span><b className={c('mv')}>{v}</b><small>{u(`wi.u.${def.id}`)}</small></div>
      <input type="range" min={def.min} max={def.max} step={def.step} value={v} style={{ background: bg }} aria-label={label}
        aria-valuetext={`${v} ${u(`wi.u.${def.id}`)}${z.text ? `, ${x(z.text)}` : ''}`}
        onChange={(ev) => { const n = Number(ev.target.value); if (ev.target.value !== '' && Number.isFinite(n)) getEngine().editProfile(k, def.id as never, n) }} />
      <span className={c('mz')}><i /><span>{z.text ? x(z.text) : ''}</span></span>
    </div>
  )
}

/** The chips shown in the closed summary (prototype #wsum). */
function Summary({ k, p, t }: { k: PersonId; p: Profile; t: Texts }) {
  const { u, x } = t
  if (isChild(p)) return <span className={c('wsum')}>{u('wi.sum.child', { m: p.ageM, v: p.overdueW ? u('wi.sum.overdue', { n: p.overdueW }) : u('wi.sum.onTime') })}</span>
  const a = p as AdultProfile
  const urg = urgentOf(signalRules(k, a))
  return (
    <span className={c('wsum')}>
      <span><i className={c('gHeart')} />{a.hr}</span>
      <span>{u('wi.sum.bp', { sbp: a.sbp, dbp: a.dbp })}</span>
      <span>{u('wi.sum.o2', { n: a.spo2 })}</span>
      {showsGlucose(k, a) && <span>{u('wi.sum.glu', { n: a.glu })}</span>}
      <span>{u('wi.sum.bmi', { n: a.bmi })}</span>
      {urg && <em className={c('wbad')}>{x(urg.text).split(':')[0].split(',')[0].split('،')[0]}</em>}
    </span>
  )
}

/** What Noa would do (prototype whatIfHTML); it flashes on each change. */
function Result({ k, snap, t }: { k: PersonId; snap: Snapshot; t: Texts }) {
  const { u, x, raw } = t
  const w = getEngine().whatIf(k)
  const ref = useRef<HTMLDivElement>(null)
  const sig = JSON.stringify(snap.profiles[k])
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const el = ref.current
    if (!el || reducedMotion()) return
    el.classList.remove(c('flash'))
    void el.offsetWidth
    el.classList.add(c('flash'))
  }, [sig])
  if (w.child) {
    return (
      <div className={c('wir')} ref={ref} aria-live="polite">
        <div className={c('wia', w.zone)}><i className={c('wd')} /><div>
          <b>{w.visit ? x(w.visit) : raw('wi.allDone')}</b><span>{x(w.text)}</span>
          {w.also.length > 0 && <span>{u('wi.also', { list: w.also.map((y) => x(y)).join(', ') })}</span>}
        </div></div>
      </div>
    )
  }
  const f = w.heart
  const ha = f.ok ? (typeof f.heartAge === 'number' ? String(f.heartAge) : raw(`wi.ha.${f.heartAge}`)) : ''
  return (
    <div className={c('wir')} ref={ref} aria-live="polite">
      <div className={c('wia', w.zone)}><i className={c('wd')} /><div>
        <span className={c('wk')}>{x(w.kind)}</span>
        <b>{x(w.head)}</b>
        {w.tags.length > 0 && <div className={c('wtags')}>{w.tags.map((g) => <span key={g.rule} className={c('wt', g.zone)}>{raw(`wi.act.${g.rule}`)}</span>)}</div>}
      </div></div>
      <div className={c('wil')}><span className={c('k')}>{u('wi.heart')}</span>{f.ok ? <Bold text={u('wi.heartV', { pct: pct(f.r), cat: raw(`risk.${f.cat}`), ha })} /> : raw(`wi.why.${f.why}`)}</div>
      <div className={c('wil')}><span className={c('k')}>{u('wi.tests')}</span>{w.tests.map((id) => raw(`vt.${id}.name`).split(/[:：]/)[0]).join(' · ') || u('wi.none')}</div>
    </div>
  )
}
