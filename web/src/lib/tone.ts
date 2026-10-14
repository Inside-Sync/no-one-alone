/**
 * Ruling R36 (extended by R40): the status tones (--warn, --good, --bad and the amber/red/green hexes the prototype's data
 * uses for the same meanings) fail WCAG AA as *text* on the glass cards. Fills, dots and lines keep the
 * prototype colours; text uses the darker `--*-text` variables defined in globals.css.
 */
const TEXT: Record<string, string> = {
  'var(--warn)': 'var(--warn-text)', '#b97f04': 'var(--warn-text)', '#c88a05': 'var(--warn-text)',
  'var(--good)': 'var(--good-text)', '#1f8f5f': 'var(--good-text)',
  'var(--bad)': 'var(--bad-text)', '#d9443f': 'var(--bad-text)',
  // R40: muted, brand, teal and jac are below AA as text on glass too.
  'var(--muted)': 'var(--muted-text)', '#56706e': 'var(--muted-text)',
  'var(--brand)': 'var(--brand-text)',
  '#0b7f71': 'var(--teal-text)', '#1fb39c': 'var(--teal-text)', 'var(--brand-2)': 'var(--brand-text)',
  'var(--jac)': 'var(--jac-text)', '#8f6fd0': 'var(--jac-text)',
}

/** The text colour for a tone colour (`'var(--bad)'`, `'#d9443f'`, ...); other colours pass through. */
export function textTone(color: string): string
export function textTone(color: string | undefined): string | undefined
export function textTone(color: string | undefined): string | undefined {
  return color == null ? color : (TEXT[color.toLowerCase()] ?? color)
}

const TEXT_TONES = new Set(['good', 'warn', 'bad', 'muted', 'brand', 'jac', 'teal'])

/** `var(--good-text)` for a tone name (good, warn, bad, muted, brand, jac, teal); other names map to `var(--<name>)`. */
export function toneVar(tone: string): string {
  return TEXT_TONES.has(tone) ? `var(--${tone}-text)` : `var(--${tone})`
}
