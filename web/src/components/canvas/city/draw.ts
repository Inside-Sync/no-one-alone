import { shade } from '@/lib/color'
import type { CityView } from '@/data/types'
import type { CanvasFonts } from '../fonts'
import type { CityModel, CityPin } from './types'

/**
 * Pure drawing functions of the prototype's `City3D` (lines 1176–1251): an
 * oblique projection with yaw, a cached static layer (ground, faces, trees),
 * and an animated overlay (rings, routes, labels, pins, compass). Calls are
 * made in the prototype's order so frames match it call for call.
 */

export interface Projected {
  x: number
  y: number
  /** Depth: bigger is further away. */
  d: number
}

export interface Camera {
  W: number
  H: number
  yaw: number
  k: number
  S: readonly [number, number]
  cy: number
  sp: number
  cp: number
}

export function makeCamera(view: CityView, W: number, H: number, yaw: number): Camera {
  const PITCH = view.pitch || 0.62, sp = Math.sin(PITCH), cp = Math.cos(PITCH), S = view.size
  const dg = Math.hypot(S[0], S[1])
  const k = Math.min((W * (view.fill || 0.94)) / dg, (H - (view.vpad || 150)) / (dg * sp + (view.zmax || 30) * cp)) * (view.zoom || 1)
  return { W, H, yaw, k, S, cy: view.cy || 0.58, sp, cp }
}

/** Prototype `P(x, y, z)`. */
export function project(c: Camera, x: number, y: number, z: number): Projected {
  const dx = x - c.S[0] / 2, dy = y - c.S[1] / 2, co = Math.cos(c.yaw), s = Math.sin(c.yaw)
  const xr = dx * co - dy * s, yr = dx * s + dy * co
  return { x: c.W / 2 + xr * c.k, y: c.H * c.cy - yr * c.k * c.sp - z * c.k * c.cp, d: yr * c.cp - z * c.sp }
}

function poly(c: CanvasRenderingContext2D, pp: Projected[], fill: string, stroke?: string) {
  c.beginPath()
  for (let i = 0; i < pp.length; i++) {
    if (i) c.lineTo(pp[i].x, pp[i].y)
    else c.moveTo(pp[i].x, pp[i].y)
  }
  c.closePath()
  c.fillStyle = fill
  c.fill()
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = 0.5
    c.stroke()
  }
}

function path(c: CanvasRenderingContext2D, pts: Projected[]) {
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)))
}

/** `renderStatic()`: ground, depth-sorted faces and trees, night tint. Draws into the offscreen buffer. */
export function renderStatic(bx: CanvasRenderingContext2D, bufW: number, bufH: number, m: CityModel, cam: Camera, dpr: number, night: boolean): void {
  const P = (x: number, y: number, z: number) => project(cam, x, y, z)
  const k = cam.k
  bx.setTransform(1, 0, 0, 1, 0, 0)
  bx.clearRect(0, 0, bufW, bufH)
  bx.setTransform(dpr, 0, 0, dpr, 0, 0)
  m.ground.forEach((g) => poly(bx, g.pts.map((p) => P(p[0], p[1], p[2] || 0)), g.fill))
  type Item = { d: number; f?: CityModel['faces'][number]; pp?: Projected[]; t?: CityModel['trees'][number]; q?: Projected }
  const items: Item[] = []
  m.faces.forEach((f) => {
    const pp = f.pts.map((p) => P(p[0], p[1], p[2]))
    let d = 0
    for (let i = 0; i < pp.length; i++) d += pp[i].d
    items.push({ d: d / pp.length + (f.bias || 0), f, pp })
  })
  m.trees.forEach((t) => {
    const q = P(t.x, t.y, t.h)
    items.push({ d: q.d, t, q })
  })
  items.sort((a, b) => b.d - a.d)
  items.forEach((it) => {
    if (it.f) {
      poly(bx, it.pp!, it.f.fill, it.f.stroke || 'rgba(30,40,40,.08)')
      return
    }
    const t = it.t!, q = it.q!, b = P(t.x, t.y, 0), r = t.r * k
    bx.strokeStyle = 'rgba(96,74,52,.75)'
    bx.lineWidth = Math.max(1, 1.1 * k)
    bx.beginPath()
    bx.moveTo(b.x, b.y)
    bx.lineTo(q.x, q.y + r * 0.4)
    bx.stroke()
    const g = bx.createRadialGradient(q.x - r * 0.35, q.y - r * 0.4, r * 0.1, q.x, q.y, r)
    g.addColorStop(0, t.c[0])
    g.addColorStop(1, t.c[1])
    bx.fillStyle = g
    bx.beginPath()
    bx.arc(q.x, q.y, r, 0, 7)
    bx.fill()
  })
  if (night) {
    bx.globalCompositeOperation = 'source-atop'
    bx.fillStyle = 'rgba(12,16,44,.55)'
    bx.fillRect(0, 0, cam.W, cam.H)
    bx.globalCompositeOperation = 'source-over'
  }
}

