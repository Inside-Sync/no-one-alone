import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ADULT_EDIT_FIELDS, CHILD_EDIT_FIELDS, EDIT_RANGES, SIGNAL, TOGGLE_FIELDS, isChild, type EditField, type PersonId, type Snapshot } from '../index'
import { getEngine, getUi, setUi, useTexts, useUi } from './store'
import { E, c, toneOf } from './bits'
import { FamTable } from './Feed'

export function closeDrawer() {
  const { opener } = getUi()
  setUi({ drawer: null, opener: null })
  if (opener?.isConnected) opener.focus()
}

/** The record drawer (prototype `aside.drawer`): opens from the right (left in Arabic), Esc closes it. */
export function Drawer({ snap }: { snap: Snapshot }) {
  const { drawer: k } = useUi()
  const closeBtn = useRef<HTMLButtonElement>(null)
  const [shown, setShown] = useState<PersonId | null>(k)
  if (k && k !== shown) setShown(k)
  useEffect(() => { if (k) closeBtn.current?.focus({ preventScroll: true }) }, [k])
  const who = k ?? shown
  const { u } = useTexts()
  return createPortal(
    <div className={c('host')}>
      <aside className={c('drawer', k && 'open')} aria-hidden={!k} aria-label={u('drawer.label')} inert={!k} id="fh-drawer">
        {who && <DrawerBody k={who} snap={snap} closeRef={closeBtn} key={who} />}
      </aside>
    </div>,
    document.body,
  )
}

