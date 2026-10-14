import type { OrbitCentre, OrbitNode, OrbitRing } from '@/data/types'
import type { CanvasFonts } from '../fonts'

/**
 * Pure port of the prototype's care-circle `Orbit` (lines 1347–1397): a tilted
 * perspective orbit with depth-sorted ring segments and glossy balls,
 * emergency modes (`check`, `sos` with radar waves) and the help animation
 * driven by `orbEm.set({mode, app, call, hosp, arrived})` (line 1578).
 */

/** `calm` = everyday; `check` = agent checking on her; `sos` = emergency under way. */
export type OrbitMode = 'calm' | 'check' | 'sos'

/** Eased 0..1 emergency progress values. */
export interface OrbitTargets {
  /** David approaching (moves in towards Margaret). */
  app: number
  /** James on the phone / calling 000. */
  call: number
  /** Hospital notified. */
  hosp: number
  /** Help has arrived. */
  arrived: number
}

export interface OrbitOptions {
  /** Names under the balls. */
  labels?: boolean
  /** Second line under each name. */
  subs?: boolean
  tilt?: number
  zoom?: number
  cy?: number
  /** Night palette (the emergency orbit always uses it). Falls back to `body.night`. */
  night?: boolean
}

export interface OrbitSim {
  tilt: number
  mode: OrbitMode
  st: OrbitTargets
  tg: OrbitTargets
  /** Accumulated spin per ring. */
  spin: number[]
  waves: { r: number; a: number }[]
  waveT: number
  /** Current angle per node, by index. */
  ang: number[]
}

const KEYS = ['app', 'call', 'hosp', 'arrived'] as const
const F = 700

export function createOrbitSim(nodes: OrbitNode[], tilt = 0.55): OrbitSim {
  return {
    tilt,
    mode: 'calm',
    st: { app: 0, call: 0, hosp: 0, arrived: 0 },
    tg: { app: 0, call: 0, hosp: 0, arrived: 0 },
    spin: [0, 0, 0],
    waves: [],
    waveT: 0,
    ang: nodes.map((p) => p.angle),
  }
}

/** Prototype `orbit.set(v)`: progress values ease towards their targets; mode/tilt switch at once. */
export function setOrbit(sim: OrbitSim, v: Partial<OrbitTargets> & { mode?: OrbitMode; tilt?: number }): void {
  for (const k of KEYS) if (v[k] != null) sim.tg[k] = v[k]!
  if (v.mode) sim.mode = v.mode
  if (v.tilt != null) sim.tilt = v.tilt
}

/** Prototype pointermove: every ring spins with the drag; a mouse drag also tilts. */
export function dragOrbit(sim: OrbitSim, dx: number, dy: number, mouse: boolean): void {
  for (let i = 0; i < sim.spin.length; i++) sim.spin[i] += dx * 0.012
  if (mouse) sim.tilt = Math.max(0.22, Math.min(1.05, sim.tilt + dy * 0.006))
}

interface Palette {
  ring: string
  halo: string
  core: [string, string, string]
  lab: string
  sub: string
  pool: string
}

function pal(mode: OrbitMode, night: boolean): Palette {
  if (mode === 'sos') return { ring: '255,128,110', halo: 'rgba(239,78,74,.55)', core: ['#ffd0c6', '#ef4e4a', '#8e1c1a'], lab: '#f6eef0', sub: 'rgba(246,238,240,.62)', pool: 'rgba(239,78,74,.22)' }
  if (mode === 'check') return { ring: '255,205,140', halo: 'rgba(255,190,110,.45)', core: ['#ffe7c2', '#f0a24a', '#8a5414'], lab: '#f6eef0', sub: 'rgba(246,238,240,.62)', pool: 'rgba(255,190,110,.18)' }
  return night
    ? { ring: '140,230,210', halo: 'rgba(31,179,156,.45)', core: ['#b9f6e8', '#1fb39c', '#0b5d53'], lab: '#f4f1f6', sub: 'rgba(244,241,246,.62)', pool: 'rgba(120,230,210,.16)' }
    : { ring: '11,127,113', halo: 'rgba(31,179,156,.38)', core: ['#c4f7ea', '#1fb39c', '#0b6157'], lab: '#0d2a2a', sub: '#56706e', pool: 'rgba(255,255,255,.6)' }
}

export interface OrbitHit {
  x: number
  y: number
  r: number
  /** Prototype toast text: `name · sub`. */
  text: string
}

export interface OrbitFrame extends OrbitOptions {
  width: number
  height: number
  dpr: number
  dt: number
  now: number
  reduced: boolean
  dragging: boolean
  fonts: CanvasFonts
}

export interface OrbitSceneInput {
  nodes: OrbitNode[]
  rings: OrbitRing[]
  centre: OrbitCentre
}