export interface Hit {
  x: number
  y: number
  w: number
  h: number
  p: CityPin
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

function pill(ctx: CanvasRenderingContext2D, fonts: CanvasFonts, x: number, y: number, t1: string, t2: string, col: string | null, night: boolean, anchor?: 'c'): Box {
  ctx.font = '600 11.5px ' + fonts.sans
  const w1 = ctx.measureText(t1).width
  let w2 = 0
  if (t2) {
    ctx.font = '400 10.5px ' + fonts.sans
    w2 = ctx.measureText(t2).width
  }
  const w = Math.max(w1, w2) + 18, h = t2 ? 34 : 20, x0 = anchor === 'c' ? x - w / 2 : x, y0 = y - h / 2
  ctx.fillStyle = night ? 'rgba(18,22,46,.86)' : 'rgba(255,255,255,.9)'
  ctx.strokeStyle = night ? 'rgba(255,255,255,.18)' : 'rgba(13,42,42,.10)'
  ctx.lineWidth = 1
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x0, y0, w, h, 9)
  else ctx.rect(x0, y0, w, h)
  ctx.fill()
  ctx.stroke()
  if (col) {
    ctx.fillStyle = col
    ctx.fillRect(x0, y0 + 6, 3, h - 12)
  }
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = night ? '#f4f1f6' : '#0d2a2a'
  ctx.font = '600 11.5px ' + fonts.sans
  ctx.fillText(t1, x0 + 10, t2 ? y0 + 11 : y0 + h / 2)
  if (t2) {
    ctx.fillStyle = night ? '#a8a2b6' : '#56706e'
    ctx.font = '400 10.5px ' + fonts.sans
    ctx.fillText(t2, x0 + 10, y0 + 24)
  }
  return { x: x0, y: y0, w, h }
}

function circ(cam: Camera, x: number, y: number, r: number, z?: number): Projected[] {
  const pts: Projected[] = []
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2
    pts.push(project(cam, x + r * Math.cos(a), y + r * Math.sin(a), z || 0.4))
  }
  return pts
}

export interface OverlayOptions {
  now: number
  night: boolean
  reduced: boolean
  fonts: CanvasFonts
  compassY?: number
}