function DrawerBody({ k, snap, closeRef }: { k: PersonId; snap: Snapshot; closeRef: React.RefObject<HTMLButtonElement | null> }) {
  const t = useTexts()
  const { u, x, raw } = t
  const e = getEngine()
  void snap.version
  const v = e.recordView(k)
  const p = v.profile
  const [draft, setDraft] = useState<Partial<Record<EditField, string>>>({})
  const P = (key: string) => raw(`people.${k}.${key}`)
  const name = P('name')
  const age = x(v.age)
  const kv = (a: string, b: string | number) => <div key={a}><span>{a}</span><b>{String(b)}</b></div>
  const child = isChild(p)
  const gen = P('gen')
  const readings = child ? '' : u('drawer.readings', { sbp: p.sbp, dbp: p.dbp, hr: p.hr, steps: p.steps })
    + (p.a1c ? u('drawer.a1c', { a1c: p.a1c }) : '')
    + (p.tc ? u('drawer.chol', { tc: p.tc, hdl: (p.hdl ?? 0).toFixed(1) }) : u('drawer.cholNever'))
  const start = () => { setUi({ drawer: null, opener: null }); void e.startJourney(k) }
  const fields = child ? CHILD_EDIT_FIELDS : ADULT_EDIT_FIELDS
  const cur = (f: EditField) => (p as unknown as Record<string, number>)[f]
  const onNum = (f: EditField, s: string) => {
    setDraft((d) => ({ ...d, [f]: s }))
    const n = Number(s)
    if (s !== '' && Number.isFinite(n)) e.editProfile(k, f, n)
  }
  const invalid = (f: EditField) => {
    const s = draft[f]
    if (s == null) return false
    const n = Number(s), r = EDIT_RANGES[f]
    return s === '' || !Number.isFinite(n) || n < r.min || n > r.max
  }
  return (
    <>
      {/* The header (name, chips, the main button) stays at the top while the record scrolls. */}
      <div className={c('dtop')}>
      <div className={c('dh')}>
        <span className={c('di')}><E n={v.icon} /></span>
        <div><b>{P('full')}</b><small>{u('drawer.relAge', { rel: P('rel'), age })}</small></div>
        <button type="button" className={c('x')} aria-label={u('drawer.close')} ref={closeRef} onClick={closeDrawer}>✕</button>
      </div>
      <div className={c('dchips')}>
        {v.overdue > 0 && <em className={c('bad')}>{u('drawer.overdue', { n: v.overdue })}</em>}
        {v.due > 0 && <em className={c('warn')}>{u('drawer.due', { n: v.due })}</em>}
        {!v.overdue && !v.due && <em className={c('good')}>{u('drawer.ok')}</em>}
        <em className={c(v.status.tone)}>{x(v.status.label)}</em>
      </div>
      {v.current
        ? <button type="button" className={c('btn wide gNext')} onClick={closeDrawer}>{u('drawer.back', { name })}</button>
        : <button type="button" className={c('btn wide gNext')} onClick={start}>{u('drawer.start')}</button>}
      </div>
      <h4>{u('drawer.details')}</h4>
      <div className={c('kv')}>
        {kv(u('drawer.k.nat'), P('nat'))}
        {kv(u('drawer.k.age'), age)}
        {kv(u('drawer.k.sex'), x(v.sex))}
        {kv(u('drawer.k.lang'), P('lang'))}
        {kv(u('drawer.k.lives'), u('drawer.lives', { home: P('home') }))}
        {kv(u(child ? 'drawer.k.day' : 'drawer.k.work'), P('job'))}
        {kv(u('drawer.k.bmi'), child ? u('drawer.growth') : String(v.bmi))}
        {kv(u('drawer.k.clinic'), P('clinic'))}
        {kv(u('drawer.k.doc'), P('doc'))}
        {kv(u('drawer.k.dev'), P('dev'))}
        {kv(u('drawer.k.allergy'), P('allergy'))}
        {kv(u('drawer.k.fits'), P('ctx'))}
      </div>
      <h4>{u('drawer.medical')}</h4>
      <div className={c('kv one')}>
        {kv(u('drawer.k.cond'), P('hist'))}
        {kv(u('drawer.k.meds'), P('meds'))}
        {kv(u('drawer.k.last', { date: P('lastDate') }), P('last'))}
        {!child && kv(u('drawer.k.readings'), readings)}
        {gen && gen !== '—' && kv(u('drawer.k.gen'), gen)}
      </div>
      <h4>{u('drawer.history')}</h4>
      <div className={c('tw')}>
        <table className={c('sh')}>
          <thead><tr><th>{u('drawer.th.check')}</th><th>{u('drawer.th.last')}</th><th>{u('drawer.th.every')}</th><th>{u('drawer.th.status')}</th></tr></thead>
          <tbody>
            {v.screening.map((r, i) => (
              <tr key={i}><td>{x(r.name)}</td><td>{x(r.last)}</td><td>{x(r.every)}</td><td><em className={c(toneOf(r.st))}>{u(`drawer.st.${r.st}`)}</em></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h4>{u('drawer.family')}</h4>
      <FamTable rows={v.family} k={k} t={t} compact />
      <h4>{u('drawer.try')}</h4>
      <div className={c('nums')}>
        {fields.map((f) => {
          const r = EDIT_RANGES[f], bad = invalid(f)
          return (
            <label key={f} className={c('nf')}>
              <span>{u(`drawer.f.${f}`)}</span>
              <span className={c('ni2')}>
                <input type="number" inputMode="decimal" min={r.min} max={r.max} step={r.step} value={draft[f] ?? String(cur(f))}
                  aria-invalid={bad || undefined} aria-describedby={bad ? `fh-r-${f}` : undefined}
                  onChange={(ev) => onNum(f, ev.target.value)}
                  onBlur={() => { if (!invalid(f)) setDraft((d) => { const n = { ...d }; delete n[f]; return n }) }} />
                {r.unit && <em>{u(`drawer.u.${r.unit}`)}</em>}
              </span>
              {bad && <small id={`fh-r-${f}`} className={c('mut')}>{u('drawer.range', { min: r.min, max: r.max })}</small>}
            </label>
          )
        })}
      </div>
      {!child && (
        <div className={c('tgs')}>
          {TOGGLE_FIELDS.map((f) => (
            <button type="button" key={f} className={c('tg')} aria-pressed={!!(p as unknown as Record<string, boolean>)[f]} onClick={() => e.toggleProfile(k, f)}>{u(`drawer.t.${f}`)}</button>
          ))}
        </div>
      )}
      <p className={c('mut sm')}>{child ? u('drawer.hintChild') : u('drawer.hint', { thr: SIGNAL.hrHigh })}</p>
      <button type="button" className={c('btn wide gNext')} onClick={start}>{u('drawer.rerun', { name })}</button>
      <p className={c('mut sm')} style={{ marginTop: 10 }}>{u('drawer.foot')}</p>
    </>
  )
}
