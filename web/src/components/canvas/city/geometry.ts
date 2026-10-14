import { ramp, rgbHex, shade } from '@/lib/color'
import { rng } from '@/lib/rng'
import type { CityGeometry, MapPin, Suburb, Surroundings } from '@/data/types'
import type { CityLabel, CityModel, CityPin, Face, Pt3, Tree } from './types'

/**
 * Ports of the prototype's model builders (lines 1252–1336). The order of
 * every `R()` call is kept so the seeded Marrickville model comes out
 * identical (home and David's houses included, ruling R10).
 */

interface BoxOpts {
  z0?: number
  gable?: boolean
  rh?: number
}

/** `boxF`: four walls plus a flat or gabled roof. */
export function boxF(F: Face[], x: number, y: number, w: number, d: number, h: number, wall: string, roof: string, opt: BoxOpts = {}): void {
  const z0 = opt.z0 || 0, z1 = z0 + h
  F.push({ pts: [[x, y, z0], [x + w, y, z0], [x + w, y, z1], [x, y, z1]], fill: shade(wall, 0.88) })
  F.push({ pts: [[x + w, y, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x + w, y, z1]], fill: shade(wall, 0.97) })
  F.push({ pts: [[x + w, y + d, z0], [x, y + d, z0], [x, y + d, z1], [x + w, y + d, z1]], fill: shade(wall, 0.74) })
  F.push({ pts: [[x, y + d, z0], [x, y, z0], [x, y, z1], [x, y + d, z1]], fill: shade(wall, 0.8) })
  if (opt.gable) {
    const rh = opt.rh || 3.2, mx = x + w / 2
    F.push({ pts: [[x, y, z1], [mx, y, z1 + rh], [mx, y + d, z1 + rh], [x, y + d, z1]], fill: shade(roof, 0.82), bias: -0.01 })
    F.push({ pts: [[x + w, y, z1], [mx, y, z1 + rh], [mx, y + d, z1 + rh], [x + w, y + d, z1]], fill: shade(roof, 1.02), bias: -0.01 })
    F.push({ pts: [[x, y, z1], [x + w, y, z1], [mx, y, z1 + rh]], fill: shade(wall, 0.9) })
    F.push({ pts: [[x, y + d, z1], [x + w, y + d, z1], [mx, y + d, z1 + rh]], fill: shade(wall, 0.74) })
  } else F.push({ pts: [[x, y, z1], [x + w, y, z1], [x + w, y + d, z1], [x, y + d, z1]], fill: roof })
}

export function rect(x0: number, y0: number, x1: number, y1: number, z = 0): Pt3[] {
  return [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]
}

/** `slab`: the ground plate with 8-unit sides. */
export function slab(F: Face[], G: Face[], w: number, d: number, top: string, side: string): void {
  G.push({ pts: rect(0, 0, w, d), fill: top })
  F.push({ pts: [[0, 0, -8], [w, 0, -8], [w, 0, 0], [0, 0, 0]], fill: shade(side, 0.9), bias: 9e3 })
  F.push({ pts: [[w, 0, -8], [w, d, -8], [w, d, 0], [w, 0, 0]], fill: shade(side, 0.8), bias: 9e3 })
  F.push({ pts: [[w, d, -8], [0, d, -8], [0, d, 0], [w, d, 0]], fill: shade(side, 0.7), bias: 9e3 })
  F.push({ pts: [[0, d, -8], [0, 0, -8], [0, 0, 0], [0, d, 0]], fill: shade(side, 0.75), bias: 9e3 })
}

interface House {
  x: number
  y: number
  w: number
  d: number
  h: number
  wall: string
  roof: string
  shop?: boolean
}

/** Static Marrickville geometry plus where the generator put Margaret's and David's houses. */
export interface SuburbBase {
  faces: Face[]
  ground: Face[]
  trees: Tree[]
  /** Pin anchor on Margaret's house (prototype `mh.h.x+4, mh.h.y+7`). */
  home: { x: number; y: number }
  /** Pin anchor on David's house. */
  david: { x: number; y: number }
}