/** One `Orbit.frame(dt, now)`: advance the simulation and draw. Returns tap targets. */
export function drawOrbit(ctx: CanvasRenderingContext2D, sim: OrbitSim, scene: OrbitSceneInput, o: OrbitFrame): OrbitHit[] {
  const { width: W, height: H, dt, now, reduced, fonts } = o
  const RINGS = scene.rings
  for (const k of KEYS) sim.st[k] = reduced ? sim.tg[k] : sim.st[k] + (sim.tg[k] - sim.st[k]) * Math.min(1, dt * 3)
  const st = sim.st
  const K = () => Math.min(W / 400, H / (2 * 180 * Math.sin(sim.tilt) + 110)) * (o.zoom || 1)
  const P = (x: number, y: number, z: number) => {
    const c = Math.cos(sim.tilt), s = Math.sin(sim.tilt), k = K(), y2 = y * c - z * s, z2 = y * s + z * c, p = F / (F + z2 * k)
    return { x: W / 2 + x * k * p, y: H * (o.cy || 0.52) + y2 * k * p, z: z2, p }
  }
  const slow = sim.mode === 'calm' ? 1 : 0.3
  const pl = pal(sim.mode, !!o.night)
  const k0 = K()
  if (!reduced && !o.dragging) for (let i = 0; i < RINGS.length; i++) sim.spin[i] = (sim.spin[i] ?? 0) + dt * RINGS[i].speed * slow

  const sans = fonts.sans
  const ball = (x: number, y: number, r: number, c: readonly string[], ini: string, a: number, glow: string | null, ink?: string) => {
    ctx.globalAlpha = a
    if (glow) {
      const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.8)
      g.addColorStop(0, glow)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r * 2.8, 0, 7)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(0,25,24,.16)'
    ctx.beginPath()
    ctx.ellipse(x, y + r * 1.08, r * 0.78, r * 0.2, 0, 0, 7)
    ctx.fill()
    const g2 = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.08, x, y, r)
    g2.addColorStop(0, c[0])
    g2.addColorStop(0.55, c[1])
    g2.addColorStop(1, c[2])
    ctx.fillStyle = g2
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 7)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, r - 0.6, Math.PI * 1.05, Math.PI * 1.7)
    ctx.stroke()
    const g3 = ctx.createRadialGradient(x - r * 0.36, y - r * 0.5, 0, x - r * 0.36, y - r * 0.5, r * 0.5)
    g3.addColorStop(0, 'rgba(255,255,255,.9)')
    g3.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g3
    ctx.beginPath()
    ctx.arc(x - r * 0.36, y - r * 0.5, r * 0.5, 0, 7)
    ctx.fill()
    ctx.fillStyle = ink || '#fff'
    ctx.font = '600 ' + Math.round(r * 0.74) + 'px ' + sans + ',sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(ini, x, y + r * 0.04)
    ctx.globalAlpha = 1
  }
  const ell = (R: number, y: number, color: string, lw: number) => {
    ctx.strokeStyle = color
    ctx.lineWidth = lw
    ctx.beginPath()
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2, q = P(R * Math.cos(t), y, R * Math.sin(t))
      if (i) ctx.lineTo(q.x, q.y)
      else ctx.moveTo(q.x, q.y)
    }
    ctx.stroke()
  }

  ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)
  const fc = P(0, 6, 0)
  ctx.save()
  ctx.translate(fc.x, fc.y)
  ctx.scale(1, Math.sin(sim.tilt))
  const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, 205 * k0)
  fg.addColorStop(0, pl.pool)
  fg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = fg
  ctx.beginPath()
  ctx.arc(0, 0, 205 * k0, 0, 7)
  ctx.fill()
  ctx.restore()
  if (sim.mode === 'sos' && !reduced) {
    sim.waveT -= dt
    if (sim.waveT <= 0) {
      sim.waves.push({ r: 40, a: 0.55 })
      sim.waveT = 1.5
    }
  }
  sim.waves = sim.waves.filter((w) => {
    w.r += dt * 95
    w.a -= dt * 0.32
    return w.a > 0
  })
  sim.waves.forEach((w) => ell(w.r, 0, 'rgba(' + pl.ring + ',' + w.a.toFixed(3) + ')', 1.6))

  const items: { z: number; d: () => void }[] = []
  RINGS.forEach((R, ri) => {
    const N = 96
    for (let s = 0; s < N; s++) {
      if (R.dashed && s % 2) continue
      const t1 = (s / N) * Math.PI * 2, t2 = ((s + 1) / N) * Math.PI * 2
      const a = P(R.radius * Math.cos(t1), R.y, R.radius * Math.sin(t1)), b = P(R.radius * Math.cos(t2), R.y, R.radius * Math.sin(t2))
      const front = Math.max(0, Math.min(1, 0.5 - (a.z / (R.radius * Math.sin(sim.tilt) + 1)) * 0.5))
      items.push({
        z: (a.z + b.z) / 2,
        d: () => {
          ctx.strokeStyle = 'rgba(' + pl.ring + ',' + (0.12 + 0.5 * front).toFixed(3) + ')'
          ctx.lineWidth = (1 + 1.8 * front) * (ri === 2 ? 0.8 : 1)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        },
      })
    }
  })
  const cP = P(0, -16, 0)
  const br = reduced ? 1 : 1 + 0.035 * Math.sin((now / 650) * (sim.mode === 'sos' ? 2.2 : 1))
  const cr = 34 * k0 * cP.p * br
  const c = scene.centre
  const hits: OrbitHit[] = [{ x: cP.x, y: cP.y, r: cr, text: c.name + ' · ' + (sim.mode === 'calm' ? c.calmSub : c.alertSub) }]
  items.push({
    z: cP.z,
    d: () => {
      ball(cP.x, cP.y, cr, pl.core, c.initials, 1, pl.halo)
      if (o.labels && sim.mode === 'calm') {
        ctx.fillStyle = pl.lab
        ctx.font = '500 12px ' + sans
        ctx.textAlign = 'center'
        ctx.fillText(c.label, cP.x, cP.y + cr + 16)
      }
    },
  })
  const pos: Record<string, { x: number; y: number }> = {}
  scene.nodes.forEach((p, i) => {
    const R = RINGS[p.ring]
    let rad = R.radius
    if (sim.ang[i] == null) sim.ang[i] = p.angle
    if (p.id === 'david' && st.app > 0.01) {
      if (reduced) sim.ang[i] = -Math.PI / 2
      else {
        let d = -Math.PI / 2 - sim.ang[i]
        d = Math.atan2(Math.sin(d), Math.cos(d))
        sim.ang[i] += d * Math.min(1, dt * 2.5)
      }
      rad = R.radius + (50 - R.radius) * st.app
    } else sim.ang[i] = p.angle + (sim.spin[p.ring] ?? 0)
    const ang = sim.ang[i]
    const q = P(rad * Math.cos(ang), R.y - 10, rad * Math.sin(ang))
    const r = (p.id === 'hosp' ? 15 : 18) * k0 * q.p
    pos[p.id] = q
    let a = 1
    let glow: string | null = null
    if (sim.mode !== 'calm') {
      if (p.id === 'sarah' || p.id === 'nurse') a = 0.5
      if (p.id === 'hosp') {
        a = 0.45 + 0.55 * st.hosp
        if (st.hosp > 0.5) glow = 'rgba(150,220,255,.5)'
      }
      if (p.id === 'james' && st.call > 0.5) glow = 'rgba(255,180,120,.55)'
      if (p.id === 'david' && st.app > 0.05) glow = 'rgba(140,190,255,.55)'
    }
    const front = Math.max(0, Math.min(1, 0.5 - (q.z / (rad * Math.sin(sim.tilt) + 1)) * 0.5))
    a *= 0.55 + 0.45 * front
    hits.push({ x: q.x, y: q.y, r: r + 6, text: p.name + ' · ' + p.sub })
    items.push({
      z: q.z,
      d: () => {
        ball(q.x, q.y, r, p.colors, p.initials, a, glow, p.ink)
        if (o.labels) {
          ctx.globalAlpha = a
          ctx.textAlign = 'center'
          ctx.fillStyle = pl.lab
          ctx.font = '500 11.5px ' + sans
          ctx.fillText(p.name, q.x, q.y + r + 14)
          if (o.subs) {
            ctx.fillStyle = pl.sub
            ctx.font = '400 10px ' + sans
            ctx.fillText(p.sub, q.x, q.y + r + 26)
          }
          ctx.globalAlpha = 1
        }
      },
    })
  })
  const link = (id: string, v: number, col: string) => {
    if (v < 0.02 || !pos[id]) return
    const q = pos[id]
    ctx.strokeStyle = col.replace('A', (0.85 * Math.min(1, v)).toFixed(3))
    ctx.lineWidth = 2
    ctx.setLineDash([5, 6])
    ctx.lineDashOffset = -now / 40
    ctx.beginPath()
    ctx.moveTo(q.x, q.y)
    ctx.lineTo(cP.x, cP.y)
    ctx.stroke()
    ctx.setLineDash([])
  }
  link('james', st.call, 'rgba(255,190,140,A)')
  link('hosp', st.hosp, 'rgba(150,215,255,A)')
  link('david', st.app > 0.02 && st.arrived < 0.5 ? 1 : 0, 'rgba(140,190,255,A)')
  items.sort((a, b) => b.z - a.z).forEach((it) => it.d())
  return hits
}

/** Top-most ball under (x, y), as the prototype's pointerup loop. */
export function orbitHit(hits: OrbitHit[], x: number, y: number): string | null {
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i]
    if ((x - h.x) * (x - h.x) + (y - h.y) * (y - h.y) < h.r * h.r) return h.text
  }
  return null
}
