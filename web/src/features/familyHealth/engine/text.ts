import type { FhKey, FhParam, FhParams, NoaLang, Txt, TxtDate, TxtFixed, TxtList } from '../data/types'

/** The i18next namespace of the family-health panel. */
export const FH_NS = 'familyHealth'

/** A text descriptor. */
export const tx = (k: FhKey, p?: FhParams): Txt => (p ? { k, p } : { k })
/** The same text, lower-cased at the start when it is used mid-sentence ("Saeed’s" and "IFHAS" keep their case). */
export const lc = (t: Txt): Txt => ({ ...t, lc: true })
/** A list joined with a separator (literal, or a `Txt` such as `tx('join.and')`). */
export const list = (items: readonly (Txt | string | number)[], sep: Txt | string): TxtList => ({ list: items, sep })
export const date = (ms: number): TxtDate => ({ date: ms })
export const fixed = (n: number, digits: number): TxtFixed => ({ fixed: n, digits })

/** A translate function of the `familyHealth` namespace: returns the raw locale string (no interpolation). */
export type RawT = (key: string) => string

/**
 * Lower-case the first letter of a sentence fragment, unless the first word is an acronym or a name with inner capitals
 * ("IFHAS", "HbA1c"). Names never start a lower-cased fragment. Arabic has no case.
 */
export function lcFirst(s: string): string {
  const m = /^(\S+)/.exec(s)
  if (!m) return s
  const w = m[1]
  if (/[A-Z]/.test(w.slice(1)) || w === 'Noa') return s
  return s.charAt(0).toLowerCase() + s.slice(1)
}

const isTxt = (v: unknown): v is Txt => !!v && typeof v === 'object' && 'k' in (v as object)
const isList = (v: unknown): v is TxtList => !!v && typeof v === 'object' && 'list' in (v as object)
const isDate = (v: unknown): v is TxtDate => !!v && typeof v === 'object' && 'date' in (v as object)
const isFixed = (v: unknown): v is TxtFixed => !!v && typeof v === 'object' && 'fixed' in (v as object)

const INTL: Record<NoaLang, string> = { en: 'en-GB', ar: 'ar-AE-u-nu-latn' }
/** "Sun 20 Dec" in English (en-GB short weekday, day, short month), the same date in Arabic. UTC: no time zone shifts. */
export function formatDay(ms: number, lang: NoaLang): string {
  return new Intl.DateTimeFormat(INTL[lang], { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(ms))
}
/** "08:40" from a clock in ms (UTC arithmetic). */
export const hhmm = (ms: number): string => {
  const d = new Date(ms)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/**
 * Turn a descriptor (or a literal) into text: placeholders `{{name}}` are filled from the params, nested descriptors and lists
 * are resolved the same way, dates and fixed numbers are formatted for `lang`. A placeholder with no value stays visible.
 */
export function resolveText(x: Txt | string | number | null | undefined, t: RawT, lang: NoaLang = 'en', depth = 0): string {
  if (x == null) return ''
  if (typeof x !== 'object') return String(x)
  let raw = t(x.k)
  if (depth < 10 && raw.includes('{{')) {
    raw = raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, name: string) => {
      const v = x.p ? x.p[name] : undefined
      return v === undefined ? m : paramText(v, t, lang, depth + 1)
    })
  }
  return x.lc && lang !== 'ar' ? lcFirst(raw) : raw
}

function paramText(v: FhParam, t: RawT, lang: NoaLang, depth: number): string {
  if (v == null || v === false) return ''
  if (v === true) return 'true'
  if (typeof v !== 'object') return String(v)
  if (isList(v)) return v.list.map((i) => resolveText(i, t, lang, depth)).join(typeof v.sep === 'string' ? (lang === 'ar' ? v.sep.replace(';', '؛').replace(',', '،') : v.sep) : resolveText(v.sep, t, lang, depth))
  if (isDate(v)) return formatDay(v.date, lang)
  if (isFixed(v)) return v.fixed.toFixed(v.digits)
  if (isTxt(v)) return resolveText(v, t, lang, depth)
  return ''
}

/**
 * A resolver bound to an i18next-like translate function (`i18n.getFixedT(lang, 'familyHealth')`). The UI uses it as
 * `const text = textOf(t, lang); text(item.text)`.
 */
export function textOf(t: (key: string, opts?: Record<string, unknown>) => string, lang: NoaLang): (x: Txt | string | number | null | undefined) => string {
  const raw: RawT = (k) => t(k, { skipInterpolation: true })
  return (x) => resolveText(x, raw, lang)
}
