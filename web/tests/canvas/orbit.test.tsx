import { render } from '@testing-library/react'
import { createOrbitSim, drawOrbit, dragOrbit, orbitHit, setOrbit, type OrbitOptions } from '@/components/canvas/orbit/draw'
import { Orbit } from '@/components/canvas/Orbit'
import { DEFAULT_FONTS } from '@/components/canvas/fonts'
import { orbitScene } from '@/data/fixtures/circle'
import { loadPrototype } from './prototype'
import { fakeCtx, mockCanvas, mockLayout, mockRaf, setReducedMotion, type FakeCtx } from './fakeCtx'

/* eslint-disable @typescript-eslint/no-explicit-any */
const norm = (c: FakeCtx) => ({ calls: c.calls, sets: c.sets })

type Step = { set?: Record<string, number | string>; dt: number; now: number; drag?: [number, number] }

function runProto(o: any, steps: Step[]) {
  const P = loadPrototype()
  const made = mockCanvas()
  const el = document.createElement('div')
  el.appendChild(document.createElement('canvas'))
  const orb = new P.Orbit(el, o)
  const ctx = made[0]
  for (const s of steps) {
    if (s.set) orb.set(s.set)
    if (s.drag) {
      el.querySelector('canvas')!.dispatchEvent(Object.assign(new MouseEvent('pointerdown', { clientX: 0, clientY: 0 }), { pointerType: 'mouse' }))
      window.dispatchEvent(Object.assign(new MouseEvent('pointermove', { clientX: s.drag[0], clientY: s.drag[1] }), { pointerType: 'mouse' }))
      window.dispatchEvent(new MouseEvent('pointerup', { clientX: s.drag[0], clientY: s.drag[1] }))
    }
    orb.frame(s.dt, s.now)
  }
  return ctx
}

function runOurs(o: OrbitOptions & { only?: string[] }, steps: Step[]) {
  const ctx = fakeCtx()
  const nodes = orbitScene.nodes.filter((p) => !o.only || o.only.includes(p.id))
  const sim = createOrbitSim(nodes, o.tilt)
  for (const s of steps) {
    if (s.set) setOrbit(sim, s.set as any)
    if (s.drag) dragOrbit(sim, s.drag[0], s.drag[1], true)
    drawOrbit(ctx, sim, { ...orbitScene, nodes }, {
      width: 400, height: 300, dpr: 2, dt: s.dt, now: s.now, reduced: false, dragging: false, fonts: DEFAULT_FONTS, ...o,
    })
  }
  return ctx
}

beforeEach(() => {
  mockLayout(400, 300)
  Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true })
})

test('calm home orbit matches the prototype call for call', () => {
  const steps: Step[] = [{ dt: 0.016, now: 1000 }, { dt: 0.05, now: 1050 }, { dt: 0.033, now: 1083 }]
  const proto = runProto({ labels: 1, tilt: 0.6, zoom: 0.95 }, steps)
  const ours = runOurs({ labels: true, tilt: 0.6, zoom: 0.95 }, steps)
  expect(norm(ours)).toEqual(norm(proto))
})

test('mini orbit (family only, drag with tilt) matches the prototype', () => {
  const steps: Step[] = [{ dt: 0.016, now: 10 }, { dt: 0.02, now: 30, drag: [40, 20] }, { dt: 0.02, now: 50 }]
  const proto = runProto({ labels: 1, tilt: 0.5, only: ['david', 'nurse', 'james', 'sarah'] }, steps)
  const ours = runOurs({ labels: true, tilt: 0.5, only: ['david', 'nurse', 'james', 'sarah'] }, steps)
  expect(norm(ours)).toEqual(norm(proto))
})

test('emergency orbit: check → sos with help arriving matches the prototype (orbEm.set)', () => {
  const steps: Step[] = [
    { set: { mode: 'check', app: 0, call: 0, hosp: 0, arrived: 0 }, dt: 0.016, now: 2000 },
    { set: { mode: 'sos', app: 0.4, call: 0.35, hosp: 0, arrived: 0 }, dt: 0.05, now: 2050 },
    ...Array.from({ length: 40 }, (_, i) => ({ dt: 0.05, now: 2100 + i * 50 })),
    { set: { mode: 'sos', app: 1, call: 1, hosp: 1, arrived: 1 }, dt: 0.05, now: 4200 },
    { dt: 0.05, now: 4250 },
  ]
  const proto = runProto({ labels: 1, night: 1, tilt: 0.62, zoom: 1.05 }, steps)
  const ours = runOurs({ labels: true, night: true, tilt: 0.62, zoom: 1.05 }, steps)
  expect(norm(ours)).toEqual(norm(proto))
})

test('tap text: Margaret in the middle, people on the rings', () => {
  const hits = [
    { x: 100, y: 100, r: 30, text: 'Margaret · Safe at home' },
    { x: 150, y: 100, r: 20, text: 'David · Brother · 450 m' },
  ]
  expect(orbitHit(hits, 150, 105)).toBe('David · Brother · 450 m')
  expect(orbitHit(hits, 95, 100)).toBe('Margaret · Safe at home')
  expect(orbitHit(hits, 300, 300)).toBeNull()
})

test('Orbit renders a labelled .c3d image and draws once under reduced motion', () => {
  mockCanvas()
  mockRaf()
  setReducedMotion(true)
  const { container, rerender } = render(
    <Orbit scene={orbitScene} ariaLabel="Care circle in emergency: help moving toward Margaret" mode="check" state={{ app: 0 }} style={{ height: 360 }} />,
  )
  const host = container.querySelector('.c3d')!
  expect(host).toHaveAttribute('role', 'img')
  expect(host).toHaveAttribute('aria-label', 'Care circle in emergency: help moving toward Margaret')
  expect(host).toHaveStyle({ height: '360px' })
  rerender(<Orbit scene={orbitScene} ariaLabel="x" mode="sos" state={{ app: 1, call: 1, hosp: 1, arrived: 1 }} />)
  expect(container.querySelector('.c3d')).toHaveAttribute('aria-label', 'x')
})
