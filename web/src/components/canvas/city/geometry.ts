import { luminance, ramp, rgbHex, shade } from '@/lib/color'
import { rng } from '@/lib/rng'
import type { CityGeometry, MapPin, Suburb, Surroundings } from '@/data/types'
import { INNER_WEST_BOUNDARIES, INNER_WEST_CONTEXT, INNER_WEST_PLATE } from '@/domain/innerWestBoundaries'
import { MARRICKVILLE_MAP, streetPoint } from '@/domain/marrickvilleMap'
import type { MapIcon } from './icons'
import type { CityLabel, CityLine, CityModel, CityPin, CityText, Face, Pt3, Tree } from './types'

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

/** Light from +x/−y, as `boxF`'s wall shades. */
const LIGHT = -Math.PI / 4

/** Column colour from the lowest (0) to the highest (1) value; the Google 3D map uses it too. */
export const DISTRICT_RAMP = ['#ffe3c2', '#f9b26e', '#ef7350', '#d63f3f'] as const

/** Map units: 20 m each, origin at the plate's south-west corner, +y north (away from the camera). */
const UNIT = 20
const [W0, S0, E0, N0] = INNER_WEST_PLATE
const COS = Math.cos((((S0 + N0) / 2) * Math.PI) / 180)
const toMap = ([lng, lat]: [number, number]): [number, number] => [((lng - W0) * COS * 111320) / UNIT, ((lat - S0) * 110540) / UNIT]
/** Plate size in map units (the `district` camera's `size`). */
export const DISTRICT_SIZE = toMap([E0, N0]).map(Math.round) as [number, number]

/** Footprint (map units²) below which a roof carries only its value: Enmore, Lewisham and Sydenham. */
const SMALL_ROOF = 2000

/** Area centroid of a ring (falls back to the vertex mean for a degenerate one). */
function centroid(r: [number, number][]): [number, number] {
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < r.length; i++) {
    const [x0, y0] = r[i], [x1, y1] = r[(i + 1) % r.length], c = x0 * y1 - x1 * y0
    a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
  }
  if (Math.abs(a) < 1e-9) return [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length]
  return [cx / (3 * a), cy / (3 * a)]
}

/**
 * Inner West district map: every suburb's real boundary (ABS SAL 2021) extruded to its value and tinted by it, with
 * the value and name printed on its roof. Faces sort by the suburb's own footprint (`key`) so each suburb paints as
 * one block, walls first. Each suburb also gets a hit-only tag pin for the tap toast. The metric
 * (high/alone/heat/gap) comes from the caller.
 */
export function buildDistrict(suburbs: Suburb[], values: number[], suffix: string, highlight = 'Marrickville'): CityModel {
  const F: Face[] = [], G: Face[] = [], P: CityPin[] = [], X: CityText[] = []
  const mx = Math.max(...values) || 1
  const rings = suburbs.map((s) => (INNER_WEST_BOUNDARIES[s.name] ?? []).map(toMap))
  // A water-blue plate; the surrounding suburbs flat on it as land, so the bays show where there is none.
  // No walls: the map fades out before the plate's edge (cover view).
  G.push({ pts: rect(0, 0, DISTRICT_SIZE[0], DISTRICT_SIZE[1]), fill: '#d6e9f0' })
  INNER_WEST_CONTEXT.forEach((r) => G.push({ pts: r.map((p) => [...toMap(p), 0] as Pt3), fill: '#eef0ea', stroke: '#ffffff', lw: 0.8 }))
  // A soft shadow under each suburb.
  rings.forEach((r) => r.length && G.push({ pts: r.map(([x, y]) => [x + 3, y + 5, 0] as Pt3), fill: 'rgba(28,52,50,.14)' }))
  suburbs.forEach((s, i) => {
    const r = rings[i]
    if (!r.length) return
    const v = values[i], t = v / mx, h = 2 + t * 22, mine = s.name === highlight
    const col = rgbHex(ramp(t, DISTRICT_RAMP)), [cx, cy] = centroid(r), key: Pt3 = [cx, cy, 0]
    // Outward wall normals need the ring's winding.
    let area = 0
    for (let k = 0; k < r.length; k++) area += r[k][0] * r[(k + 1) % r.length][1] - r[(k + 1) % r.length][0] * r[k][1]
    const wind = area > 0 ? 1 : -1
    for (let k = 0; k < r.length; k++) {
      const [x0, y0] = r[k], [x1, y1] = r[(k + 1) % r.length]
      const nx = (y1 - y0) * wind, ny = -(x1 - x0) * wind, n = Math.atan2(ny, nx)
      const fill = shade(col, 0.74 + 0.2 * Math.cos(n - LIGHT))
      F.push({ pts: [[x0, y0, 0], [x1, y1, 0], [x1, y1, h], [x0, y0, h]], fill, stroke: fill, key })
    }
    F.push({ pts: r.map(([x, y]) => [x, y, h] as Pt3), fill: shade(col, 1.08), stroke: mine ? '#0b7f71' : 'rgba(255,255,255,.95)', lw: mine ? 2.5 : 1.2, key, last: true })
    // A roof too small for its name shows the value alone (the tap toast still names it).
    X.push({ x: cx, y: cy, z: h, t: String(v), sub: Math.abs(area) / 2 < SMALL_ROOF ? '' : s.name, light: luminance(col) < 0.3 })
    P.push({ x: cx, y: cy, z: h, name: s.name, sub: v + suffix, c: mine ? '#14a08c' : col, ini: '', tag: true, ghost: true })
  })
  return { faces: F, ground: G, trees: [], pins: P, labels: [], texts: X }
}

