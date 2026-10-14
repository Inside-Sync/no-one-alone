/**
 * Colour helpers ported verbatim from the prototype (lines 1163–1166, 1337).
 * They return the same `rgb(r,g,b)` strings so canvas fills match exactly.
 */

export function hex(h: string): [number, number, number] {
  const s = h.replace('#', '')
  return [parseInt(s.substr(0, 2), 16), parseInt(s.substr(2, 2), 16), parseInt(s.substr(4, 2), 16)]
}

/** Multiply each channel by `f` (clamped): `shade('#ffffff', .5)` → `rgb(128,128,128)`. */
export function shade(h: string, f: number): string {
  return 'rgb(' + hex(h).map((v) => Math.max(0, Math.min(255, Math.round(v * f)))).join(',') + ')'
}

/** Linear blend from `a` to `b`. */
export function mix(a: string, b: string, t: number): string {
  const B = hex(b)
  return 'rgb(' + hex(a).map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'
}

/** Piecewise-linear colour ramp over evenly spaced `stops`, `t` clamped to 0..1. */
export function ramp(t: number, stops: readonly string[]): string {
  const c = Math.max(0, Math.min(1, t))
  const n = stops.length - 1
  const i = Math.min(n - 1, Math.floor(c * n))
  return mix(stops[i], stops[i + 1], c * n - i)
}

/** `rgb(r,g,b)` → `#rrggbb`. */
export function rgbHex(c: string): string {
  const m = c.match(/\d+/g) ?? ['0', '0', '0']
  return '#' + m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join('')
}

/** WCAG 2 relative luminance of `#rrggbb`. */
export function luminance(h: string): number {
  const [r, g, b] = hex(h).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2 contrast ratio between two `#rrggbb` colours. */
export function contrast(a: string, b: string): number {
  const x = luminance(a)
  const y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/**
 * The prototype's data colours (condition keys, funnel stages) carry white text that is
 * below WCAG AA on the lighter hues. Darken the fill just enough for white text to reach
 * `min`; colours that already pass come back unchanged.
 */
export function fillForWhiteText(h: string, min = 4.5): string {
  if (contrast(h, '#ffffff') >= min) return h
  for (let f = 0.99; f > 0.2; f -= 0.01) {
    const c = rgbHex(shade(h, f))
    if (contrast(c, '#ffffff') >= min) return c
  }
  return '#000000'
}
