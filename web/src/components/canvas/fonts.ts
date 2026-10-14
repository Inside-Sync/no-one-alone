/**
 * Canvas font families. The prototype writes `"Be Vietnam Pro",system-ui` and
 * `"JetBrains Mono",monospace` into ctx.font; @fontsource registers the faces
 * under those same family names, so the prototype strings work as they are.
 */
export interface CanvasFonts {
  /** Family list for text, ending in system-ui. */
  sans: string
  /** Family list for mono labels, ending in monospace. */
  mono: string
}

export const DEFAULT_FONTS: CanvasFonts = {
  sans: '"Be Vietnam Pro",system-ui',
  mono: '"JetBrains Mono",monospace',
}

export function readCanvasFonts(): CanvasFonts {
  return DEFAULT_FONTS
}

/** True when the app is in the emergency night theme (`body.night`), as the prototype checks every frame. */
export function bodyIsNight(): boolean {
  return typeof document !== 'undefined' && document.body.classList.contains('night')
}
