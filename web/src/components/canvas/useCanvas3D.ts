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
  /** Zoom factor (1 when the canvas has no `zoom` option) and the pan in CSS pixels that goes with it. */
  zoom: number
  panX: number
  panY: number
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
  /**
   * Enable zoom between `min` and `max`: pinch (touch or trackpad), ctrl/⌘ + wheel, and `zoomBy`. Zoom keeps the point
   * under the pointer still; a shift- or right-button drag (or a two-finger move) pans, never past the zoom-1 frame.
   */
  zoom?: { min: number; max: number }
}

export interface Canvas3DHandle {
  /** Ease the angle by `delta` radians (the prototype's ±π/4 buttons). */
  rotate(delta: number): void
  /** Ease back to the initial angle. */
  reset(): void
  /** Draw again (after data or mode changes) when no loop is running. */
  redraw(): void
  /** Ease the zoom by `factor` around the canvas centre (the +/− buttons). */
  zoomBy(factor: number): void
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
  drag: { x: number; y: number; m: number; type: string; pan: boolean } | null
  kick: () => void
  zoom: number
  /** Eased zoom: the target and the anchor it keeps still (screen point, and its offset at zoom 1). */
  zt: { z: number; px: number; py: number; vx: number; vy: number } | null
  panX: number
  panY: number
  /** Active touch pointers, for the pinch. */
  touches: Map<number, { x: number; y: number }>
  pinch: { d: number; mx: number; my: number } | null
  zoomTo: (z: number) => void
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
    zoom: 1,
    zt: null,
    panX: 0,
    panY: 0,
    touches: new Map(),
    pinch: null,
    zoomTo: () => {},
  })

  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const st = s.current
    st.reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const host = cv.parentElement ?? cv
    let alive = true

    /** Keep the pan inside the zoom-1 frame, so a zoomed view never shows past what zoom 1 covers. */
    const clampPan = () => {
      const mx = ((st.zoom - 1) * st.w) / 2, my = ((st.zoom - 1) * st.h) / 2
      st.panX = Math.max(-mx, Math.min(mx, st.panX))
      st.panY = Math.max(-my, Math.min(my, st.panY))
    }
    /** Zoom to `z`, keeping the anchor's map point under its screen point. */
    function setZoom(z: number, a: { px: number; py: number; vx: number; vy: number }) {
      const lim = optsRef.current.zoom
      st.zoom = lim ? Math.max(lim.min, Math.min(lim.max, z)) : 1
      st.panX = a.px - st.w / 2 - a.vx * st.zoom
      st.panY = a.py - st.h / 2 - a.vy * st.zoom
      clampPan()
    }
    const anchor = (x: number, y: number) => ({ px: x, py: y, vx: (x - st.w / 2 - st.panX) / st.zoom, vy: (y - st.h / 2 - st.panY) / st.zoom })
    const zoomAt = (z: number, x: number, y: number) => setZoom(z, anchor(x, y))
    st.zoomTo = (z: number) => {
      const lim = optsRef.current.zoom
      if (!lim) return
      st.zt = { z: Math.max(lim.min, Math.min(lim.max, z)), ...anchor(st.w / 2, st.h / 2) }
      st.kick()
    }

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
      if (st.zt) {
        const t = st.zt, z = st.reduced ? t.z : st.zoom + (t.z - st.zoom) * Math.min(1, dt * 8)
        setZoom(z, t)
        if (st.reduced || Math.abs(t.z - z) < 0.002) {
          setZoom(t.z, t)
          st.zt = null
        }
      }
      drawRef.current(ctx, st.angle, now, {
        width: st.w,
        height: st.h,
        dpr: st.dpr,
        dt,
        reduced: st.reduced,
        dragging: st.drag != null,
        zoom: st.zoom,
        panX: st.panX,
        panY: st.panY,
      })
    }

    const wantsLoop = () => alive && st.visible && !st.reduced && (optsRef.current.autoRotate || st.target != null || st.zt != null)

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

    const local = (x: number, y: number) => {
      const r = cv.getBoundingClientRect()
      return { x: x - r.left, y: y - r.top }
    }
    const pinchOf = () => {
      const [a, b] = [...st.touches.values()]
      return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && optsRef.current.zoom) {
        st.touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (st.touches.size === 2) {
          st.pinch = pinchOf()
          st.drag = null
          return
        }
      }
      st.drag = { x: e.clientX, y: e.clientY, m: 0, type: e.pointerType || 'mouse', pan: Boolean(optsRef.current.zoom) && (e.shiftKey || e.button === 2) }
    }
    const move = (e: PointerEvent) => {
      if (st.pinch && st.touches.has(e.pointerId)) {
        st.touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const p = pinchOf(), at = local(p.mx, p.my)
        // Two fingers: spread to zoom about their middle, move together to pan.
        st.panX += p.mx - st.pinch.mx
        st.panY += p.my - st.pinch.my
        zoomAt(st.zoom * (p.d / (st.pinch.d || 1)), at.x, at.y)
        st.pinch = p
        st.kick()
        return
      }
      const d = st.drag
      if (!d) return
      const dx = e.clientX - d.x, dy = e.clientY - d.y
      d.m += Math.abs(dx) + Math.abs(dy)
      d.x = e.clientX
      d.y = e.clientY
      if (d.pan) {
        st.panX += dx
        st.panY += dy
        clampPan()
        st.kick()
        return
      }
      const f = optsRef.current.dragFactor ?? -0.008
      if (dx && f) {
        st.angle += dx * f
        st.target = null
      }
      optsRef.current.onDrag?.(dx, dy, d.type)
      st.kick()
    }
    const up = (e: PointerEvent) => {
      st.touches.delete(e.pointerId)
      if (st.touches.size < 2) st.pinch = null
      const d = st.drag
      if (!d) return
      st.drag = null
      if (d.m < 6 && optsRef.current.onTap) {
        const r = cv.getBoundingClientRect()
        optsRef.current.onTap(e.clientX - r.left, e.clientY - r.top)
      }
      st.kick()
    }
    // Pinch on a trackpad arrives as ctrl + wheel; a plain wheel keeps scrolling the page.
    const wheel = (e: WheelEvent) => {
      if (!optsRef.current.zoom || !(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const at = local(e.clientX, e.clientY)
      zoomAt(st.zoom * Math.exp(-e.deltaY * 0.01), at.x, at.y)
      st.zt = null
      st.kick()
    }
    const menu = (e: MouseEvent) => {
      if (optsRef.current.zoom) e.preventDefault()
    }
    cv.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    cv.addEventListener('wheel', wheel, { passive: false })
    cv.addEventListener('contextmenu', menu)

    return () => {
      alive = false
      if (st.raf) cancelAnimationFrame(st.raf)
      st.raf = 0
      st.kick = () => {}
      st.zoomTo = () => {}
      ro?.disconnect()
      io?.disconnect()
      cv.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      cv.removeEventListener('wheel', wheel)
      cv.removeEventListener('contextmenu', menu)
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
        if (s.current.zoom !== 1) s.current.zoomTo(1)
        s.current.kick()
      },
      redraw() {
        s.current.kick()
      },
      zoomBy(factor) {
        const st = s.current
        st.zoomTo((st.zt?.z ?? st.zoom) * factor)
      },
    }),
    [initial],
  )
}
