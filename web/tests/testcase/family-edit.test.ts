import { FAMILY_CONNECTIONS, FAMILY_MEMBERS } from '@/features/testcase/data'
import { pct, type TestCaseEngine } from '@/features/testcase/engine'
import edits from './fixtures/prototype-family-edits.json'
import { make, text } from './helpers'

/**
 * The family editor against the prototype. `fixtures/prototype-family-edits.json` was recorded in a browser (new4.html): for each
 * script of edits (tap a person, move a slider, switch a toggle, press an alert button, reset) it holds what the prototype's screen
 * then showed: the forecast panel, the signals, the alerts, the family tree, the score and the newest log lines.
 * The engine runs the same script through its own actions (famSelect, setProfile, toggleProfile, setSex, resetFamily, famAct).
 */
type Op = [string, ...(string | number)[]]
interface Rec {
  id: string; ops: Op[]; sel: string
  big: string | null; head: string | null; sub: string | null; key: string | null; na: string | null
  signals: string[]; alerts: { cls: string; title: string; done: boolean }[]; tree: string[]; score: string; log: string[]; conns: string[]; miss: string[]
}
const REC = edits as unknown as Rec[]
const HEART = '❤'

function run(ops: Op[]): TestCaseEngine {
  const e = make('family')
  let sel = 'khalid'
  for (const op of ops) {
    if (op[0] === 'sel') { sel = op[1] as string; e.famSelect(sel) }
    else if (op[0] === 'range') e.setProfile(sel, op[1] as 'age', Number(op[2]))
    else if (op[0] === 'tog') e.toggleProfile(sel, op[1] as 'smoker')
    else if (op[0] === 'sex') e.setSex(sel, op[1] as 'M' | 'F')
    else if (op[0] === 'reset') e.resetFamily()
    else if (op[0] === 'act') e.famAct(op[1] as string)
  }
  return e
}

describe('the family editor shows what the prototype showed', () => {
  test('the script covers the forecast, the validity limits, the alerts and the editor actions', () => {
    expect(REC.length).toBeGreaterThanOrEqual(35)
    const ops = new Set(REC.flatMap((r) => r.ops.map((o) => o[0])))
    expect(ops).toEqual(new Set(['sel', 'range', 'tog', 'sex', 'reset', 'act']))
  })

  test.each(REC.map((r) => [`${r.id}: ${r.ops.map((o) => o.join(' ')).join(', ')}`, r] as const))('%s', (_n, r) => {
    const e = run(r.ops)
    const snap = e.getSnapshot()
    const F = e.S.fm!
    const view = snap.family!
    const k = F.sel
    expect(k).toBe(r.sel)
    const f = view.forecast[k], p = F.prof[k]

    // the forecast panel
    if (f.ok) {
      expect(r.na).toBeNull()
      expect(pct(f.r)).toBe(r.big)
      expect(r.head!.endsWith(text(e, f.cat.label))).toBe(true)
      const ha = f.ha === 'atMost30' ? '30 or less' : f.ha === 'over100' ? 'over 100' : String(f.ha)
      expect(r.sub).toContain(`Heart age ${ha} (real age ${p.child ? '' : p.age})`)
      expect(r.sub).toMatch(f.lab ? /Framingham 2008, with cholesterol$/ : /Framingham 2008, without cholesterol/)
      expect(r.key).toContain(`If today’s trends continue: ${pct(f.r5)}`)
      expect(r.key).toContain(`With the plan: ${pct(f.p5)}`)
    } else {
      expect(r.big).toBeNull()
      expect(r.na).toBe(text(e, f.why))
    }

    // how the agents collected the signals
    const sig = view.signals[k]
    expect(sig).toHaveLength(r.signals.length)
    sig.forEach((s, i) => expect(r.signals[i].endsWith(text(e, s.source) + text(e, s.value))).toBe(true))

    // the alerts: open ones first, then the done ones
    const open = F.alerts.filter((a) => a.state === 'open'), done = F.alerts.filter((a) => a.state === 'done')
    expect(open.concat(done).map((a) => [text(e, a.title), a.state === 'done'])).toEqual(r.alerts.map((a) => [a.title, a.done]))
    expect(open.concat(done).map((a) => a.lvl)).toEqual(r.alerts.map((a) => a.cls.split(' ')[1]))

    // the family tree: name, age, relation, status and heart risk of everybody
    FAMILY_MEMBERS.forEach((m, i) => {
      const g = view.forecast[m.id], age = view.age[m.id]
      const risk = g.ok ? `${HEART} ${pct(g.r)}` : ''
      expect(r.tree[i]).toContain(`${text(e, { k: m.name })}, ${text(e, age)}${text(e, { k: m.rel })} · ${text(e, { k: m.sub })}${text(e, { k: `family.status.${F.status[m.id]}` })}${risk}`)
    })

    // the passport score and the connections
    expect(r.score.startsWith(`${snap.famScore}%`)).toBe(true)
    expect(r.conns).toHaveLength(F.conn.length)
    F.conn.forEach((c, i) => {
      const x = FAMILY_CONNECTIONS[c]
      expect(r.conns[i].endsWith(`${text(e, { k: x.from })} → ${x.to.map((id) => text(e, { k: FAMILY_MEMBERS.find((m) => m.id === id)!.name })).join(', ')}${text(e, { k: x.title })}${text(e, { k: x.action })}`)).toBe(true)
    })

    // the newest lines of the event log
    expect(e.logs.slice(0, r.log.length).map((l) => `${l.t}${l.m}${text(e, l.tx)}`)).toEqual(r.log)
  })
})
