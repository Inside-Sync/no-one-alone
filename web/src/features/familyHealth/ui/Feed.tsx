import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  AGENTS, DEVICES, DOMAINS, PEOPLE, SENTENCE, SPEECH_BASE, SPEECH_BASE_DEFAULT, URGENCY, VT, dueBy, hsh, isChild, rnd, words,
  type AgentId, type Card, type DomainId, type FeedItem, type PacketLine, type PatternCard, type PersonId, type Snapshot, type StageId, type Txt, type TxtList,
} from '../index'
import { wordEq } from '../engine/speech'
import { getEngine, reducedMotion, useSpokenText, useTexts } from './store'
import { AgentOrb } from '@/components/noa/AgentOrb'
import { Bold, E, c } from './bits'
import { canDictate } from './speechIo'
import { answerGo, feedScroll, showRun } from './layout'
import { usePanel } from './panelContext'

type Texts = ReturnType<typeof useTexts>
const isList = (v: unknown): v is TxtList => !!v && typeof v === 'object' && 'list' in (v as object)
/** A packet value: text, a joined list, a literal. */
function valOf(v: PacketLine['value'], x: Texts['x']): string {
  if (isList(v)) return v.list.map((i) => x(i)).join(typeof v.sep === 'string' ? v.sep : x(v.sep))
  return x(v as Txt | string | number)
}
const domainOf = (a: AgentId): DomainId => AGENTS[a].domain
const domClass = (d: DomainId) => d

/* ---------------------------------------------------------------- the "now" column */
export function Now({ snap }: { snap: Snapshot }) {
  const t = useTexts()
  const { u, raw } = t
  const j = snap.journey
  const e = getEngine()
  if (!j) {
    return (
      <div className={c('now')} id="fh-now" aria-live="polite">
        <div className={c('welcome')}>
          <h3>{u('welcome.h')}</h3>
          <p><Bold text={u('welcome.p')} /></p>
          <div className={c('starts')}>
            <button type="button" className={c('start')} onClick={() => { void e.runTestCase('s0'); showRun() }}><b><E n="grandpa" /> {u('welcome.saeed.t')}</b><span>{u('welcome.saeed.d')}</span></button>
            <button type="button" className={c('start')} onClick={() => { void e.runTestCase('m1'); showRun() }}><b><E n="grandma" /> {u('welcome.moza.t')}</b><span>{u('welcome.moza.d')}</span></button>
            <button type="button" className={c('start')} onClick={() => { void e.startJourney('khalid'); showRun() }}><b><E n="dad" /> {u('welcome.khalid.t')}</b><span>{u('welcome.khalid.d')}</span></button>
          </div>
          <p className={c('mut sm')}>{u('welcome.more')}</p>
        </div>
      </div>
    )
  }
  const groups = stageGroups(snap.feed)
  const cur = groups.pop()?.items ?? []
  const mode = j.stage ? STAGE_MODE[j.stage] : 'ind'
  const k = j.person
  return (
    <div className={c('now')} id="fh-now" aria-live="polite">
      {snap.emergency && (
        <div className={c('embar')} role="alert"><i /><b>{u('em.title')}</b><span>{u('em.text', { name: raw(`people.${k}.name`) })}</span></div>
      )}
      <StageHead snap={snap} mode={mode} />
      {!PEOPLE[k].child && <SyncBox snap={snap} />}
      <FeedItems snap={snap}>
        {/* Earlier stages stay readable: folded above the current one (the newer prototype only showed the current stage). */}
        {groups.map((g) => g.stage && (
          <details key={g.id} className={c('past', STAGE_MODE[g.stage])} id={`fh-past-${g.stage}`}>
            <summary>{u('nowh.past', { stage: raw(`stages.${g.stage}.title`), n: g.items.filter((m) => m.kind !== 'hand').length })}</summary>
            <div className={c('pastItems')}>{g.items.map((m) => <Item key={m.id} m={m} snap={snap} t={t} />)}</div>
          </details>
        ))}
        {cur.map((m) => <Item key={m.id} m={m} snap={snap} t={t} />)}
      </FeedItems>
    </div>
  )
}

/** The feed cut at each stage marker; the last group is the current stage. */
function stageGroups(feed: FeedItem[]) {
  const out: { id: number; stage: StageId | null; items: FeedItem[] }[] = [{ id: -1, stage: null, items: [] }]
  for (const m of feed) {
    if (m.kind === 'stage') out.push({ id: m.id, stage: m.stage, items: [m] })
    else out[out.length - 1].items.push(m)
  }
  if (out.length > 1 && !out[0].items.length) out.shift()
  return out
}

/** One stage header (newer prototype): the stage title, the person, and "What happens here" folded in (open on the first stage). */
function StageHead({ snap, mode }: { snap: Snapshot; mode: string }) {
  const { u, raw } = useTexts()
  const j = snap.journey!
  const k = j.person, name = raw(`people.${k}.name`), st = j.stage
  const title = st ? raw(`stages.${st}.title`) : ''
  return (
    <div className={c('nowh', mode)}>
      <div className={c('nwt')}>
        <b>{j.done ? u('note.done', { title }) : title}</b>
        <span className={c('who')}><E n={PEOPLE[k].icon} /> {raw(`people.${k}.full`)}</span>
      </div>
      {st && (
        <details className={c('nwd')} key={`${st}-${!!j.done}`} open={j.seen.length <= 1 && !j.done ? true : undefined}>
          <summary>{u(j.done ? 'nowh.did' : 'nowh.what')}{!j.done && <> · <span className={c('you')}><E n="point-right" /> {raw(`stages.${st}.you`, { name })}</span></>}</summary>
          <p>{raw(`stages.${st}.body`, { name })}</p>
        </details>
      )}
    </div>
  )
}

