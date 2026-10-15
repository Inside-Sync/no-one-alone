import { render } from '@testing-library/react'
import { createRef } from 'react'
import { buildDistrict, buildSuburb, homeScene, watchScene } from '@/components/canvas/city/geometry'
import { cityHit, drawCityFrame, pinText } from '@/components/canvas/city/draw'
import { DEFAULT_FONTS } from '@/components/canvas/fonts'
import { City3D } from '@/components/canvas/City3D'
import { DistrictMap } from '@/components/canvas/DistrictMap'
import type { Canvas3DHandle } from '@/components/canvas/useCanvas3D'
import { cityScene } from '@/data/fixtures/city'
import aroundData from '@/locales/en/data/around.json'
import communityData from '@/locales/en/data/community.json'
import type { CommunityData, Surroundings } from '@/data/types'

const surroundings = aroundData.surroundings as unknown as Surroundings
const community = communityData.community as unknown as CommunityData
import { loadPrototype } from './prototype'
import { fakeCtx, mockCanvas, mockLayout, mockRaf, setReducedMotion, type FakeCtx } from './fakeCtx'

/* eslint-disable @typescript-eslint/no-explicit-any */
const P = loadPrototype()
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
  expect(m.pins[0]).toMatchObject({ x: home.x, y: home.y, z: 12, name: 'Margaret', d: 'Home', big: true })
  expect(m.pins.map((p) => [p.x, p.y, p.z, p.name, p.c, p.ini, p.ph])).toEqual([
    [home.x, home.y, 12, 'Margaret', '#14a08c', 'M', undefined],
    [225, 146, 2, 'Footpath works', '#c88a05', '!', 0.2],
    [70, 205, 8, 'Scam reported', '#d9443f', '!', 0.4],
    [160, 270, 6, 'Street light out', '#c88a05', '☾', 0.6],
    [350, 235, 6, 'Swooping magpie', '#c88a05', 'M', 0.8],
    [60, 36, 2, 'Snake sighting', '#c88a05', 'S', 0.1],
    [305, 301, 21, 'Cool room', '#1fb39c', 'L', 0.5],
    [127, 133, 9, 'Vaccines', '#1fb39c', '+', 0.7],
  ])
  expect(m.routes).toEqual([{ pts: [[home.x, 158], [home.x, 270], [60, 270]], c: '#c88a05' }])
  expect(m.rings).toEqual([{ x: home.x, y: home.y, r: 150, c: 'rgba(217,68,63,.6)', label: 'WATCH AREA' }])
})

test.each(['high', 'alone', 'heat', 'gap'])('buildDistrict(%s) matches the prototype DM model', (mode) => {
  const proto = P.buildDistrict(mode)
  const values = P.SUBS.map((s: any) => P.subVal(s, mode))
  const m = buildDistrict(community.suburbs, values, P.DM[mode][2])
  expect(m.ground).toEqual(proto.ground)
  expect(m.faces).toEqual(proto.faces)
  expect(m.pins.map(flags)).toEqual(proto.pins.map(flags))
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
    width: 400, height: 300, dpr: 2, yaw: opts.yaw ?? view.yaw, now: opts.now, night: !!opts.night, reduced: false, fonts: DEFAULT_FONTS,
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

  test('district map', () => {
    const view = cityScene.views.district
    const values = P.SUBS.map((s: any) => P.subVal(s, 'gap'))
    const proto = protoFrame(view, P.buildDistrict('gap'), { now: 500 })
    const ours = ourFrame(view, buildDistrict(community.suburbs, values, P.DM.gap[2]), { now: 500 })
    expect(normCalls(ours.bx)).toEqual(normCalls(proto.bx))
    expect(normCalls(ours.ctx)).toEqual(normCalls(proto.ctx))
  })
})

test('tap text and hit testing follow the prototype toast', () => {
  const m = homeScene(buildSuburb(cityScene), surroundings.homeMap)
  expect(pinText(m.pins[0])).toBe("Margaret's home · Home")
  expect(pinText(m.pins[1])).toBe('David (brother) · 450 m · 6 min walk')
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
    const values = community.suburbs.map((s) => s.highRisk)
    const { container } = render(
      <DistrictMap suburbs={community.suburbs} metric={{ values, suffix: ' high risk' }} view={cityScene.views.district} />,
    )
    expect(container.querySelector('.c3d')).toHaveAttribute('aria-label', '3D column map of 15 Inner West suburbs')
  })
})