/** `buildSuburb()` (line 1270), seed 11. */
export function buildSuburb(geo: CityGeometry): SuburbBase {
  const R = rng(11), F: Face[] = [], G: Face[] = [], T: Tree[] = []
  let houses: House[] = []
  const g = geo.ground, TR = geo.trees
  slab(F, G, 400, 400, g.slabTop, g.slabSide)
  G.push({ pts: rect(0, 0, 400, 24), fill: g.river })
  G.push({ pts: rect(0, 24, 400, 46), fill: g.riverBank })
  const blocks = geo.blocks
  blocks.forEach((b) => G.push({ pts: rect(b[0], b[2], b[1], b[3]), fill: b[4] === 'park' ? g.park : g.block }))
  const ov: Pt3[] = []
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2
    ov.push([329 + 44 * Math.cos(a), 211 + 30 * Math.sin(a), 0])
  }
  G.push({ pts: ov, fill: g.oval[0] })
  const ov2: Pt3[] = []
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2
    ov2.push([329 + 36 * Math.cos(a), 211 + 22 * Math.sin(a), 0])
  }
  G.push({ pts: ov2, fill: g.oval[1] })
  G.push({ pts: rect(0, 142, 400, 158), fill: g.road })
  G.push({ pts: rect(0, 265, 400, 275), fill: g.roadLight })
  G.push({ pts: rect(102, 46, 118, 400), fill: g.road })
  G.push({ pts: rect(245, 46, 255, 338), fill: g.roadLight })
  G.push({ pts: rect(0, 338, 400, 352), fill: g.rail })
  G.push({ pts: rect(0, 342, 400, 343.2), fill: g.railLine })
  G.push({ pts: rect(0, 347, 400, 348.2), fill: g.railLine })
  for (let i = 4; i < 400; i += 14) {
    if (i > 96 && i < 124) continue
    G.push({ pts: rect(i, 149.4, i + 6, 150.6), fill: g.laneMark })
  }
  for (let i = 52; i < 338; i += 14) {
    if (i > 136 && i < 164) continue
    if (i > 259 && i < 281) continue
    G.push({ pts: rect(109.4, i, 110.6, i + 6), fill: g.laneMark })
  }
  const WALL = geo.wallColours, ROOF = geo.roofColours
  const terraces = (x0: number, x1: number, y: number, d: number) => {
    for (let x = x0 + 2; x + 8.5 <= x1 - 2; x += 9.1) {
      if (R() < 0.07) continue
      const two = R() < 0.3, h = two ? 8.5 : 6
      const w = WALL[Math.floor(R() * WALL.length)], r = ROOF[Math.floor(R() * ROOF.length)]
      houses.push({ x, y, w: 8.5, d, h, wall: w, roof: r })
    }
  }
  const shops = (x0: number, x1: number, y: number, d: number) => {
    for (let x = x0 + 2; x + 11 <= x1 - 2; x += 11.8) {
      const h = 8 + R() * 3, w = geo.shopWallColours[Math.floor(R() * 6)]
      houses.push({ x, y, w: 11, d, h, wall: w, roof: '#b9b3a8', shop: true })
    }
  }
  blocks.forEach((b) => {
    const [x0, x1, y0, y1, kind] = b
    if (kind === 'shops') {
      terraces(x0, x1, y0 + 3, 15)
      shops(x0, x1, y1 - 16, 14)
    } else if (kind === 'res') {
      terraces(x0, x1, y0 + 2, 15)
      terraces(x0, x1, y1 - 17, 15)
    } else if (kind === 'res1') terraces(x0, x1, y0 + 3, 15)
    if (kind !== 'park' && y1 - y0 > 50) {
      const n = Math.floor((x1 - x0) / 20)
      for (let j = 0; j < n; j++) {
        if (R() < 0.45) {
          const jac = R() < 0.3
          const x = x0 + 8 + j * 20 + R() * 6
          const y = (y0 + y1) / 2 + (R() - 0.5) * 8
          const h = 9 + R() * 4
          const r = 4 + R() * 2.5
          T.push({ x, y, h, r, c: jac ? TR.jacaranda : TR.street })
        }
      }
    }
  })
  // Specials replace houses.
  const take = (x0: number, x1: number, y0: number, y1: number) => {
    houses = houses.filter((h) => !(h.x + h.w > x0 && h.x < x1 && h.y + h.d > y0 && h.y < y1))
  }
  take(150, 176, 120, 142)
  take(118, 136, 120, 142)
  take(270, 345, 280, 330)
  let mh: { h: House; dm: number } | null = null
  let dh: { h: House; dd: number } | null = null
  houses.forEach((h) => {
    const dm = Math.hypot(h.x - 196, h.y - 160), dd = Math.hypot(h.x - 44, h.y - 160)
    if (!mh || dm < mh.dm) mh = { h, dm }
    if (!dh || dd < dh.dd) dh = { h, dd }
  })
  const home = (mh as { h: House } | null)!.h, david = (dh as { h: House } | null)!.h
  home.wall = '#ffffff'
  home.roof = '#14a08c'
  home.h = 7
  david.wall = '#e3ecf8'
  david.roof = '#2f6fb0'
  houses.forEach((h) => {
    boxF(F, h.x, h.y, h.w, h.d, h.h, h.wall, h.roof, h.shop ? {} : { gable: true, rh: 3 })
    if (h.shop) boxF(F, h.x, h.y + h.d - 0.2, h.w, 2.4, 0.5, geo.awningColours[Math.floor(R() * 4)], '#c9c2b5', { z0: 3.6 })
  })
  boxF(F, 150, 124, 24, 16, 11, '#f6f9f8', '#a9c6c1') // GP clinic
  boxF(F, 159, 139.6, 6, 1, 6, '#ffffff', '#ef4e4a', { z0: 3 })
  boxF(F, 120, 126, 14, 14, 8, '#eaf6f2', '#2fae96') // pharmacy
  boxF(F, 276, 286, 58, 30, 10, '#dcc596', '#a98f62') // library
  boxF(F, 300, 298, 9, 9, 20, '#d4bb88', '#8d7650')
  boxF(F, 126, 340.5, 70, 7, 1.3, '#cfc6b6', '#d9d2c4') // station
  boxF(F, 148, 342, 24, 4, 3.6, '#5f6b70', '#4c565a', { z0: 1.3 })
  for (let i = 8; i < 400; i += 22) {
    if (i > 96 && i < 126) continue
    T.push({ x: i, y: 144, h: 8, r: 3.4, c: TR.street })
    T.push({ x: i + 11, y: 156, h: 8, r: 3.4, c: R() < 0.3 ? TR.jacaranda : TR.street })
  }
  for (let i = 10; i < 400; i += 17) {
    const y = 30 + R() * 12, h = 9 + R() * 4, r = 4 + R() * 2
    T.push({ x: i, y, h, r, c: R() < 0.2 ? TR.jacaranda : TR.riverside })
  }
  for (let i = 0; i < 26; i++) {
    const a2 = R() * Math.PI * 2, rr = 52 + R() * 16
    const x = Math.max(260, Math.min(396, 329 + rr * Math.cos(a2)))
    const y = Math.max(162, Math.min(262, 211 + rr * 0.7 * Math.sin(a2)))
    const h = 10 + R() * 5, r = 4.5 + R() * 2.5
    T.push({ x, y, h, r, c: R() < 0.35 ? TR.jacaranda : TR.riverside })
  }
  return {
    faces: F,
    ground: G,
    trees: T,
    home: { x: home.x + 4, y: home.y + 7 },
    david: { x: david.x + 4, y: david.y + 7 },
  }
}