/**
 * The feed's own scroll area: it follows new messages unless the viewer scrolled up (prototype FOLLOW), and a new journey
 * follows again.
 */
function FeedItems({ snap, children }: { snap: Snapshot; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const last = useRef(0)
  const journeyNo = snap.gov.journeys
  useLayoutEffect(() => { feedScroll.follow = true }, [journeyNo])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !feedScroll.follow) return
    // Glide to the newest message instead of jumping (jsdom has no scrollTo; reduced motion jumps).
    // A new item taller than the scroll area (the pathway card) shows from its top, not its bottom.
    const lastEl = el.lastElementChild as HTMLElement | null
    const top = lastEl ? el.scrollTop + lastEl.getBoundingClientRect().top - el.getBoundingClientRect().top : el.scrollHeight
    const end = el.scrollHeight - el.clientHeight
    const want = lastEl && lastEl.offsetHeight > el.clientHeight ? Math.min(end, top) : end
    if (Math.abs(want - el.scrollTop) <= 1) return
    if (want < end) { feedScroll.follow = false; el.scrollTo?.({ top: want, behavior: reducedMotion() ? 'auto' : 'smooth' }); last.current = want; return }
    const gap = end - el.scrollTop
    if (gap <= 1) return
    if (typeof el.scrollTo === 'function' && !reducedMotion() && gap < 900) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    else { el.scrollTop = el.scrollHeight; last.current = el.scrollTop }
  })
  return (
    <div className={c('items')} ref={ref} data-feed="" onScroll={(ev) => {
      // Only scrolling up stops the follow (a smooth glide down passes through mid positions); back near the end follows again.
      const t = ev.currentTarget, near = t.scrollHeight - t.scrollTop - t.clientHeight < 48
      if (near) feedScroll.follow = true
      else if (t.scrollTop < last.current - 2) feedScroll.follow = false
      last.current = t.scrollTop
    }}>
      {children}
    </div>
  )
}
export const STAGE_MODE = { detect: 'ind', protect: 'ind', home: 'ind', pathway: 'gov', referral: 'hosp' } as const

/* ---------------------------------------------------------------- one feed item */
export function Item({ m, snap, t, compact }: { m: FeedItem; snap: Snapshot; t: Texts; compact?: boolean }) {
  const { u, x, raw } = t
  const name = (k: PersonId) => raw(`people.${k}.name`)
  switch (m.kind) {
    case 'stage':
      return compact ? <div className={c('hst', STAGE_MODE[m.stage])}>{raw(`stages.${m.stage}.name`)}</div> : null
    case 'sys':
      // The AI's own lines carry the No One Alone logo, never a robot.
      return <div className={c('sys')}>{m.icon === 'bot' ? <span className={c('sysLg')} aria-hidden="true"><AgentOrb size={16} /></span> : <E n={m.icon} />} {x(m.text)}</div>
    case 'me':
      return (
        <div className={c('me')}><div className={c('bub')}><small>{x(m.who)}</small>{x(m.text)}{m.chip && <span className={c('und')}>{x(m.chip)}</span>}</div></div>
      )
    case 'hand': {
      const fd = domainOf(m.from), td = domainOf(m.to), same = fd === td
      const ag = (a: AgentId) => raw(`agents.${a}.name`)
      const fromTxt = m.from === 'orch' ? ag(m.from) : same ? u('hand.sameFrom', { dom: raw(`domains.${fd}.name`), agent: ag(m.from) }) : u('hand.from', { dom: u(`dom.${fd}`), agent: ag(m.from) })
      const toTxt = same ? ag(m.to) : u('hand.from', { dom: u(`dom.${td}`), agent: ag(m.to) })
      const ruleTxt = raw(`rules.${m.rule}`)
      return (
        <details className={c('hand')}>
          <summary>
            <span className={c('hd', domClass(fd))}><E n={DOMAINS[fd].icon} /> {fromTxt}</span>
            <b className={c('ar')} aria-hidden="true">{t.lang === 'ar' ? '←' : '→'}</b>
            <span className={c('hd', domClass(td))}>{!same && <><E n={DOMAINS[td].icon} /> </>}{toTxt}</span>
            <em className={c('rule')} title={ruleTxt}>{u('hand.rule', { rule: m.rule })}</em>
            <span className={c('hr')}>{x(m.reason)}</span>
          </summary>
          <div className={c('pkt')}>{m.packet.map((p, i) => <span key={i}><b>{x(p.label)}</b> {valOf(p.value, x)}</span>)}</div>
          <p className={c('mut sm')}><E n="conductor" /> {u('hand.checked', { rule: m.rule, text: ruleTxt })}</p>
        </details>
      )
    }
    case 'agent': return <AgentMsg m={m} snap={snap} t={t} compact={compact} />
    case 'card': {
      if (compact) return <div className={c('sys')}>→ {m.picked ? x(m.picked) : u('card.waiting')}</div>
      return <CardView m={m} snap={snap} t={t} />
    }
    case 'pattern': return <Pattern m={m} t={t} />
    case 'push':
      return (
        <div className={c('push')}><E n="bell" className={c('pi3')} /><div><small>{u('push.to', { to: x(m.to) })}</small><b>{x(m.text)}</b><em>{x(m.why)}</em></div></div>
      )
    case 'famw': return <FamTable rows={m.rows} k={m.person} t={t} />
    case 'flags':
      return (
        <div className={c('flags')}>
          <span className={c('lab')}>{u('flags.lab', { name: name(m.person) })}</span>
          {m.note && <p className={c('mut sm')}>{x(m.note)}</p>}
          {m.flags.map((f, i) => (
            <div key={i} className={c('flag', f.lvl)}>
              <div className={c('fh')}><b>{x(f.title)}</b><span className={c('rule')}>{f.rule}</span></div>
              <ul>{f.factors.map((y, j) => <li key={j}>{x(y)}</li>)}</ul>
              <div className={c('fs')}><span><E n="map-pin" /> {x(f.src)}</span><span className={c('gCert')}>{x(f.cert)}</span></div>
            </div>
          ))}
        </div>
      )
    case 'vtplan':
      return (
        <div className={c('vtp')}>
          <span className={c('lab')}>{u('vt.plan', { name: name(m.person) })}</span>
          <div className={c('vtg')}>
            {m.use.map((y) => (
              <div key={y.id} className={c('vt on')}><span><E n={VT[y.id].icon} /></span><div><b>{raw(`vt.${y.id}.name`)}</b><small>{x(y.why)}</small><small className={c('ev')}>{u('vt.ev', { tool: raw(`vt.${y.id}.tool`), ev: raw(`vt.${y.id}.ev`) })}</small></div></div>
            ))}
          </div>
          <details>
            <summary>{u('vt.notUsed', { n: m.skip.length })}</summary>
            {m.skip.map((y) => <div key={y.id} className={c('vt')}><span><E n={VT[y.id].icon} /></span><div><b>{raw(`vt.${y.id}.name`)}</b><small>{x(y.why)}</small></div></div>)}
          </details>
        </div>
      )
    case 'vtres':
      if (!m.results.length) return null
      return (
        <div className={c('vtp')}>
          <span className={c('lab')}>{u('vt.res')}</span>
          {m.results.map((y) => <div key={y.test} className={c('vt on')}><span><E n={VT[y.test].icon} /></span><div><b>{raw(`vt.${y.test}.name`)}</b><small><em className={c(y.lvl)}>{x(y.txt)}</em></small></div></div>)}
        </div>
      )
    case 'path': return <PathView m={m} snap={snap} t={t} />
    case 'done':
      return (
        <div className={c('fin')}>
          <b>✓ {x(m.text)}</b>
          {!compact && <div className={c('btnrow')}><button type="button" className={c('btn')} onClick={() => getEngine().clearJourney()}>{u('done.again')}</button></div>}
        </div>
      )
  }
}