/** The per-frame part of `City3D.frame`: rings, routes, labels, pins and compass. Returns tap targets. */
export function drawOverlay(ctx: CanvasRenderingContext2D, m: CityModel, cam: Camera, o: OverlayOptions): Hit[] {
  const { now, night, reduced, fonts } = o
  const P = (x: number, y: number, z: number) => project(cam, x, y, z)
  const { W, H, S } = cam
  ;(m.rings || []).forEach((r) => {
    const pts = circ(cam, r.x, r.y, r.r)
    ctx.setLineDash([6, 6])
    ctx.lineDashOffset = reduced ? 0 : -now / 60
    ctx.strokeStyle = r.c
    ctx.lineWidth = 1.6
    ctx.beginPath()
    path(ctx, pts)
    ctx.stroke()
    ctx.setLineDash([])
    if (r.label) {
      const q = P(r.x + r.r * 0.71, r.y - r.r * 0.71, 0.5)
      ctx.font = '600 10.5px ' + fonts.mono
      ctx.fillStyle = r.c
      ctx.textAlign = 'center'
      ctx.fillText(r.label, q.x, q.y + 12)
    }
  })
  ;(m.routes || []).forEach((rt) => {
    const pp = rt.pts.map((p) => P(p[0], p[1], 0.6))
    ctx.strokeStyle = rt.c
    ctx.lineWidth = 3.2
    ctx.lineCap = 'round'
    ctx.setLineDash([2, 7])
    ctx.lineDashOffset = reduced ? 0 : -now / 30
    ctx.beginPath()
    path(ctx, pp)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineCap = 'butt'
  })
  ;(m.labels || []).forEach((l) => {
    const q = P(l.x, l.y, l.z || 0)
    ctx.font = (l.b ? '600 ' : '500 ') + '10.5px ' + fonts.sans
    const w = ctx.measureText(l.t).width + 10
    ctx.fillStyle = night ? 'rgba(18,22,46,.7)' : 'rgba(255,255,255,.72)'
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(q.x - w / 2, q.y - 8, w, 16, 8)
    else ctx.rect(q.x - w / 2, q.y - 8, w, 16)
    ctx.fill()
    ctx.fillStyle = night ? '#d8d2de' : '#2f4c4b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(l.t, q.x, q.y)
  })
  const hits: Hit[] = []
  const pins = m.pins.map((p) => ({ p, q: P(p.x, p.y, p.z || 0) })).sort((a, b) => b.q.d - a.q.d)
  pins.forEach(({ p, q: top }) => {
    if (p.tag) {
      const b = pill(ctx, fonts, top.x, top.y - 16, p.name, p.sub, p.c, night, 'c')
      hits.push({ ...b, p })
      return
    }
    if (!reduced) {
      const ph = (now / 1700 + (p.ph || 0)) % 1
      const cp2 = circ(cam, p.x, p.y, 5 + ph * 20, 0.3)
      ctx.strokeStyle = p.c
      ctx.globalAlpha = (1 - ph) * 0.7
      ctx.lineWidth = 2
      ctx.beginPath()
      path(ctx, cp2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    const hh = p.big ? 38 : 26, hx = top.x, hy = top.y - hh, r = p.big ? 12 : 8.5
    ctx.strokeStyle = p.c === '#ffffff' ? '#7a9995' : p.c
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.lineTo(hx, hy + r)
    ctx.stroke()
    if (p.big) {
      const g0 = ctx.createRadialGradient(hx, hy, r, hx, hy, r * 3)
      g0.addColorStop(0, 'rgba(31,179,156,.45)')
      g0.addColorStop(1, 'rgba(31,179,156,0)')
      ctx.fillStyle = g0
      ctx.beginPath()
      ctx.arc(hx, hy, r * 3, 0, 7)
      ctx.fill()
    }
    const g = ctx.createRadialGradient(hx - r * 0.35, hy - r * 0.4, r * 0.1, hx, hy, r)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.35, p.c)
    g.addColorStop(1, p.c === '#ffffff' ? '#c9d8d5' : shade(p.c, 0.6))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(hx, hy, r, 0, 7)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,.9)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = p.ink || '#fff'
    ctx.font = '700 ' + (p.big ? 11 : 9) + 'px ' + fonts.sans
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(p.ini, hx, hy + 0.5)
    const b2 = pill(ctx, fonts, hx + r + 6, hy, p.name, p.sub, p.c === '#ffffff' ? '#0b7f71' : p.c, night)
    hits.push({ x: hx - r, y: hy - r, w: r * 2, h: r * 2, p })
    hits.push({ ...b2, p })
  })
  // compass
  const c0 = P(S[0] / 2, S[1] / 2, 0), c1 = P(S[0] / 2, S[1] / 2 + 40, 0)
  let vx = c1.x - c0.x, vy = c1.y - c0.y
  const vl = Math.hypot(vx, vy) || 1
  vx /= vl
  vy /= vl
  const cx = W - 40, cy = H - (o.compassY || 86)
  ctx.fillStyle = night ? 'rgba(18,22,46,.7)' : 'rgba(255,255,255,.75)'
  ctx.beginPath()
  ctx.arc(cx, cy, 18, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#ef4e4a'
  ctx.beginPath()
  ctx.moveTo(cx + vx * 13, cy + vy * 13)
  ctx.lineTo(cx - vy * 5, cy + vx * 5)
  ctx.lineTo(cx + vy * 5, cy - vx * 5)
  ctx.fill()
  ctx.fillStyle = night ? '#d8d2de' : '#56706e'
  ctx.beginPath()
  ctx.moveTo(cx - vx * 13, cy - vy * 13)
  ctx.lineTo(cx - vy * 5, cy + vx * 5)
  ctx.lineTo(cx + vy * 5, cy - vx * 5)
  ctx.fill()
  ctx.font = '700 9px ' + fonts.mono
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ef4e4a'
  ctx.fillText('N', cx + vx * 24, cy + vy * 24 + 3)
  return hits
}

/** Offscreen static layer, re-rendered only when size, yaw, night or the model change. */
export interface StaticBuffer {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  key: string
  model?: CityModel
}

export interface FrameOptions {
  width: number
  height: number
  dpr: number
  yaw: number
  now: number
  night: boolean
  reduced: boolean
  fonts: CanvasFonts
}

/** One `City3D.frame`: refresh the static buffer if needed, blit it, draw the overlay. */
export function drawCityFrame(ctx: CanvasRenderingContext2D, buf: StaticBuffer, m: CityModel, view: CityView, o: FrameOptions): Hit[] {
  const cam = makeCamera(view, o.width, o.height, o.yaw)
  const key = `${o.width}x${o.height}@${o.dpr}|${o.yaw}|${o.night}`
  if (buf.key !== key || buf.model !== m) {
    renderStatic(buf.ctx, buf.canvas.width, buf.canvas.height, m, cam, o.dpr, o.night)
    buf.key = key
    buf.model = m
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.drawImage(buf.canvas, 0, 0)
  ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0)
  return drawOverlay(ctx, m, cam, { now: o.now, night: o.night, reduced: o.reduced, fonts: o.fonts, compassY: view.compassY })
}

/** Top-most hit under (x, y), as the prototype's pointerup loop. */
export function cityHit(hits: Hit[], x: number, y: number): CityPin | null {
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i]
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h.p
  }
  return null
}

/** Toast text on tap: `name · detail`, else `name · sub`. */
export function pinText(p: CityPin): string {
  return p.name + (p.d ? ' · ' + p.d : p.sub ? ' · ' + p.sub : '')
}