/** MapPin from the data layer → render pin. Pins without fixed coordinates sit on the generated houses. */
function toPin(p: MapPin, base: SuburbBase): CityPin {
  const at = p.at ?? (p.big ? { ...base.home, z: 12 } : { ...base.david, z: 10 })
  const pin: CityPin = { x: at.x, y: at.y, z: at.z, name: p.name, sub: p.sub ?? '', c: p.color, ini: p.initials }
  if (p.detail != null) pin.d = p.detail
  if (p.ink) pin.ink = p.ink
  if (p.big) pin.big = true
  if (p.phase != null) pin.ph = p.phase
  if (p.tag) pin.tag = true
  return pin
}

const toLabels = (labels: Surroundings['homeMap']['labels']): CityLabel[] =>
  labels.map((l) => (l.bold ? { t: l.text, x: l.x, y: l.y, b: true } : { t: l.text, x: l.x, y: l.y }))

/** Home page map (`city`, line 1401): pins, "5 MIN WALK" ring and David's walking route. */
export function homeScene(base: SuburbBase, map: Surroundings['homeMap']): CityModel {
  const { home, david } = base
  return {
    faces: base.faces,
    ground: base.ground,
    trees: base.trees,
    pins: map.pins.map((p) => toPin(p, base)),
    rings: [{ x: home.x, y: home.y, r: map.walkRing.radius, c: 'rgba(20,160,140,.75)', label: map.walkRing.label }],
    routes: [{ pts: [[david.x, 158], [david.x, 150], [home.x, 150], [home.x, 158]], c: '#2f6fb0' }],
    labels: toLabels(map.labels),
  }
}

