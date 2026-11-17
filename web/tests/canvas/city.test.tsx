import { render } from '@testing-library/react'
import { createRef } from 'react'
import { buildDistrict, buildStreets, buildSuburb, homeScene, streetHomeScene, streetWatchScene, watchScene } from '@/components/canvas/city/geometry'
import { cityHit, drawCityFrame, pinText } from '@/components/canvas/city/draw'
import type { CanvasFonts } from '@/components/canvas/fonts'
import { City3D } from '@/components/canvas/City3D'
import { DistrictMap } from '@/components/canvas/DistrictMap'
import type { Canvas3DHandle } from '@/components/canvas/useCanvas3D'
import { cityScene } from '@/data/fixtures/city'
import aroundData from '@/locales/en/data/around.json'
import communityData from '@/locales/en/data/government.json'
import type { GovernmentData } from '@/data/government.types'
import type { Surroundings } from '@/data/types'

/** The families the prototype writes into `ctx.font`. The app's own stack adds an Arabic face after them; the frame geometry is what is compared here. */
const PROTOTYPE_FONTS: CanvasFonts = { sans: '"Be Vietnam Pro",system-ui', mono: '"JetBrains Mono",monospace' }

const surroundings = aroundData.surroundings as unknown as Surroundings
const government = communityData.government as unknown as GovernmentData
import { loadPrototype } from './prototype'
import { fakeCtx, mockCanvas, mockLayout, mockRaf, setReducedMotion, type FakeCtx } from './fakeCtx'

/* eslint-disable @typescript-eslint/no-explicit-any */
const P0 = loadPrototype()
/** The old Sydney prototype draws the geometry this app keeps; its place names are now the Abu Dhabi ones, so they are mapped before comparing. */
const NAMES: Record<string, string> = {
  "Margaret's home": "Moza's home", 'David (brother)': 'Hamad (brother)', 'Margaret': 'Moza', 'Library cool room': 'Community majlis cool room',
  '→ Stroke centre 4.2 km': '→ Corniche Stroke Centre 3.4 km', 'Marrickville Rd': 'Al Khaleej Al Arabi St', 'Illawarra Rd': 'Al Bateen St',
  'Calvert St': 'Street 18', 'Victoria Rd': 'Street 9', 'Cooks River': 'Khor Al Bateen', 'Calvert Reserve': 'Al Bateen Park',
  'Marrickville Station': 'Bus stop', 'Thu 9:00 · Calvert Reserve': 'Thu 9:00 · Al Bateen Park',
  'Illawarra Rd Family Practice · Dr Patel · 350 m': 'Al Bateen Family Health Centre · Dr Fatima Al Ali · 350 m',
  'Camperdown Stroke Centre · north-east · 11 min by ambulance': 'Corniche Stroke Centre · north-east · 11 min by ambulance',
}
const localize = (o: any): any => (typeof o === 'string' ? (NAMES[o] ?? o) : Array.isArray(o) ? o.map(localize) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, localize(v)])) : o)
const P = new Proxy(P0, { get: (t, k) => (k === 'buildSuburb' ? (...a: any[]) => localize((t as any).buildSuburb(...a)) : (t as any)[k]) })
const flags = (o: any) => {
  const r = { ...o }
  for (const k of ['big', 'tag', 'b']) if (k in r) r[k] = !!r[k]
  delete r.s
  if (!r.ini) delete r.ini // tags carry no initials
  return r
}
const normCalls = (c: FakeCtx) => ({
  calls: c.calls.map((x) => ({ fn: x.fn, args: x.args.map((a) => (a instanceof HTMLCanvasElement ? 'canvas' : a)) })),
  sets: c.sets,
})

test('buildSuburb reproduces the prototype model (seed 11) face for face', () => {
  const proto = P.buildSuburb()
  const base = buildSuburb(cityScene)
  expect(base.ground).toEqual(proto.ground)
  expect(base.faces).toEqual(proto.faces)
  expect(base.trees).toEqual(proto.trees)
  expect(base.home).toEqual({ x: proto.pins[0].x, y: proto.pins[0].y })
  expect(base.david).toEqual({ x: proto.pins[1].x, y: proto.pins[1].y })
})

