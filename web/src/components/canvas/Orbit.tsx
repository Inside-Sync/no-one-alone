'use client'

import { useCallback, useEffect, useImperativeHandle, useReducer, useRef, type CSSProperties, type Ref } from 'react'
import type { OrbitScene } from '@/data/types'
import { bodyIsNight, readCanvasFonts, type CanvasFonts } from './fonts'
import { createOrbitSim, dragOrbit, drawOrbit, orbitHit, setOrbit, type OrbitHit, type OrbitMode, type OrbitSim, type OrbitTargets } from './orbit/draw'
import { useCanvas3D, type Canvas3DHandle, type DrawFn } from './useCanvas3D'

export type { OrbitMode, OrbitTargets } from './orbit/draw'

interface Props {
  /** Balls, rings and centre from `getOrbitScene()`; filter `nodes` for the mini orbit (`only`). */
  scene: OrbitScene
  ariaLabel: string
  /** `calm` everyday, `check`/`sos` during the emergency demo. */
  mode?: OrbitMode
  /** Emergency progress (`orbEm.set`): eased towards these targets. */
  state?: Partial<OrbitTargets>
  labels?: boolean
  subs?: boolean
  /** Prototype presets: home .6/.95, emergency .62/1.05, mini .5. */
  tilt?: number
  zoom?: number
  cy?: number
  /** The emergency orbit passes true; otherwise follows `body.night`. */
  night?: boolean
  /** Tap on a ball: receives `name · sub`. */
  onSelect?: (text: string) => void
  className?: string
  style?: CSSProperties
  ref?: Ref<Canvas3DHandle>
}

/** Prototype `Orbit` (line 1347) on a `.c3d` card (`#orbHome`, `#orbEm`, `#orbMini`). */
export function Orbit({ scene, ariaLabel, mode = 'calm', state, labels, subs, tilt, zoom, cy, night, onSelect, className, style, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Mutable simulation (spin, easing, waves) lives outside React state, like the prototype's closure.
  const simRef = useRef<OrbitSim | null>(null)
  const initTilt = useRef(tilt)
  const getSim = useCallback(() => (simRef.current ??= createOrbitSim(scene.nodes, initTilt.current)), [scene.nodes])
  const hits = useRef<OrbitHit[]>([])
  const fonts = useRef<CanvasFonts | null>(null)
  // A photo that arrives later needs a frame when no loop is running (reduced motion).
  const [photos, photoLoaded] = useReducer((n: number) => n + 1, 0)

  // Node list changes (e.g. a different `only` filter) reset the start angles.
  useEffect(() => {
    getSim().ang = scene.nodes.map((p) => p.angle)
  }, [getSim, scene.nodes])

  const draw = useCallback<DrawFn>(
    (ctx, _angle, now, info) => {
      fonts.current ??= readCanvasFonts()
      hits.current = drawOrbit(ctx, getSim(), scene, {
        width: info.width,
        height: info.height,
        dpr: info.dpr,
        dt: info.dt,
        now,
        reduced: info.reduced,
        dragging: info.dragging,
        fonts: fonts.current,
        onAsset: photoLoaded,
        labels,
        subs,
        zoom,
        cy,
        night: night ?? bodyIsNight(),
      })
    },
    [getSim, scene, labels, subs, zoom, cy, night],
  )

  const onDrag = useCallback((dx: number, dy: number, type: string) => dragOrbit(getSim(), dx, dy, type === 'mouse'), [getSim])
  const onTap = useCallback(
    (x: number, y: number) => {
      const t = orbitHit(hits.current, x, y)
      if (t) onSelect?.(t)
    },
    [onSelect],
  )

  const handle = useCanvas3D(canvasRef, draw, { autoRotate: true, dragFactor: 0, onDrag, onTap })
  useImperativeHandle(ref, () => handle, [handle])

  const app = state?.app, call = state?.call, hosp = state?.hosp, arrived = state?.arrived
  useEffect(() => {
    setOrbit(getSim(), { mode, app, call, hosp, arrived })
    handle.redraw()
  }, [getSim, handle, mode, app, call, hosp, arrived])

  useEffect(() => {
    if (tilt != null && tilt !== initTilt.current) {
      initTilt.current = tilt
      setOrbit(getSim(), { tilt })
      handle.redraw()
    }
  }, [getSim, handle, tilt])

  useEffect(() => handle.redraw(), [handle, draw, photos])

  return (
    <div className={className ? 'c3d ' + className : 'c3d'} role="img" aria-label={ariaLabel} style={style}>
      <canvas ref={canvasRef}></canvas>
    </div>
  )
}