/** Surroundings page map (`watchMap`, lines 1664–1676): alert pins, watch ring and the detour route. */
export function watchScene(
  base: SuburbBase,
  pins: MapPin[],
  ring: Surroundings['watchMap']['ring'],
  labels: Surroundings['homeMap']['labels'],
): CityModel {
  const { home } = base
  return {
    faces: base.faces,
    ground: base.ground,
    trees: base.trees,
    pins: pins.map((p) => toPin(p, base)),
    rings: [{ x: home.x, y: home.y, r: ring.radius, c: 'rgba(217,68,63,.6)', label: ring.label }],
    routes: [{ pts: [[home.x, 158], [home.x, 270], [60, 270]], c: '#c88a05' }],
    labels: toLabels(labels),
  }
}

/**
 * `buildDistrict(m)` (line 1325): one tile per suburb coloured by heat
 * vulnerability, a column whose height and colour follow `values`, and a tag
 * reading `${value}${suffix}`. The metric itself (DM high/alone/heat/gap) is
 * computed by the caller.
 */
export function buildDistrict(suburbs: Suburb[], values: number[], suffix: string, highlight = 'Marrickville'): CityModel {
  const F: Face[] = [], G: Face[] = [], P: CityPin[] = []
  slab(F, G, 400, 320, '#e6ece2', '#b9b09e')
  const mx = Math.max(...values) || 1
  suburbs.forEach((s, i) => {
    const x0 = s.col * 80 + 5, y0 = s.row * 80 + 5, v = values[i], t = v / mx
    if (s.name === highlight) G.push({ pts: rect(x0 - 2.5, y0 - 2.5, x0 + 72.5, y0 + 72.5), fill: '#14a08c' })
    G.push({ pts: rect(x0, y0, x0 + 70, y0 + 70), fill: ramp(s.heat, ['#e6f1ee', '#f6deb8', '#f0a681']) })
    const h = 6 + t * 110, col = ramp(t, ['#8fd3c3', '#e2a32c', '#d9443f'])
    const ch = rgbHex(col)
    boxF(F, x0 + 20, y0 + 20, 30, 30, h, ch, shade(ch, 1.15))
    P.push({ x: x0 + 35, y: y0 + 35, z: h + 6, name: s.name, sub: v + suffix, c: s.name === highlight ? '#14a08c' : col, ini: '', tag: true })
  })
  return { faces: F, ground: G, trees: [], pins: P, labels: [] }
}