/** Streets base: the static OpenStreetMap layer plus where Margaret's and David's houses stand. */
export interface StreetBase {
  faces: Face[]
  ground: Face[]
  trees: Tree[]
  lines: CityLine[]
  home: { x: number; y: number; z: number }
  david: { x: number; y: number; z: number }
}

/** Sydney roofs: terracotta tile and grey or charcoal sheet for houses; flat, paler roofs for the bigger buildings. */
const ROOFS: Record<string, readonly string[]> = {
  house: ['#d4977d', '#cb8c72', '#dca58c', '#c08670', '#b3bbbf', '#a3acb2', '#c4b7aa'],
  apartments: ['#d3d9de', '#c9d1d8'],
  retail: ['#ddd2c1', '#d4c9b6'],
  commercial: ['#ddd2c1', '#d2cdc4'],
  industrial: ['#cfd3cf'],
  garage: ['#cbc6bd'],
  shed: ['#cbc6bd'],
}
const WALLS = ['#f5efe5', '#efe6d9', '#f7f2ea', '#ebe3d6', '#f2ebe0'] as const
/** Kinds that get a pitched roof when small and near-rectangular. */
const PITCHED = new Set(['house', 'detached', 'semidetached_house', 'terrace', 'yes', 'garage', 'shed'])
const STREET_TREE = ['#a5d394', '#5f9f5b'] as const, JACARANDA = ['#cdb7f2', '#8f6fd0'] as const

function ringCentre(r: [number, number][]): [number, number] {
  return [r.reduce((a, p) => a + p[0], 0) / r.length, r.reduce((a, p) => a + p[1], 0) / r.length]
}

const ringArea = (r: [number, number][]) => {
  let a = 0
  for (let k = 0; k < r.length; k++) a += r[k][0] * r[(k + 1) % r.length][1] - r[(k + 1) % r.length][0] * r[k][1]
  return a / 2
}

/** Minimum-area bounding rectangle (over the footprint's edge directions): centre, long axis, half-lengths. */
function orientedBox(r: [number, number][]) {
  let best: { area: number; cx: number; cy: number; ux: number; uy: number; a: number; b: number } | null = null
  for (let k = 0; k < r.length; k++) {
    const [x0, y0] = r[k], [x1, y1] = r[(k + 1) % r.length], l = Math.hypot(x1 - x0, y1 - y0)
    if (l < 1e-6) continue
    const ux = (x1 - x0) / l, uy = (y1 - y0) / l
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity
    r.forEach(([x, y]) => {
      const u = x * ux + y * uy, v = -x * uy + y * ux
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v)
    })
    const area = (u1 - u0) * (v1 - v0)
    if (best && area >= best.area) continue
    const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2
    // Long axis first.
    const long = u1 - u0 >= v1 - v0
    best = {
      area, cx: uc * ux - vc * uy, cy: uc * uy + vc * ux,
      ux: long ? ux : -uy, uy: long ? uy : ux, a: (long ? u1 - u0 : v1 - v0) / 2, b: (long ? v1 - v0 : u1 - u0) / 2,
    }
  }
  return best!
}

const facing = (col: string, nx: number, ny: number, k = 0.18) => shade(col, 0.8 + k * Math.cos(Math.atan2(ny, nx) - LIGHT))

