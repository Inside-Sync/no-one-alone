import { shade } from '@/lib/color'
import type { CanvasFonts } from '../fonts'
import { project, type Camera, type Hit, type OverlayOptions, type Projected } from './draw'
import { MAP_ICONS, type MapIcon } from './icons'
import type { CityLabel, CityModel, CityPin, CityRing, CityRoute, Tree } from './types'

/**
 * The map-app styling of a `modern` City3D model: layered tree crowns with shadows (static layer), and on the overlay
 * a soft walk ring, a cased route with moving dots, street names set along their streets, and icon markers standing
 * on their roofs with a label card.
 */

const paths = new Map<MapIcon, Path2D[]>()
function iconPaths(name: MapIcon): Path2D[] | null {
  // jsdom has no Path2D: the marker still draws, without its glyph.
  if (typeof Path2D === 'undefined') return null
  let p = paths.get(name)
  if (!p) paths.set(name, (p = MAP_ICONS[name].map((d) => new Path2D(d))))
  return p
}

/** A lucide glyph centred on (cx, cy), `size` px wide, stroked like the React icons. */
function drawIcon(c: CanvasRenderingContext2D, name: MapIcon, cx: number, cy: number, size: number, colour: string) {
  const ps = iconPaths(name)
  if (!ps) return
  c.save()
  c.translate(cx - size / 2, cy - size / 2)
  c.scale(size / 24, size / 24)
  c.strokeStyle = colour
  c.lineWidth = 2.2
  c.lineCap = 'round'
  c.lineJoin = 'round'
  ps.forEach((p) => c.stroke(p))
  c.restore()
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  if (c.roundRect) c.roundRect(x, y, w, h, r)
  else c.rect(x, y, w, h)
}

/** A tree from above: its shadow on the ground, then a crown of three overlapping lobes. */
export function modernTree(c: CanvasRenderingContext2D, t: Tree, top: Projected, ground: Projected, r: number): void {
  c.fillStyle = 'rgba(30,52,40,.13)'
  c.beginPath()
  c.ellipse(ground.x + r * 0.45, ground.y + r * 0.2, r * 1.05, r * 0.5, 0, 0, 7)
  c.fill()
  const lobe = (x: number, y: number, rr: number, f: number) => {
    const g = c.createRadialGradient(x - rr * 0.35, y - rr * 0.45, rr * 0.1, x, y, rr)
    g.addColorStop(0, shade(t.c[0], f))
    g.addColorStop(1, shade(t.c[1], f))
    c.fillStyle = g
    c.beginPath()
    c.arc(x, y, rr, 0, 7)
    c.fill()
  }
  lobe(top.x - r * 0.42, top.y + r * 0.12, r * 0.72, 0.92)
  lobe(top.x + r * 0.42, top.y + r * 0.18, r * 0.7, 0.9)
  lobe(top.x, top.y - r * 0.1, r * 0.82, 1.04)
}

function ground(cam: Camera, x: number, y: number, r: number): Projected[] {
  const pts: Projected[] = []
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2
    pts.push(project(cam, x + r * Math.cos(a), y + r * Math.sin(a), 0.3))
  }
  return pts
}

function trace(c: CanvasRenderingContext2D, pts: Projected[]) {
  c.beginPath()
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)))
}

function drawRing(c: CanvasRenderingContext2D, cam: Camera, r: CityRing, o: OverlayOptions) {
  const pts = ground(cam, r.x, r.y, r.r)
  trace(c, pts)
  c.fillStyle = 'rgba(20,160,140,.07)'
  c.fill()
  c.setLineDash([7, 6])
  c.lineDashOffset = o.reduced ? 0 : -o.now / 70
  c.strokeStyle = r.c
  c.lineWidth = 1.6
  c.stroke()
  c.setLineDash([])
  if (!r.label) return
  // The label sits on the ring's near (south) edge, as a small pill.
  const q = project(cam, r.x, r.y - r.r, 0.3)
  c.font = '700 9.5px ' + o.fonts.sans
  const w = c.measureText(r.label).width + 14
  roundRect(c, q.x - w / 2, q.y - 9, w, 18, 9)
  c.fillStyle = o.night ? 'rgba(18,22,46,.9)' : '#ffffff'
  c.fill()
  c.strokeStyle = r.c
  c.lineWidth = 1
  c.stroke()
  c.fillStyle = o.night ? '#7fe0cf' : '#0b7f71'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText(r.label, q.x, q.y + 0.5)
}

