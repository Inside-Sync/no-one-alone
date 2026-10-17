import { render } from '@testing-library/react'
import { orbitHit } from '@/components/canvas/orbit/draw'
import { Orbit } from '@/components/canvas/Orbit'
import circleData from '@/locales/en/data/circle.json'
import type { OrbitScene } from '@/data/types'
import { mockCanvas, mockRaf, setReducedMotion } from './fakeCtx'

const orbitScene = circleData.orbitScene as OrbitScene

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