/** Flat-roofed block: walls shaded by facing, the roof with a darker parapet edge, sorted by its footprint centre. */
function flatBuilding(F: Face[], r: [number, number][], h: number, wall: string, roof: string): void {
  const [cx, cy] = ringCentre(r), key: Pt3 = [cx, cy, 0], wind = ringArea(r) > 0 ? 1 : -1
  for (let k = 0; k < r.length; k++) {
    const [x0, y0] = r[k], [x1, y1] = r[(k + 1) % r.length], fill = facing(wall, (y1 - y0) * wind, -(x1 - x0) * wind)
    F.push({ pts: [[x0, y0, 0], [x1, y1, 0], [x1, y1, h], [x0, y0, h]], fill, stroke: fill, key })
  }
  F.push({ pts: r.map(([x, y]) => [x, y, h] as Pt3), fill: roof, stroke: shade(roof, 0.78), lw: 1, key, last: true })
}

/**
 * A house: its footprint's bounding rectangle as four walls, and a pitched roof whose ridge runs along the long axis,
 * with a small overhang; each slope is shaded by the way it faces, the gable ends take the wall colour.
 */
function pitchedHouse(F: Face[], box: ReturnType<typeof orientedBox>, h: number, wall: string, roof: string): void {
  const { cx, cy, ux, uy, a, b } = box, vx = -uy, vy = ux, key: Pt3 = [cx, cy, 0]
  const at = (u: number, v: number, z: number): Pt3 => [cx + u * ux + v * vx, cy + u * uy + v * vy, z]
  const c: [number, number][] = [[-a, -b], [a, -b], [a, b], [-a, b]]
  c.forEach(([u0, v0], i) => {
    const [u1, v1] = c[(i + 1) % 4], nu = (u0 + u1) / 2, nv = (v0 + v1) / 2
    const fill = facing(wall, nu * ux + nv * vx, nu * uy + nv * vy)
    F.push({ pts: [at(u0, v0, 0), at(u1, v1, 0), at(u1, v1, h), at(u0, v0, h)], fill, stroke: fill, key })
  })
  const rise = Math.min(b * 0.75, 2.6), o = 0.35, ridge = h + rise
  // Two slopes (eave to ridge) and two gable triangles.
  ;[-1, 1].forEach((side) => {
    const fill = facing(roof, side * vx, side * vy, 0.28)
    F.push({ pts: [at(-a - o, side * (b + o), h - 0.2), at(a + o, side * (b + o), h - 0.2), at(a + o, 0, ridge), at(-a - o, 0, ridge)], fill, stroke: shade(fill, 0.86), key, last: true })
    const g = facing(wall, side * ux, side * uy)
    F.push({ pts: [at(side * a, -b, h), at(side * a, b, h), at(side * a, 0, ridge)], fill: g, stroke: g, key, last: true })
  })
}

/** One building: a pitched house when it is a small near-rectangular dwelling, else a flat-roofed block. */
function building(F: Face[], r: [number, number][], h: number, kind: string, wall: string, roof: string): void {
  const box = orientedBox(r), area = Math.abs(ringArea(r))
  if (PITCHED.has(kind) && area < 60 && area / (4 * box.a * box.b) > 0.72 && box.b > 0.8) pitchedHouse(F, box, h, wall, roof)
  else flatBuilding(F, r, h, wall, roof)
}

