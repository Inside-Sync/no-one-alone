import type { Params, ParamValue, TFn, Txt } from './types'

/**
 * Turn a `Txt` (or a literal string / number) into display text.
 * - a placeholder `{{name}}` is filled from the Txt's own params, then from `ctx` (`engine.ctx()`);
 * - nested `Txt` params and `TxtList`s are resolved the same way (so a slot text that mentions `{{f1s}}` works);
 * - a placeholder with no value is left as written (visible, so a missing token is easy to spot).
 * The locale string is fetched with `skipInterpolation`, so this function does all substitution itself and nothing is HTML-escaped.
 */
export function resolveText(x: Txt | string | number | null | undefined, t: TFn, ctx: Params = {}, depth = 0): string {
  if (x == null) return ''
  if (typeof x !== 'object') return String(x)
  const raw = t(x.k, { skipInterpolation: true })
  if (depth > 8 || !raw.includes('{{')) return raw
  return raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, name: string) => {
    const v = x.p && name in x.p ? x.p[name] : ctx[name]
    return v === undefined ? m : paramText(v, t, ctx, depth + 1)
  })
}

function paramText(v: ParamValue, t: TFn, ctx: Params, depth: number): string {
  if (v == null) return ''
  if (typeof v !== 'object') return String(v)
  if ('list' in v) return v.list.map((x) => resolveText(x, t, ctx, depth)).join(v.sep)
  return resolveText(v, t, ctx, depth)
}

const pad = (n: number) => String(n).padStart(2, '0')
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const AT0 = Date.UTC(2026, 9, 15, 0, 0)
const tdate = (t: number) => new Date(AT0 + t * 60000)
/** "02:10" for a clock in minutes since 15 Oct 2026 00:00 (UTC arithmetic: no time zone, no daylight saving). */
export const hm = (t: number): string => {
  const d = tdate(t)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}
/** The `Intl` locale the dates are written in (set by the UI from the app language; `null`: the English "15 Oct" form, used by tests and the benchmark). */
let dateLocale: string | null = null
export const setDateLocale = (l: string | null): void => { dateLocale = l && !l.startsWith('en') ? l : null }
/** "15 Oct" (or the same date in the app's locale). */
export const clkDate = (t: number): string => {
  const d = tdate(t)
  if (dateLocale) {
    try { return new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d) } catch { /* fall through to English */ }
  }
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`
}
/** "15 Oct 02:10". */
export const clk = (t: number): string => `${clkDate(t)} ${hm(t)}`
export const pad2 = pad
