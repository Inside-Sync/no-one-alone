import { act, fireEvent, render } from '@testing-library/react'
import { useImperativeHandle, useRef, type Ref } from 'react'
import { useCanvas3D, type Canvas3DHandle, type DrawFn } from '@/components/canvas/useCanvas3D'
import { mockCanvas, mockLayout, mockRaf, polyfillPointerEvent, setReducedMotion } from './fakeCtx'

function Harness({ draw, autoRotate, handle }: { draw: DrawFn; autoRotate: boolean; handle?: Ref<Canvas3DHandle> }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const h = useCanvas3D(ref, draw, { autoRotate })
  useImperativeHandle(handle, () => h, [h])
  return (
    <div className="c3d" role="img" aria-label="scene">
      <canvas ref={ref} />
    </div>
  )
}

let raf: ReturnType<typeof mockRaf>
beforeEach(() => {
  polyfillPointerEvent()
  mockCanvas()
  mockLayout()
  raf = mockRaf()
  Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true })
})

test('reduced motion disables auto-rotate but still draws once', () => {
  setReducedMotion(true)
  const draw = vi.fn()
  render(<Harness draw={draw} autoRotate />)
  expect(draw).toHaveBeenCalledTimes(1)
  expect(raf.requested).toBe(0)
  act(() => raf.flush())
  expect(draw).toHaveBeenCalledTimes(1)
})

test('canvas is sized for the device pixel ratio', () => {
  setReducedMotion(true)
  const draw = vi.fn()
  const { container } = render(<Harness draw={draw} autoRotate={false} />)
  const cv = container.querySelector('canvas')!
  expect(cv.width).toBe(800)
  expect(cv.height).toBe(600)
  expect(draw.mock.calls[0][3]).toMatchObject({ width: 400, height: 300, dpr: 2, reduced: true })
})

test('auto-rotate keeps an animation loop running when motion is allowed', () => {
  setReducedMotion(false)
  const draw = vi.fn()
  render(<Harness draw={draw} autoRotate />)
  act(() => raf.flush())
  act(() => raf.flush())
  expect(draw.mock.calls.length).toBeGreaterThanOrEqual(2)
  expect(raf.pending).toBe(1)
})

test('drag rotates by pointer delta', () => {
  setReducedMotion(false)
  const draw = vi.fn()
  const { container } = render(<Harness draw={draw} autoRotate={false} />)
  act(() => raf.flush())
  const before = draw.mock.calls.at(-1)![1]
  const cv = container.querySelector('canvas')!
  fireEvent.pointerDown(cv, { clientX: 100, clientY: 50 })
  fireEvent.pointerMove(window, { clientX: 200, clientY: 50 })
  fireEvent.pointerUp(window, { clientX: 200, clientY: 50 })
  act(() => raf.flush())
  const after = draw.mock.calls.at(-1)![1]
  expect(after - before).toBeCloseTo(-0.8) // prototype: yaw -= dx * .008
})

test('rotate eases towards the target and reset returns to the start angle', () => {
  setReducedMotion(false)
  const draw = vi.fn()
  const handle = { current: null as Canvas3DHandle | null }
  render(<Harness draw={draw} autoRotate={false} handle={handle} />)
  act(() => handle.current!.rotate(Math.PI / 4))
  for (let i = 0; i < 120; i++) act(() => raf.flush(50))
  expect(draw.mock.calls.at(-1)![1]).toBeCloseTo(Math.PI / 4, 2)
  expect(raf.pending).toBe(0) // loop stops once the target is reached
  act(() => handle.current!.reset())
  for (let i = 0; i < 120; i++) act(() => raf.flush(50))
  expect(draw.mock.calls.at(-1)![1]).toBeCloseTo(0, 2)
})

test('reduced motion: rotate jumps straight to the target', () => {
  setReducedMotion(true)
  const draw = vi.fn()
  const handle = { current: null as Canvas3DHandle | null }
  render(<Harness draw={draw} autoRotate handle={handle} />)
  act(() => handle.current!.rotate(1))
  act(() => raf.flush())
  expect(draw.mock.calls.at(-1)![1]).toBe(1)
  expect(raf.pending).toBe(0)
})