function drawRoute(c: CanvasRenderingContext2D, cam: Camera, rt: CityRoute, o: OverlayOptions) {
  const pts = rt.pts.map(([x, y]) => project(cam, x, y, 0.6))
  c.lineCap = 'round'
  c.lineJoin = 'round'
  trace(c, pts)
  c.strokeStyle = o.night ? 'rgba(18,22,46,.85)' : '#ffffff'
  c.lineWidth = 7
  c.stroke()
  c.strokeStyle = rt.c
  c.lineWidth = 3.6
  c.stroke()
  // Dots walking along it, towards the end (her door).
  c.setLineDash([0.5, 12])
  c.lineDashOffset = o.reduced ? 0 : -o.now / 45
  c.strokeStyle = 'rgba(255,255,255,.95)'
  c.lineWidth = 2.4
  c.stroke()
  c.setLineDash([])
  const a = pts[0]
  c.fillStyle = '#ffffff'
  c.strokeStyle = rt.c
  c.lineWidth = 2.2
  c.beginPath()
  c.arc(a.x, a.y, 3.6, 0, 7)
  c.fill()
  c.stroke()
  c.lineCap = 'butt'
}

function drawLabel(c: CanvasRenderingContext2D, cam: Camera, l: CityLabel, o: OverlayOptions) {
  const q = project(cam, l.x, l.y, 0.5)
  c.save()
  c.translate(q.x, q.y)
  if (l.a != null) {
    const q1 = project(cam, l.x + Math.cos(l.a) * 10, l.y + Math.sin(l.a) * 10, 0.5)
    let ang = Math.atan2(q1.y - q.y, q1.x - q.x)
    // Keep the text upright whichever way the map is turned.
    if (ang > Math.PI / 2) ang -= Math.PI
    if (ang < -Math.PI / 2) ang += Math.PI
    c.rotate(ang)
  }
  c.font = (l.a != null ? '600 10.5px ' : 'italic 500 10.5px ') + o.fonts.sans
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.lineJoin = 'round'
  c.strokeStyle = o.night ? 'rgba(18,22,46,.85)' : 'rgba(255,255,255,.92)'
  c.lineWidth = 3.5
  c.strokeText(l.t, 0, 0)
  c.fillStyle = o.night ? '#d8d2de' : l.a != null ? '#4f6462' : '#3f7a5c'
  c.fillText(l.t, 0, 0)
  c.restore()
}

type Box = { x: number; y: number; w: number; h: number }
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4

function cardSize(c: CanvasRenderingContext2D, fonts: CanvasFonts, p: CityPin) {
  c.font = '600 12px ' + fonts.sans
  const w1 = c.measureText(p.name).width
  c.font = '400 10.5px ' + fonts.sans
  const w2 = p.sub ? c.measureText(p.sub).width : 0
  return { w: Math.max(w1, w2) + 18, h: p.sub ? 36 : 24 }
}

/** A label card at (x, centre y): name, and the second line when there is one. */
function card(c: CanvasRenderingContext2D, fonts: CanvasFonts, x: number, y: number, p: CityPin, night: boolean) {
  const { w, h } = cardSize(c, fonts, p), y0 = y - h / 2
  c.save()
  c.shadowColor = 'rgba(13,42,42,.18)'
  c.shadowBlur = 10
  c.shadowOffsetY = 2
  roundRect(c, x, y0, w, h, 8)
  c.fillStyle = night ? 'rgba(18,22,46,.92)' : '#ffffff'
  c.fill()
  c.restore()
  c.textAlign = 'left'
  c.textBaseline = 'middle'
  c.fillStyle = night ? '#f4f1f6' : '#0d2a2a'
  c.font = '600 12px ' + fonts.sans
  c.fillText(p.name, x + 9, p.sub ? y0 + 12.5 : y)
  if (p.sub) {
    c.fillStyle = night ? '#a8a2b6' : '#56706e'
    c.font = '400 10.5px ' + fonts.sans
    c.fillText(p.sub, x + 9, y0 + 25.5)
  }
  return { x, y: y0, w, h }
}