test('home scene places pins, the 5-minute ring, the walk route and street labels like the prototype', () => {
  const proto = P.buildSuburb()
  const m = homeScene(buildSuburb(cityScene), surroundings.homeMap)
  expect(m.pins.map(flags)).toEqual(proto.pins.map(flags))
  expect(m.rings).toEqual(proto.rings)
  expect(m.routes).toEqual(proto.routes)
  expect(m.labels!.map(flags)).toEqual(proto.labels.map(flags))
})

test('watch scene matches the prototype surroundings map', () => {
  const proto = P.buildSuburb(), home = proto.pins[0]
  const m = watchScene(buildSuburb(cityScene), surroundings.pins, surroundings.watchMap.ring, surroundings.homeMap.labels)
  expect(m.pins[0]).toMatchObject({ x: home.x, y: home.y, z: 12, name: 'Moza', d: 'Home', big: true })
  expect(m.pins.map((p) => [p.x, p.y, p.z, p.name, p.c, p.ini, p.ph])).toEqual([
    [home.x, home.y, 12, 'Moza', '#14a08c', 'M', undefined],
    [225, 146, 2, 'Footpath works', '#c88a05', '!', 0.2],
    [70, 205, 8, 'Scam reported', '#d9443f', '!', 0.4],
    [160, 270, 6, 'Street light out', '#c88a05', '☾', 0.6],
    [350, 235, 6, 'Path resurfacing', '#c88a05', 'P', 0.8],
    [60, 36, 2, 'Walkway lights out', '#c88a05', '☾', 0.1],
    [305, 301, 21, 'Cool room', '#1fb39c', 'M', 0.5],
    [127, 133, 9, 'Vaccines', '#1fb39c', '+', 0.7],
  ])
  expect(m.routes).toEqual([{ pts: [[home.x, 158], [home.x, 270], [60, 270]], c: '#c88a05' }])
  expect(m.rings).toEqual([{ x: home.x, y: home.y, r: 150, c: 'rgba(217,68,63,.6)', label: 'WATCH AREA' }])
})

test('buildDistrict: one block per area, its value and name printed on its roof, the tallest for the biggest value', () => {
  const values = government.areas.map((a) => a.actionable)
  const m = buildDistrict(government.areas, values, ' open')
  expect(m.texts).toHaveLength(government.areas.length)
  expect(m.pins).toHaveLength(government.areas.length)
  m.pins.forEach((p, i) => {
    expect(p).toMatchObject({ name: government.areas[i].name, sub: values[i] + ' open', card: true })
    expect(m.texts![i]).toMatchObject({ t: String(values[i]), z: p.z })
    // Every column's roof is big enough for its name.
    expect(m.texts![i].sub).toBe(p.name)
  })
  const top = values.indexOf(Math.max(...values))
  expect(Math.max(...m.pins.map((p) => p.z))).toBe(m.pins[top].z)
})

test('district map: every area is tappable on its roof', () => {
  const view = cityScene.views.district
  const values = government.areas.map((a) => a.actionable)
  const m = buildDistrict(government.areas, values, ' open')
  const buf = document.createElement('canvas')
  buf.width = 800; buf.height = 600
  const hits = drawCityFrame(fakeCtx(), { canvas: buf, ctx: fakeCtx(), key: '' }, m, view, {
    width: 400, height: 300, dpr: 2, yaw: view.yaw, now: 0, night: false, reduced: true, fonts: PROTOTYPE_FONTS,
  })
  expect(new Set(hits.map((h) => h.p))).toEqual(new Set(m.pins))
})

