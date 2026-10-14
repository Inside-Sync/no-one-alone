/**
 * Canvas font families. The prototype writes `"Be Vietnam Pro",system-ui` and
 * `"JetBrains Mono",monospace` into ctx.font; next/font loads the faces under
 * the family names it puts in `--font-be-vietnam-pro` / `--font-jetbrains-mono`,
 * so read those at runtime and fall back to the prototype strings.
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
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return DEFAULT_FONTS
  const css = getComputedStyle(document.documentElement)
  const sans = css.getPropertyValue('--font-be-vietnam-pro').trim()
  const mono = css.getPropertyValue('--font-jetbrains-mono').trim()
  return {
    sans: sans ? sans + ',system-ui' : DEFAULT_FONTS.sans,
    mono: mono ? mono + ',monospace' : DEFAULT_FONTS.mono,
  }
}

/** True when the app is in the emergency night theme (`body.night`), as the prototype checks every frame. */
export function bodyIsNight(): boolean {
  return typeof document !== 'undefined' && document.body.classList.contains('night')
}