/** Margaret's streets from OpenStreetMap (`MARRICKVILLE_MAP`): plate, parks, water, roads, rail, buildings and trees. */
export function buildStreets(): StreetBase {
  const M = MARRICKVILLE_MAP, F: Face[] = [], G: Face[] = [], L: CityLine[] = [], T: Tree[] = []
  const R = rng(5)
  G.push({ pts: rect(0, 0, M.size[0], M.size[1]), fill: '#eef0ea' })
  M.railLand.forEach((r) => G.push({ pts: r.map(([x, y]) => [x, y, 0] as Pt3), fill: '#e4e2db' }))
  M.greens.forEach((r) => G.push({ pts: r.map(([x, y]) => [x, y, 0] as Pt3), fill: '#d3e9c6' }))
  M.water.forEach((r) => G.push({ pts: r.map(([x, y]) => [x, y, 0] as Pt3), fill: '#c4e2ec' }))
  // Minor ways first, then the main roads with a soft casing on top.
  M.roads.filter((r) => !r.major).forEach((r) => L.push({ pts: r.pts, w: r.w, c: r.w < 1 ? 'rgba(255,255,255,.8)' : '#ffffff' }))
  M.roads.filter((r) => r.major).forEach((r) => L.push({ pts: r.pts, w: r.w + 0.8, c: '#e3dccb' }))
  M.roads.filter((r) => r.major).forEach((r) => L.push({ pts: r.pts, w: r.w, c: '#fff8e6' }))
  M.rails.forEach((r) => {
    L.push({ pts: r, w: 1.6, c: '#aaa49a' })
    L.push({ pts: r, w: 1.6, c: '#ffffff', dash: [1, 2] })
  })
  let home = { x: 0, y: 0, z: 0 }, david = { x: 0, y: 0, z: 0 }
  M.buildings.forEach((b) => {
    const pal = ROOFS[b.k] ?? ROOFS.house, roof = pal[Math.floor(R() * pal.length)]
    // Far out (under the fade) a building is just its footprint: cheap to draw while turning.
    if (b.far) {
      G.push({ pts: b.r.map(([x, y]) => [x, y, 0] as Pt3), fill: shade(roof, 0.97) })
      return
    }
    // A little taller than life so the low terraces still read as blocks at this scale.
    const h = b.h * 1.1, wall = WALLS[Math.floor(R() * WALLS.length)]
    if (b.role === 'home') {
      building(F, b.r, h, b.k, '#ffffff', '#14a08c')
      home = { x: ringCentre(b.r)[0], y: ringCentre(b.r)[1], z: h + 2 }
    } else if (b.role === 'david') {
      building(F, b.r, h, b.k, '#e3ecf8', '#2f6fb0')
      david = { x: ringCentre(b.r)[0], y: ringCentre(b.r)[1], z: h + 2 }
    } else building(F, b.r, h, b.k, wall, roof)
  })
  // Full crowns on short trunks, so they read as trees from above rather than as pins.
  M.trees.forEach(([x, y, r, jac]) => T.push({ x, y, h: r * 2, r: r * 1.5, c: jac ? JACARANDA : STREET_TREE }))
  return { faces: F, ground: G, trees: T, lines: L, home, david }
}

/** The glyph on a home-map marker, from its kind (and, inside a kind, its initials). */
function markerIcon(p: MapPin): MapIcon {
  if (p.tag) return 'hospital'
  if (p.kind === 'home') return 'house'
  if (p.kind === 'family') return 'user-round'
  if (p.kind === 'health') return p.initials === 'Rx' ? 'pill' : 'stethoscope'
  if (p.kind === 'community') return p.initials === 'L' ? 'book-open' : 'footprints'
  return 'users'
}

/** Legacy home-map units (the procedural model) in metres, for ring radii given in them. */
const LEGACY_M = 3.4

/** Home page map on the real streets: pins at their lat/lng, the walk ring around her house, David's walk to her door. */
export function streetHomeScene(base: StreetBase, map: Surroundings['homeMap']): CityModel {
  const { home, david } = base, M = MARRICKVILLE_MAP
  const pins = map.pins.map((p): CityPin => {
    const [x, y] = p.geo ? streetPoint(p.geo.lat, p.geo.lng) : [M.size[0] * 0.8, M.size[1] * 0.36]
    const at = p.big ? home : p.kind === 'family' ? david : { x, y, z: 4 }
    const pin: CityPin = { x: at.x, y: at.y, z: at.z + 2, name: p.name, sub: p.sub ?? '', c: p.color, ini: p.initials }
    if (p.detail != null) pin.d = p.detail
    if (p.ink) pin.ink = p.ink
    if (p.big) pin.big = true
    if (p.phase != null) pin.ph = p.phase
    if (p.tag) pin.tag = true
    pin.icon = markerIcon(p)
    return pin
  })
  const labels = map.labels.flatMap((l, i): CityLabel[] => {
    const a = M.labels[i]
    if (!a) return []
    const label: CityLabel = { t: l.text, x: a[0], y: a[1] }
    if (l.bold) label.b = true
    if (a[2] != null) label.a = a[2]
    return [label]
  })
  return {
    faces: base.faces,
    ground: base.ground,
    trees: base.trees,
    lines: base.lines,
    pins,
    rings: [{ x: home.x, y: home.y, r: (map.walkRing.radius * LEGACY_M) / M.unit, c: 'rgba(20,160,140,.75)', label: map.walkRing.label }],
    // From his marker (his house's centre) along the streets to her door.
    routes: [{ pts: [[david.x, david.y], ...M.davidRoute.slice(1)], c: '#2f6fb0' }],
    labels,
    modern: true,
  }
}
