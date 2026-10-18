'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, type CSSProperties, type Ref } from 'react'
import type { CityView } from '@/data/types'
import { cityHit, drawCityFrame, pinText, type Hit, type StaticBuffer } from './city/draw'
import type { CityModel } from './city/types'
import { bodyIsNight, readCanvasFonts, type CanvasFonts } from './fonts'
import { useCanvas3D, type Canvas3DHandle, type DrawFn } from './useCanvas3D'

export type { CityModel } from './city/types'
export { buildSuburb, homeScene, watchScene, buildDistrict, buildStreets, streetHomeScene, streetWatchScene } from './city/geometry'

interface Props {
  /** Render model, e.g. `homeScene(buildSuburb(geometry), surroundings.homeMap)`. */
  scene: CityModel
  /** Camera preset (`CityGeometry.views.home` / `.watch` / `.district`). */
  view: CityView
  ariaLabel: string
  /** Tap on a pin: receives the prototype's toast text (`name · detail`). */
  onSelect?: (text: string) => void
  /** Force the night palette; by default follows `body.night` like the prototype. */
  night?: boolean
  className?: string
  style?: CSSProperties
  /** `rotate(±π/4)` / `reset()` for the map's rotate buttons. */
  ref?: Ref<Canvas3DHandle>
}

/** User zoom range of a cover view: never below its frame (so no edge shows), up to 4×. */
const ZOOM = { min: 1, max: 4 }

/**
 * Prototype `City3D` (line 1176) on a `.c3d` card: drag to rotate, eased
 * rotate/reset, marching rings and routes, pulsing pins, tap for details.
 */
export function City3D({ scene, view, ariaLabel, onSelect, night, className, style, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const buf = useRef<StaticBuffer | null>(null)
  const hits = useRef<Hit[]>([])
  const fonts = useRef<CanvasFonts | null>(null)

  const draw = useCallback<DrawFn>(
    (ctx, yaw, now, info) => {
      if (!buf.current) {
        const canvas = document.createElement('canvas')
        const bctx = canvas.getContext('2d')
        if (!bctx) return
        buf.current = { canvas, ctx: bctx, key: '' }
      }
      const b = buf.current
      if (b.canvas.width !== ctx.canvas.width || b.canvas.height !== ctx.canvas.height) {
        b.canvas.width = ctx.canvas.width
        b.canvas.height = ctx.canvas.height
        b.key = ''
      }
      fonts.current ??= readCanvasFonts()
      hits.current = drawCityFrame(ctx, b, scene, view, {
        width: info.width,
        height: info.height,
        dpr: info.dpr,
        yaw,
        now,
        night: night ?? bodyIsNight(),
        reduced: info.reduced,
        fonts: fonts.current,
        zoom: info.zoom,
        panX: info.panX,
        panY: info.panY,
      })
    },
    [scene, view, night],
  )

  const onTap = useCallback(
    (x: number, y: number) => {
      const p = cityHit(hits.current, x, y)
      if (p) onSelect?.(pinText(p))
    },
    [onSelect],
  )

  // autoRotate = keep the frame loop running for the marching dashes and pin pulses;
  // like the prototype, the city itself only turns on drag or the rotate buttons.
  // Cover views (the plate fills the card) can zoom in; the others keep the prototype's fixed framing.
  const handle = useCanvas3D(canvasRef, draw, { autoRotate: true, initialAngle: view.yaw, dragFactor: -0.008, onTap, zoom: view.cover ? ZOOM : undefined })
  useImperativeHandle(ref, () => handle, [handle])

  // New scene or palette: draw again even when no loop is running (reduced motion).
  useEffect(() => handle.redraw(), [handle, draw])

  return (
    <div className={className ? 'c3d ' + className : 'c3d'} role="img" aria-label={ariaLabel} style={style}>
      <canvas ref={canvasRef}></canvas>
    </div>
  )
}