function protoFrame(view: any, model: any, opts: { yaw?: number; now: number; night?: boolean }) {
  const made = mockCanvas()
  document.body.classList.toggle('night', !!opts.night)
  const el = document.createElement('div')
  el.appendChild(document.createElement('canvas'))
  const city = new P.City3D(el, { ...view, size: [...view.size] })
  city.setModel(model)
  if (opts.yaw != null) {
    city.rotate(opts.yaw - view.yaw)
    for (let i = 0; i < 400; i++) city.frame(0.05, 0) // settle the eased rotation
    made[0].calls.length = 0; made[0].sets.length = 0; made[1].calls.length = 0; made[1].sets.length = 0
    model = { ...model } // force a static re-render below
    city.setModel(model)
  }
  city.frame(0.016, opts.now)
  document.body.classList.remove('night')
  return { ctx: made[0], bx: made[1] }
}

function ourFrame(view: any, model: any, opts: { yaw?: number; now: number; night?: boolean }) {
  const ctx = fakeCtx(), bx = fakeCtx()
  const buf = document.createElement('canvas')
  buf.width = 800; buf.height = 600
  drawCityFrame(ctx, { canvas: buf, ctx: bx, key: '' }, model, view, {
    width: 400, height: 300, dpr: 2, yaw: opts.yaw ?? view.yaw, now: opts.now, night: !!opts.night, reduced: false, fonts: PROTOTYPE_FONTS,
  })
  return { ctx, bx }
}

describe('City3D frame is drawn call for call like the prototype', () => {
  beforeEach(() => {
    mockLayout(400, 300)
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true })
  })

  test('home map', () => {
    const view = cityScene.views.home
    const proto = protoFrame(view, P.buildSuburb(), { now: 1234 })
    const ours = ourFrame(view, homeScene(buildSuburb(cityScene), surroundings.homeMap), { now: 1234 })
    expect(normCalls(ours.bx)).toEqual(normCalls(proto.bx))
    expect(normCalls(ours.ctx)).toEqual(normCalls(proto.ctx))
  })

  test('home map at night, rotated', () => {
    const view = cityScene.views.home
    const proto = protoFrame(view, P.buildSuburb(), { now: 98765, night: true, yaw: view.yaw + Math.PI / 4 })
    const ours = ourFrame(view, homeScene(buildSuburb(cityScene), surroundings.homeMap), { now: 98765, night: true, yaw: view.yaw + Math.PI / 4 })
    expect(normCalls(ours.bx)).toEqual(normCalls(proto.bx))
    expect(normCalls(ours.ctx)).toEqual(normCalls(proto.ctx))
  })
})

test('tap text and hit testing follow the prototype toast', () => {
  const m = homeScene(buildSuburb(cityScene), surroundings.homeMap)
  expect(pinText(m.pins[0])).toBe("Moza's home · Home")
  expect(pinText(m.pins[1])).toBe('Hamad (brother) · 450 m · 6 min walk')
  const hits = [{ x: 0, y: 0, w: 10, h: 10, p: m.pins[0] }, { x: 5, y: 5, w: 10, h: 10, p: m.pins[1] }]
  expect(cityHit(hits, 7, 7)).toBe(m.pins[1]) // last drawn wins
  expect(cityHit(hits, 2, 2)).toBe(m.pins[0])
  expect(cityHit(hits, 50, 50)).toBeNull()
})

describe('components', () => {
  beforeEach(() => {
    mockCanvas()
    mockLayout(400, 300)
    mockRaf()
    setReducedMotion(true)
  })

  test('City3D is an labelled image with a grab canvas and rotate/reset handle', () => {
    const ref = createRef<Canvas3DHandle>()
    const scene = homeScene(buildSuburb(cityScene), surroundings.homeMap)
    const { container } = render(<City3D ref={ref} scene={scene} view={cityScene.views.home} ariaLabel={surroundings.homeMap.ariaLabel} />)
    const host = container.querySelector('.c3d')!
    expect(host).toHaveAttribute('role', 'img')
    expect(host).toHaveAttribute('aria-label', surroundings.homeMap.ariaLabel)
    expect(host.querySelector('canvas')).toBeInTheDocument()
    expect(typeof ref.current!.rotate).toBe('function')
    expect(typeof ref.current!.reset).toBe('function')
  })

  test('DistrictMap uses the prototype aria-label by default', () => {
    const values = government.areas.map((a) => a.actionable)
    const { container } = render(
      <DistrictMap areas={government.areas} metric={{ values, suffix: ' open' }} view={cityScene.views.district} />,
    )
    expect(container.querySelector('.c3d')).toHaveAttribute('aria-label', '3D column map of 17 Abu Dhabi areas')
  })
})

