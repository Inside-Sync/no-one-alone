'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'

/**
 * Shared canvas plumbing of the prototype's `City3D` and `Orbit` (lines
 * 1176–1398): DPR-aware sizing with ResizeObserver, the requestAnimationFrame
 * loop (dt capped at 50 ms), drag to rotate, eased rotate/reset and tap
 * detection (pointer travel < 6 px). Additions over the prototype:
 * - `prefers-reduced-motion: reduce` → no loop at all; the scene is drawn once
 *   and again only when something changes (drag, rotate, resize, redraw()).
 * - The loop pauses while the canvas is off-screen (IntersectionObserver),
 *   which replaces the prototype's `offsetParent !== null` check.
 */

export interface FrameInfo {
  /** CSS pixel size of the canvas box. */
  width: number
  height: number
  /** Device pixel ratio used for the backing store (max 2, as the prototype). */
  dpr: number
  /** Seconds since the previous frame, capped at 0.05. */
  dt: number
  reduced: boolean
  dragging: boolean
}

export type DrawFn = (ctx: CanvasRenderingContext2D, angle: number, t: number, info: FrameInfo) => void

export interface Canvas3DOptions {
  /** Keep animating every frame (spinning rings, marching dashes, pulses). Ignored under reduced motion. */
  autoRotate: boolean
  initialAngle?: number
  /** Radians per dragged pixel; the city uses -0.008 (`yaw -= dx*.008`). Use 0 to handle drags yourself. */
  dragFactor?: number
  /** Raw drag deltas (Orbit spins rings and tilts with them). */
  onDrag?: (dx: number, dy: number, pointerType: string) => void
  /** Click/tap without dragging, in canvas CSS pixels. */
  onTap?: (x: number, y: number) => void
}

export interface Canvas3DHandle {
  /** Ease the angle by `delta` radians (the prototype's ±π/4 buttons). */
  rotate(delta: number): void
  /** Ease back to the initial angle. */
  reset(): void
  /** Draw again (after data or mode changes) when no loop is running. */
  redraw(): void
}

interface Internal {
  angle: number
  target: number | null
  w: number
  h: number
  dpr: number
  last: number
  raf: number
  visible: boolean
  reduced: boolean
  drag: { x: number; y: number; m: number; type: string } | null
  kick: () => void
}

export function useCanvas3D(
  ref: RefObject<HTMLCanvasElement | null>,
  draw: DrawFn,
  opts: Canvas3DOptions,
): Canvas3DHandle {
  const drawRef = useRef(draw)
  const optsRef = useRef(opts)
  useLayoutEffect(() => {
    drawRef.current = draw
    optsRef.current = opts
  })

  const s = useRef<Internal>({
    angle: opts.initialAngle ?? 0,
    target: null,
    w: 0,
    h: 0,
    dpr: 1,
    last: 0,
    raf: 0,
    visible: true,
    reduced: false,
    drag: null,
    kick: () => {},
  })

  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const st = s.current
    st.reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const host = cv.parentElement ?? cv
    let alive = true

    const size = (): boolean => {
      const r = host.getBoundingClientRect()
      if (!r.width || !r.height) return false
      st.dpr = Math.min(2, window.devicePixelRatio || 1)
      st.w = r.width
      st.h = r.height
      cv.width = Math.round(st.w * st.dpr)
      cv.height = Math.round(st.h * st.dpr)
      return true
    }

    const paint = (now: number, dt: number) => {
      if (!st.w && !size()) return
      if (st.target != null) {
        if (st.reduced) {
          st.angle = st.target
          st.target = null
        } else {
          const dd = st.target - st.angle
          st.angle += dd * Math.min(1, dt * 6)
          if (Math.abs(dd) < 0.002) {
            st.angle = st.target
            st.target = null
          }
        }
      }
      drawRef.current(ctx, st.angle, now, {
        width: st.w,
        height: st.h,
        dpr: st.dpr,
        dt,
        reduced: st.reduced,
        dragging: st.drag != null,
      })
    }

    const wantsLoop = () => alive && st.visible && !st.reduced && (optsRef.current.autoRotate || st.target != null)

    const tick = (now: number) => {
      st.raf = 0
      const dt = Math.min(0.05, Math.max(0, (now - st.last) / 1000))
      st.last = now
      paint(now, dt)
      if (wantsLoop()) st.raf = requestAnimationFrame(tick)
    }

    /** Make sure a frame is coming: one-off when idle, or (re)start the loop. */
    st.kick = () => {
      if (!alive || st.raf) return
      st.last = performance.now()
      st.raf = requestAnimationFrame(tick)
    }

    size()
    if (st.reduced) paint(performance.now(), 0)
    else st.kick()

    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => size() && st.kick()) : null
    ro?.observe(host)

    const io =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver((entries) => {
            st.visible = entries.some((e) => e.isIntersecting)
            if (st.visible) st.kick()
          })
        : null
    io?.observe(host)

    document.fonts?.ready.then(() => st.kick()).catch(() => {})

    const down = (e: PointerEvent) => {
      st.drag = { x: e.clientX, y: e.clientY, m: 0, type: e.pointerType || 'mouse' }
    }
    const move = (e: PointerEvent) => {
      const d = st.drag
      if (!d) return
      const dx = e.clientX - d.x, dy = e.clientY - d.y
      d.m += Math.abs(dx) + Math.abs(dy)
      d.x = e.clientX
      d.y = e.clientY
      const f = optsRef.current.dragFactor ?? -0.008
      if (dx && f) {
        st.angle += dx * f
        st.target = null
      }
      optsRef.current.onDrag?.(dx, dy, d.type)
      st.kick()
    }
    const up = (e: PointerEvent) => {
      const d = st.drag
      if (!d) return
      st.drag = null
      if (d.m < 6 && optsRef.current.onTap) {
        const r = cv.getBoundingClientRect()
        optsRef.current.onTap(e.clientX - r.left, e.clientY - r.top)
      }
      st.kick()
    }
    cv.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)

    return () => {
      alive = false
      if (st.raf) cancelAnimationFrame(st.raf)
      st.raf = 0
      st.kick = () => {}
      ro?.disconnect()
      io?.disconnect()
      cv.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [ref])

  // Turning autoRotate on later (e.g. the emergency demo starting) restarts the loop.
  const prevAuto = useRef(opts.autoRotate)
  useEffect(() => {
    if (opts.autoRotate !== prevAuto.current) s.current.kick()
    prevAuto.current = opts.autoRotate
  }, [opts.autoRotate])

  const initial = opts.initialAngle ?? 0
  return useMemo<Canvas3DHandle>(
    () => ({
      rotate(delta) {
        const st = s.current
        st.target = (st.target ?? st.angle) + delta
        st.kick()
      },
      reset() {
        s.current.target = initial
        s.current.kick()
      },
      redraw() {
        s.current.kick()
      },
    }),
    [initial],
  )
}