function drawMarker(c: CanvasRenderingContext2D, cam: Camera, p: CityPin, o: OverlayOptions, taken: Box[]): Hit[] {
  const base = project(cam, p.x, p.y, p.z), big = Boolean(p.big)
  const accent = p.c === '#ffffff' ? p.ink ?? '#0b7f71' : p.c
  const R = big ? 16 : 12.5, hx = base.x, hy = base.y - (big ? 40 : 30)
  // Ground: a pulse (or the home glow) and the marker's own shadow.
  if (!o.reduced) {
    const ph = (o.now / 1900 + (p.ph || 0)) % 1
    trace(c, ground(cam, p.x, p.y, (big ? 6 : 4) + ph * (big ? 22 : 14)))
    c.strokeStyle = accent
    c.globalAlpha = (1 - ph) * (big ? 0.6 : 0.35)
    c.lineWidth = 2
    c.stroke()
    c.globalAlpha = 1
  }
  c.fillStyle = 'rgba(13,42,42,.22)'
  c.beginPath()
  c.ellipse(base.x, base.y, 6, 2.6, 0, 0, 7)
  c.fill()
  c.strokeStyle = shade(accent, 0.85)
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(base.x, base.y)
  c.lineTo(hx, hy + R)
  c.stroke()
  if (big) {
    const g = c.createRadialGradient(hx, hy, R, hx, hy, R * 2.6)
    g.addColorStop(0, 'rgba(31,179,156,.35)')
    g.addColorStop(1, 'rgba(31,179,156,0)')
    c.fillStyle = g
    c.beginPath()
    c.arc(hx, hy, R * 2.6, 0, 7)
    c.fill()
  }
  c.save()
  c.shadowColor = 'rgba(13,42,42,.28)'
  c.shadowBlur = 8
  c.shadowOffsetY = 2
  c.beginPath()
  c.arc(hx, hy, R, 0, 7)
  c.fillStyle = big ? accent : o.night ? '#1b2040' : '#ffffff'
  c.fill()
  c.restore()
  c.strokeStyle = big ? '#ffffff' : accent
  c.lineWidth = big ? 2.5 : 2.2
  c.beginPath()
  c.arc(hx, hy, R - (big ? 1.25 : 1.1), 0, 7)
  c.stroke()
  if (p.icon) drawIcon(c, p.icon, hx, hy, big ? 17 : 13.5, big ? '#ffffff' : accent)
  // The card goes right of the marker, or left when that would cover a marker or card already placed.
  const s = cardSize(c, o.fonts, p), right = { x: hx + R + 6, y: hy - s.h / 2, ...s }
  const x = taken.some((t) => overlaps(right, t)) ? hx - R - 6 - s.w : right.x
  const head = { x: hx - R, y: hy - R, w: R * 2, h: R * 2 }, b = card(c, o.fonts, x, hy, p, o.night)
  taken.push(head, b)
  return [{ ...head, p }, { ...b, p }]
}

/** An off-map pointer (e.g. "→ Stroke centre"): a card with its glyph in a coloured disc. */
function drawPointer(c: CanvasRenderingContext2D, cam: Camera, p: CityPin, o: OverlayOptions): Hit {
  const q = project(cam, p.x, p.y, p.z)
  c.font = '600 11.5px ' + o.fonts.sans
  // Kept inside the canvas: it points off the map, so its anchor may sit near the edge.
  const w = c.measureText(p.name).width + 40, h = 28, y0 = q.y - h / 2
  const x0 = Math.max(10, Math.min(cam.W - w - 10, q.x - w / 2))
  c.save()
  c.shadowColor = 'rgba(13,42,42,.18)'
  c.shadowBlur = 10
  c.shadowOffsetY = 2
  roundRect(c, x0, y0, w, h, 14)
  c.fillStyle = o.night ? 'rgba(18,22,46,.92)' : '#ffffff'
  c.fill()
  c.restore()
  c.fillStyle = p.c
  c.beginPath()
  c.arc(x0 + 14, q.y, 10, 0, 7)
  c.fill()
  if (p.icon) drawIcon(c, p.icon, x0 + 14, q.y, 12, '#ffffff')
  c.fillStyle = o.night ? '#f4f1f6' : '#0d2a2a'
  c.textAlign = 'left'
  c.textBaseline = 'middle'
  c.fillText(p.name, x0 + 30, q.y + 0.5)
  return { x: x0, y: y0, w, h, p }
}

export function drawModernOverlay(c: CanvasRenderingContext2D, m: CityModel, cam: Camera, o: OverlayOptions): Hit[] {
  ;(m.rings || []).forEach((r) => drawRing(c, cam, r, o))
  ;(m.routes || []).forEach((r) => drawRoute(c, cam, r, o))
  ;(m.labels || []).forEach((l) => drawLabel(c, cam, l, o))
  const hits: Hit[] = [], taken: Box[] = []
  m.pins
    .map((p) => ({ p, d: project(cam, p.x, p.y, p.z).d }))
    .sort((a, b) => b.d - a.d)
    .forEach(({ p }) => (p.tag ? hits.push(drawPointer(c, cam, p, o)) : hits.push(...drawMarker(c, cam, p, o, taken))))
  return hits
}