/* ---------------------------------------------------------------- agent bubble */
function AgentMsg({ m, snap, t, compact }: { m: Extract<FeedItem, { kind: 'agent' }>; snap: Snapshot; t: Texts; compact?: boolean }) {
  const { u, x, raw } = t
  const { say } = usePanel()
  const d = domainOf(m.agent)
  const src = m.source ? { live: 'live', prepared: 'prep', fixed: 'fix', guardrail: 'grd' }[m.source] : null
  const live = m.source === 'live' && typeof m.text === 'string'
  // The words follow the "Noa speaks" switch: live text in the language it was written in, prepared and fixed text in the language
  // chosen now (both languages are prepared), so switching to Arabic changes what Noa says at once.
  const speak = live ? m.lang : snap.lang
  const xs = useSpokenText(speak)
  const rtl = speak === 'ar' ? { dir: 'rtl' as const, lang: 'ar' } : {}
  return (
    <div className={c('msg', d)}>
      <span className={c('av')}><E n={DOMAINS[d].icon} /></span>
      <div className={c('mb')}>
        <div className={c('mh')}>
          <b>{raw(`domains.${d}.name`)}</b>
          <span className={c('skill')}><E n={AGENTS[m.agent].icon} /> {u('agent.skill', { name: raw(`agents.${m.agent}.name`), role: raw(`agents.${m.agent}.role`) })}</span>
          {m.audience && <span className={c('mt', m.mode === 'sys' ? 'ind' : m.mode)}>{x(m.audience)}</span>}
          {!m.typing && src && <span className={c('src', src)}>{u(`agent.src.${m.source}`)}</span>}
          {!m.typing && m.text && !compact && (
            <button type="button" className={c('say')} aria-label={u('agent.say')} onClick={() => say(xs(m.text), speak)}><E n="volume-2" /></button>
          )}
        </div>
        {m.typing
          ? <div className={c('typing')}><i /><i /><i /> <span>{u(snap.thinking ? 'agent.thinking' : 'agent.writing')}</span></div>
          : <div className={c('tx')} {...rtl}>{xs(m.text)}</div>}
        {m.note && !compact && <div className={c('note')}>{x(m.note)}</div>}
        {m.why && !m.typing && !compact && <div className={c('why')}>{x(m.why)}</div>}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- live wearables */
/** The simulated wearable stream: a seeded noise source (the repo keeps Math.random out of the UI) and a monotonic clock. */
const tick = () => (typeof performance !== 'undefined' ? performance.now() : 0)
const noise = rnd(hsh('noa-sync') * 97 + 1)
const SY: { hr: number[]; last: number } = { hr: [], last: tick() }
export function syncTick(target: number, irr: boolean) {
  const last = SY.hr.length ? SY.hr[SY.hr.length - 1] : target
  SY.hr.push(Math.round(last + (target - last) * 0.45 + (noise() - 0.5) * (irr ? 14 : 4)))
  if (SY.hr.length > 40) SY.hr.shift()
  SY.last = tick()
}
function SyncBox({ snap }: { snap: Snapshot }) {
  const { u, raw } = useTexts()
  const j = snap.journey!
  const k = j.person, p = snap.profiles[k]
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(SY.last)
  useEffect(() => { const iv = setInterval(() => setNow(tick()), 1000); return () => clearInterval(iv) }, [])
  // A new journey (or another person) starts the stream again, as the prototype does in startJourney (SY.hr = []).
  const journeyNo = snap.gov.journeys
  useEffect(() => { SY.hr = []; SY.last = tick() }, [k, journeyNo])
  if (isChild(p)) return null
  const wake = !!j.urgent && j.urgent.startsWith('G')
  const usual = PEOPLE[k].usual ?? [62, 72]
  // Newer prototype (syncVals): the recorded heart rate; the stream's last value only while it is near it (a slider jump shows at once).
  const hr = p.hr || Math.round((usual[0] + usual[1]) / 2)
  const irr = wake && p.irr
  const last = SY.hr.length ? SY.hr[SY.hr.length - 1] : null
  const shown = last != null && Math.abs(last - hr) < 15 ? last : hr
  const ago = Math.max(1, Math.round((now - SY.last) / 1000))
  const devs = DEVICES_OF(k)
  const W = 110, H = 26, pts = SY.hr.slice(-24), mx = Math.max(130, ...pts, hr), mn = Math.min(50, ...pts)
  const spark = pts.length > 1 ? (
    <svg viewBox={`0 0 ${W} ${H}`} className={c('spark')} aria-hidden="true"><polyline points={pts.map((y, i) => `${(i * (W / 23)).toFixed(1)},${(H - 2 - ((y - mn) / (mx - mn)) * (H - 4)).toFixed(1)}`).join(' ')} /></svg>
  ) : null
  const val = (v: string) => v === 'hr' ? <><span className={c('gHeart')} />{u('sync.hr', { n: shown })}{irr ? u('sync.irr') : ''}</>
    : v === 'bp' ? u('sync.bp', { sbp: p.sbp, dbp: p.dbp }) : v === 'wt' ? u('sync.wt', { bmi: p.bmi }) : u('sync.glu', { glu: k === 'saeed' ? 6.8 : '—' })
  return (
    <div className={c('sync')} id="fh-sync">
      <div className={c('syr')}>
        <span className={c('lv')} title={u('sync.sim')}><i />{u('sync.liveAgo', { n: ago })}</span>
        {devs.map((d, i) => (
          <span key={i} className={c('dch', d.value === 'hr' && hr >= 120 && 'hot')} title={`${raw(`devices.kind.${d.kind}`)}: ${raw(`devices.what.${d.what}`)}`}>
            <span className={c('dv')}><E n={d.icon} /></span>
            <span className={c('dn')}>{raw(`devices.kind.${d.kind}`)}</span>
            <b className={c('val')}>{val(d.value)}</b>
            {d.value === 'hr' && spark}
          </span>
        ))}
      </div>
      <details className={c('path')} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary>{u('sync.how')}</summary>
        <ol>
          <li><E n="watch" /> {u('sync.s1')}</li>
          <li><E n="smartphone" /> {u('sync.s2')}</li>
          <li><E n="link" /> {u('sync.s3')}</li>
          <li><E n="lock-key" /> {u('sync.s4')}</li>
          <li><E n="home" /> {u('sync.s5', { name: raw(`people.${k}.name`) })}</li>
        </ol>
      </details>
    </div>
  )
}
const DEVICES_OF = (k: PersonId) => DEVICES[k] ?? []

/* ---------------------------------------------------------------- pattern sparklines */
const PAT_ICON = { hr: 'heart', bp: 'stethoscope', glu: 'droplet', wt: 'scale', steps: 'footprints' } as const
function Spark({ card, label }: { card: PatternCard; label: string }) {
  const vals = card.values, [lo, hi] = card.band
  const W = 240, H = 64, mn = Math.min(lo, ...vals) - 2, mx = Math.max(hi, ...vals) + 2
  const X = (i: number) => 4 + (i * (W - 8)) / (vals.length - 1), Y = (v: number) => H - 6 - ((v - mn) / (mx - mn)) * (H - 12)
  const last = vals.length - 1, out = card.flagFrom != null
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={c('pt')} role="img" aria-label={label}>
      <rect x="0" y={Y(hi)} width={W} height={Math.max(2, Y(lo) - Y(hi))} className={c('band')} />
      {card.split != null && <line x1={X(card.split)} x2={X(card.split)} y1="0" y2={H} className={c('split')} />}
      <polyline points={vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')} className={c('ln')} />
      {out && <polyline points={vals.slice(card.flagFrom!).map((v, i) => `${X(i + card.flagFrom!).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')} className={c('ln bad')} />}
      <circle cx={X(last)} cy={Y(vals[last])} r="3.5" className={c(out ? 'bad' : 'ok')} />
    </svg>
  )
}
function Pattern({ m, t }: { m: Extract<FeedItem, { kind: 'pattern' }>; t: Texts }) {
  const { u, x, raw } = t
  const name = raw(`people.${m.person}.name`)
  return (
    <div className={c('patw')}>
      <span className={c('lab')}>{u('pattern.lab', { name })}</span>
      <div className={c('patg')}>
        {m.cards.map((cd) => (
          <div key={cd.id} className={c('pc', cd.hot && 'hot')}>
            <b><E n={PAT_ICON[cd.id]} /> {x(cd.title)}</b>
            <Spark card={cd} label={u(`pattern.aria.${cd.id}`)} />
            <small>{x(cd.caption)}</small>
            <span>{cd.statusTone ? <b className={c(cd.statusTone)}>{x(cd.status)}</b> : x(cd.status)}</span>
          </div>
        ))}
      </div>
      <p className={c('mut sm')}>{u('pattern.foot', { name })}</p>
    </div>
  )
}

/* ---------------------------------------------------------------- family health record table */
export function FamTable({ rows, k, t, compact }: { rows: Extract<FeedItem, { kind: 'famw' }>['rows']; k: PersonId; t: Texts; compact?: boolean }) {
  const { u, x, raw } = t
  const name = raw(`people.${k}.name`)
  if (!rows.length) return <p className={c('mut')}>{u('famw.none')}</p>
  return (
    <div className={c('famw')}>
      {!compact && <span className={c('lab')}>{u('famw.lab', { name })}</span>}
      <div className={c('tw')}>
        <table>
          <thead><tr><th>{u('famw.rel')}</th><th>{u('famw.cond')}</th><th>{u('famw.src')}</th><th>{u('famw.eff', { name })}</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={c(r.eff ? 'on' : 'off')}>
                <td><b>{x(r.relLabel)}</b>{r.who && x(r.who) !== x(r.relLabel) ? ` · ${x(r.who)}` : ''}<small>{u(r.deg === 1 ? 'famw.deg1' : 'famw.deg2')}</small></td>
                <td>{r.onset != null ? u('famw.at', { cond: x(r.cond), n: r.onset }) : x(r.cond)}</td>
                <td><small>{x(r.src)}</small></td>
                <td>{r.eff ? <E n="circle-check" /> : '–'} {x(r.rule)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!compact && <p className={c('mut sm')}><E n="circle-check" /> {u('famw.foot')}</p>}
    </div>
  )
}

/* ---------------------------------------------------------------- pathway */
function PathView({ m, snap, t }: { m: Extract<FeedItem, { kind: 'path' }>; snap: Snapshot; t: Texts }) {
  const { u, x, raw } = t
  const name = raw(`people.${m.person}.name`)
  const due = (id: keyof typeof URGENCY) => x(dueBy(id, snap.clock))
  return (
    <div className={c('pathw')}>
      {m.note && <p className={c('mut sm')}>{x(m.note)}</p>}
      <div className={c('pcols')}>
        <div className={c('pcol pp')}>
          <span className={c('lab')}>{u('path.pp')}</span>
          {m.path.pop.length ? m.path.pop.map((y, i) => (
            <div key={y.id} className={c('pi2')}>
              <div className={c('ph')}><b>{u('path.item', { n: i + 1, name: x(y.name) })}</b><em className={c(y.st === 'overdue' ? 'bad' : 'warn')}>{u(`path.st.${y.st}`)}</em></div>
              <div className={c('urg', URGENCY[y.u].tone)}><E n="timer" /> {u('path.urg', { u: raw(`urgency.${y.u}`), due: due(y.u) })}</div>
              <div className={c('pr')}><E n="book-blue" /> {u('path.guide', { t: x(y.rule) })}</div>
              <div className={c('pr')}><E n="bust" /> {u('path.for', { name, t: x(y.you) })}</div>
              <div className={c('pr')}><E n="map-pin" /> {x(y.where)} · <E n="clock" /> {x(y.when)}</div>
            </div>
          )) : <p className={c('mut')}>{u('path.nonePp')}</p>}
        </div>
        <div className={c('pcol cd')}>
          <span className={c('lab')}>{u('path.cd')}</span>
          {m.path.clin.length ? m.path.clin.map((y, i) => (
            <div key={i} className={c('pi2')}>
              <b><E n="clinic" /> {x(y.t)}</b>
              <div className={c('urg', URGENCY[y.u].tone)}><E n="timer" /> {u('path.urgCd', { u: raw(`urgency.${y.u}`), due: due(y.u) })}</div>
              <div className={c('pr')}>{x(y.why)}</div>
            </div>
          )) : <p className={c('mut')}>{u('path.noneCd')}</p>}
        </div>
      </div>
      <p className={c('mut sm')}>{u('path.foot')}</p>
    </div>
  )
}

/* ---------------------------------------------------------------- "Your turn" cards */
function CardView({ m, snap, t }: { m: Extract<FeedItem, { kind: 'card' }>; snap: Snapshot; t: Texts }) {
  const { u, x } = t
  const card = m.card
  if (card.type === 'speech') return <SpeechCheck card={card} open={m.open} snap={snap} t={t} />
  if (!m.open) {
    return <div className={c('cardx closed')}><span className={c('lab')}>{x(card.who)}</span><div className={c('pick')}>→ {m.picked ? x(m.picked) : ''}</div></div>
  }
  return (
    <div className={c('cardx open ind')} data-card={card.id}>
      <span className={c('lab')}>{u('card.turn', { who: x(card.who) })}</span>
      <CardBody card={card} snap={snap} t={t} />
    </div>
  )
}
function CardBody({ card, snap, t }: { card: Card; snap: Snapshot; t: Texts }) {
  const { u, x, raw, lang } = t
  const { say } = usePanel()
  const e = getEngine()
  if (card.type === 'go') {
    return (
      <>
        <p className={c('q')}>{card.urgent && <><E n="bell" /> </>}{x(card.msg)}</p>
        <div className={c('btnrow')}>
          {card.opts.map((o, i) => <button type="button" key={o.id} className={c('btn', i > 0 && 'ghost')} data-go={o.id} onClick={() => answerGo(card.id, o.id as 'go' | 'later')}>{x(o.label)}</button>)}
        </div>
      </>
    )
  }
  if (card.type === 'choice') {
    return (
      <>
        <p className={c('q')}>{x(card.q)}</p>
        <div className={c('opts')}>{card.opts.map((o) => <button type="button" key={o.id} className={c('opt')} onClick={() => e.answer(card.id, o.id)}>{x(o.label)}</button>)}</div>
        {card.free && <p className={c('mut sm')}>{u('card.free')}</p>}
      </>
    )
  }
  if (card.type === 'protect') {
    const rel = (k: PersonId) => { const r = raw(`people.${k}.rel`); return lang === 'ar' ? r : r.toLowerCase() }
    return (
      <>
        <p className={c('q')}>{u('card.protect.q')}</p>
        <div className={c('plan')}>
          <span className={c('mut sm')}>{u('card.protect.data')}</span>
          <label className={c('pi')}><input type="checkbox" checked disabled /> <E n="watch" /> {u('card.protect.wear')}</label>
          <label className={c('pi')}><input type="checkbox" checked disabled /> <E n="fh-hospital" /> {u('card.protect.clinic')}</label>
          <label className={c('pi')}><input type="checkbox" checked disabled /> <E n="tree" /> {u('card.protect.family')}</label>
          {card.genomic && (
            <label className={c('pi')}><input type="checkbox" checked={card.gen} onChange={(ev) => e.updateCard(card.id, { gen: ev.target.checked })} /> <E n="dna" /> {u('card.protect.genomic')}</label>
          )}
          <span className={c('mut sm')}>{u('card.protect.who')}</span>
          {card.contacts.length ? card.contacts.map((k) => (
            <label key={k} className={c('pi')}>
              <input type="checkbox" checked={card.sel.includes(k)} onChange={(ev) => e.updateCard(card.id, { sel: ev.target.checked ? [...card.sel, k] : card.sel.filter((y) => y !== k) })} />
              {' '}<E n={PEOPLE[k].icon} /> {u('card.protect.contact', { name: raw(`people.${k}.name`), rel: rel(k) })}
            </label>
          )) : <p className={c('mut')}>{u('card.protect.noAdults')}</p>}
        </div>
        <button type="button" className={c('btn')} onClick={() => e.answer(card.id, { genomic: card.gen, contacts: card.sel.slice() })}>{u('card.confirm')}</button>
      </>
    )
  }
  if (card.type === 'qset') {
    const v = card.vals
    return (
      <>
        <p className={c('q')}><E n={VT[card.test].icon} /> {raw(`vt.${card.test}.name`)} <span className={c('mut sm')}>{u('card.qset.tool', { tool: raw(`vt.${card.test}.tool`) })}</span></p>
        <div className={c('qs')}>
          {card.items.map((i) => {
            if (i.kind === 'auto') {
              const a = i.auto
              const shown = typeof a === 'number' ? (a ? `+${a}` : '0') : u(a ? 'card.qset.autoYes' : 'card.qset.autoNo')
              return <div key={i.id} className={c('qi auto')}><span>{x(i.label)}</span><em>{u('card.qset.auto', { v: shown })}</em></div>
            }
            const label = x(i.label)
            if (i.kind === 'phq') {
              return (
                <div key={i.id} className={c('qi')}><span>{label}</span>
                  <div className={c('seg')} role="group" aria-label={label}>{[0, 1, 2, 3].map((n) => (
                    <button type="button" key={n} aria-pressed={Number(v[i.id] ?? 0) === n} onClick={() => e.updateCard(card.id, { vals: { [i.id]: n } })}>{raw(`qs.phqScale.${n}`)}</button>
                  ))}</div>
                </div>
              )
            }
            return (
              <div key={i.id} className={c('qi')}><span>{label}</span>
                <div className={c('seg')} role="group" aria-label={label}>
                  <button type="button" aria-pressed={!!v[i.id]} onClick={() => e.updateCard(card.id, { vals: { [i.id]: true } })}>{u('card.qset.yes')}</button>
                  <button type="button" aria-pressed={!v[i.id]} onClick={() => e.updateCard(card.id, { vals: { [i.id]: false } })}>{u('card.qset.no')}</button>
                </div>
              </div>
            )
          })}
        </div>
        <button type="button" className={c('btn')} onClick={() => e.answer(card.id, card.vals)}>{u('card.done')}</button>
      </>
    )
  }
  if (card.type === 'din') {
    return (
      <>
        <p className={c('q')}><E n="ear" /> {u('card.din.q')} <span className={c('mut sm')}>{u('card.din.hint')}</span></p>
        <div className={c('qs')}>
          {card.rounds.map((r, i) => (
            <div key={i} className={c('qi')}><span>{u('card.din.round', { n: i + 1, noise: x(r.noise) })}</span>
              <div className={c('din')}>
                <button type="button" className={c('btn ghost sm gPlay')} onClick={() => say(r.digits, snap.lang)}>{u('card.din.play')}</button>
                <input inputMode="numeric" maxLength={3} value={card.answers[i] ?? ''} aria-label={u('card.din.aria', { n: i + 1 })}
                  onChange={(ev) => { const a = card.answers.slice(); a[i] = ev.target.value; e.updateCard(card.id, { answers: a }) }} />
              </div>
            </div>
          ))}
        </div>
        <p className={c('mut sm')}>{u('card.din.foot')}</p>
        <button type="button" className={c('btn')} onClick={() => e.answer(card.id, card.answers)}>{u('card.done')}</button>
      </>
    )
  }
  return null
}

/* ---------------------------------------------------------------- Noa Speech Check */
function Wave({ ws, off, gap }: { ws: string[]; off?: boolean; gap?: boolean }) {
  return (
    <>
      {ws.map((w, i) => {
        const n = Math.max(4, Math.min(12, Math.round(w.length * 1.4 + 2))), h = hsh(w + i)
        const bars = Array.from({ length: n }, (_, xx) => (off ? 18 + ((h * (xx + 3)) % 22) : 30 + Math.round(55 * Math.abs(Math.sin(((xx + 1) * ((h % 7) + 2)) / n * Math.PI)))))
        return <span key={i} className={c('ww', off && 'off', gap && 'gap')}><span className={c('bars')}>{bars.map((b, j) => <i key={j} style={{ height: `${b}%` }} />)}</span><small>{w}</small></span>
      })}
    </>
  )
}
/** Speech-check cards that already started by themselves (once per card, also under React's double effects). */
const autoSpoken = new Set<number>()
/** Automated browsers (tests) never open the microphone by themselves. */
const automated = () => typeof navigator !== 'undefined' && !!(navigator as Navigator & { webdriver?: boolean }).webdriver

function SpeechCheck({ card, open, snap, t }: { card: Extract<Card, { type: 'speech' }>; open: boolean; snap: Snapshot; t: Texts }) {
  const { u, raw } = t
  const { listening, liveText, micMsg, startSpeechCheck, stopListen } = usePanel()
  const busy = listening === 'prompt' || listening === 'speech'
  // Like the night alert: when the card opens, Noa reads the sentence and the microphone opens by itself (no click needed).
  // "Speak it" stays for another try. Answering the card another way (a sample, typing, Next) stops listening.
  useEffect(() => {
    if (!open || card.result || !canDictate() || automated()) return
    const id = setTimeout(() => { if (autoSpoken.has(card.id)) return; autoSpoken.add(card.id); startSpeechCheck() }, 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card.id])
  useEffect(() => { if (!open && busy) stopListen() }, [open, busy, stopListen])
  const e = getEngine()
  const k = card.person, nm = raw(`people.${k}.name`), his = PEOPLE[k].sex === 'M'
  const b = SPEECH_BASE[k] ?? SPEECH_BASE_DEFAULT
  const lang = snap.lang, sentence = SENTENCE[lang], ws = sentence.split(' ')
  const r = card.result
  const fx = (n: number, d: number) => n.toFixed(d)
  let today: Record<string, string> | null = null
  if (r) {
    const said = (r.said || '').split(/\s+/).filter((y) => y && !/^…$/.test(y)), nw = said.length
    today = {
      clar: fx(r.score, 2),
      wpm: r.secs ? u('spx.wpmV', { n: Math.round((nw / r.secs) * 60) }) : '—',
      pause: r.secs && nw > 1 ? u('spx.pauseV', { n: fx(Math.max(0.1, (r.secs - nw * 0.3) / (nw - 1)), 2) }) : '—',
      words: u('spx.wordsV', { m: r.matched, n: r.total }),
      steady: u(`spx.steadyV.${r.lvl}`),
    }
  }
  const lv = r ? ({ green: 'good', amber: 'warn', red: 'bad', none: 'bad' } as const)[r.lvl] : 'ready'
  const cell = (key: string) => {
    if (!today || !r) return <td>—</td>
    const v = today[key]
    let cl = 'good'
    if (key === 'clar') cl = r.score >= b.clar - 0.12 ? 'good' : r.score >= 0.6 ? 'warn' : 'bad'
    if (key === 'words') cl = r.matched === r.total ? 'good' : r.matched >= r.total - 2 ? 'warn' : 'bad'
    if (key === 'steady') cl = r.lvl === 'green' ? 'good' : r.lvl === 'amber' ? 'warn' : 'bad'
    if (key === 'wpm' && v !== '—') { const n = parseInt(v); cl = n >= b.wpm * 0.7 ? 'good' : n >= b.wpm * 0.5 ? 'warn' : 'bad' }
    if (key === 'pause' && v !== '—') { const n = parseFloat(v); cl = n <= b.pause * 2 ? 'good' : n <= b.pause * 3.5 ? 'warn' : 'bad' }
    return <td className={c(cl)}>{v}</td>
  }
  const norm = (w: string) => words(w, lang).join('')
  const saidW = r ? (r.said || '').split(/\s+/).filter(Boolean) : []
  const sentEl = <b {...(lang === 'ar' ? { dir: 'rtl', lang: 'ar' } : {})}>“{sentence}”</b>
  const dict = canDictate()
  return (
    <div className={c('spx', open && 'open')} data-card={open ? card.id : undefined}>
      <div className={c('sxh')}>
        <span className={c('orb')} />
        <b>{u('spx.title')}</b>
        <span className={c('core')}>{u(snap.journey?.urgent ? 'spx.core' : 'spx.coreRecovery')}</span>
        <span className={c('sub')}>{u('spx.sub', { name: nm })}</span>
        <span className={c('pill', lv)}>● {r ? u(`spx.lvl.${r.lvl}`) : u('spx.ready', { n: b.chats })}</span>
      </div>
      <div className={c('sxg')}>
        <div className={c('sxl')}>
          <div className={c('box')}>
            <div className={c('bl')}><b>{u(his ? 'spx.normalHis' : 'spx.normalHer')}</b><small>{u('spx.base')}</small></div>
            <div className={c('wv')} {...(lang === 'ar' ? { dir: 'rtl' } : {})}><Wave ws={ws} /></div>
          </div>
          <div className={c('box')}>
            <div className={c('bl')}><b>{u(card.retry ? 'spx.second' : 'spx.today')}</b><small>{r ? (r.secs ? u('spx.secs', { n: fx(r.secs, 1) }) : u('spx.typed')) : '—'}</small></div>
            <div className={c('tb')}>
              {r ? (
                <>
                  <div className={c('wv')} {...(lang === 'ar' ? { dir: 'rtl' } : {})}>
                    {saidW.map((w, i) => <Wave key={i} ws={[w]} off={r.lvl !== 'green' && (w === '…' || !ws.some((y) => wordEq(norm(y), norm(w))))} gap={w === '…'} />)}
                  </div>
                  <p className={c('said')}>“{r.said || '…'}”{r.secs ? u('spx.saidSecs', { n: fx(r.secs, 1) }) : u('spx.saidTyped')}</p>
                </>
              ) : (
                <>
                  <p className={c('runs')}>{u(his ? 'spx.runsHim' : 'spx.runsHer', { name: nm })}</p>
                  {open && (
                    <>
                      <div className={c('btnrow')}>
                        {dict && (listening === 'prompt'
                          ? <><button type="button" className={c('btn ghost sm gStop')} onClick={stopListen}>{u('spx.stop')}</button><span className={c('mut')} role="status">{u('spx.noaSays')}</span></>
                          : listening === 'speech'
                            ? <><button type="button" className={c('btn rec gStop')} onClick={stopListen}>{u('spx.done')}</button><span className={c('mut')} role="status">{liveText || u('spx.listening')}</span><span className={c('take')} aria-hidden="true" /></>
                            : <button type="button" className={c('btn')} onClick={startSpeechCheck}><E n="mic-studio" /> {u('spx.speak')}</button>)}
                        <button type="button" className={c('btn ghost sm')} onClick={() => e.useSample('usual')}>{u('spx.usual', { name: nm })}</button>
                        <button type="button" className={c('btn ghost sm')} onClick={() => e.useSample('unclear')}>{u('spx.unclear')}</button>
                        <button type="button" className={c('btn ghost sm')} onClick={() => e.useSample('slurred')}>{u('spx.slurred')}</button>
                      </div>
                      {micMsg && <p className={c('hint')} role="status">{micMsg}</p>}
                      {listening === 'speech' && <p className={c('hint')}>{u('spx.takeTime')}</p>}
                      <p className={c('hint')}>{dict ? '' : u('spx.noMic')}{u('spx.say')}{sentEl}</p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <table className={c('sxt')}>
          <thead><tr><th>{u('spx.m.measure')}</th><th>{u(his ? 'spx.normalHis' : 'spx.normalHer')}</th><th>{u('spx.m.today')}</th></tr></thead>
          <tbody>
            <tr><td>{u('spx.m.clar')}</td><td>{fx(b.clar, 2)}</td>{cell('clar')}</tr>
            <tr><td>{u('spx.m.wpm')}</td><td>{u('spx.wpmV', { n: b.wpm })}</td>{cell('wpm')}</tr>
            <tr><td>{u('spx.m.pause')}</td><td>{u('spx.pauseV', { n: fx(b.pause, 2) })}</td>{cell('pause')}</tr>
            <tr><td>{u('spx.m.words')}</td><td>{u('spx.wordsV', { m: ws.length, n: ws.length })}</td>{cell('words')}</tr>
            <tr><td>{u('spx.m.steady')}</td><td>{u('spx.steadyV.green')}</td>{cell('steady')}</tr>
          </tbody>
        </table>
      </div>
      <div className={c('sxc')}>
        <div><E n="headphones" /><p><Bold text={u(his ? 'spx.c1His' : 'spx.c1Her')} /></p></div>
        <div><E n="message-circle" /><p><Bold text={u('spx.c2')} /></p></div>
        <div><E n="chart-column" /><p><Bold text={u(his ? 'spx.c3His' : 'spx.c3Her')} /></p></div>
        <div className={c('r')}><E n="red-circle" /><p><Bold text={u('spx.c4')} /></p></div>
      </div>
      <p className={c('sxf')}>{u('spx.foot')}</p>
    </div>
  )
}