test('buildDistrict: the 17 areas stand on the design layout, row 0 nearest, column 0 on the left', () => {
  const values = government.areas.map((a) => a.actionable)
  const m = buildDistrict(government.areas, values, ' open')
  const at = (name: string) => m.pins.find((p) => p.name === name)!
  expect(government.areas).toHaveLength(17)
  expect(m.faces.filter((f) => f.last)).toHaveLength(17)
  expect(at('Mussafah').y).toBeGreaterThan(at('Al Bateen').y) // Mussafah is in row 2, Al Bateen in row 0
  expect(at('Saadiyat').x).toBeGreaterThan(at('Al Bateen').x) // Saadiyat is in column 4, Al Bateen in column 0
  // No two areas share a cell.
  expect(new Set(government.areas.map((a) => `${a.col},${a.row}`)).size).toBe(17)
})

test('buildDistrict: a good measure runs the colour the other way', () => {
  const values = government.areas.map((a) => a.reached)
  const bad = buildDistrict(government.areas, values, '%')
  const good = buildDistrict(government.areas, values, '%', undefined, true)
  const hi = values.indexOf(Math.max(...values))
  expect(good.pins[hi].c).not.toBe(bad.pins[hi].c)
  expect(good.pins[hi].z).toBe(bad.pins[hi].z)
})

test('streetHomeScene: the real streets, her house and David\'s marked, pins at their lat/lng, his walk ending at her door', () => {
  const base = buildStreets()
  const m = streetHomeScene(base, surroundings.homeMap)
  // Both houses were found on the map (a pitched roof shades its colour, so check positions, not fills).
  expect(base.home.x).toBeGreaterThan(0)
  expect(base.david.x).toBeGreaterThan(0)
  expect(Math.hypot(base.home.x - base.david.x, base.home.y - base.david.y)).toBeGreaterThan(50)
  expect(m.pins).toHaveLength(surroundings.homeMap.pins.length)
  const home = m.pins.find((p) => p.big)!
  expect([home.x, home.y]).toEqual([base.home.x, base.home.y])
  const gp = m.pins.find((p) => p.name === 'GP')!, pharmacy = m.pins.find((p) => p.name === 'Pharmacy')!
  expect(gp.x).toBeGreaterThan(pharmacy.x) // the GP is east of the pharmacy on Marrickville Rd
  const route = m.routes![0].pts
  expect(Math.hypot(route.at(-1)![0] - base.home.x, route.at(-1)![1] - base.home.y)).toBeLessThan(15)
  // Cooks River lies off the plate, so its label is dropped.
  expect(m.labels!.map((l) => l.t)).not.toContain('Cooks River')
})

test('streetWatchScene: alert pins at their lat/lng with a severity glyph, the watch ring round her house', () => {
  const base = buildStreets()
  const m = streetWatchScene(base, surroundings.pins, surroundings.watchMap.ring, surroundings.homeMap.labels)
  expect(m.modern).toBe(true)
  expect(m.pins).toHaveLength(surroundings.pins.length)
  const home = m.pins.find((p) => p.big)!
  expect([home.x, home.y]).toEqual([base.home.x, base.home.y])
  expect(m.pins.find((p) => p.name === 'Scam reported')!.icon).toBe('octagon-alert')
  expect(m.pins.find((p) => p.name === 'Footpath works')!.icon).toBe('triangle-alert')
  expect(m.pins.find((p) => p.name === 'Vaccines')!.icon).toBe('info')
  expect([m.rings![0].x, m.rings![0].y]).toEqual([base.home.x, base.home.y])
})
