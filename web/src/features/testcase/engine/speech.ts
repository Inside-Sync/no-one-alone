import { PEOPLE } from '../data/people'
import type { Lang, SampleKey, SpeechResult, TFn } from './types'
import { resolveText } from './text'
import { tx, type Txt, type PersonId } from '../data/types'

/** The usual time (seconds) to say the sentence. */
export const BASE_SECS = 4.5

/** Lower-case words, with Arabic normalised (diacritics, alef and teh-marbuta variants), punctuation dropped. */
export function words(s: string, lang: Lang): string[] {
  let x = String(s).toLowerCase()
  if (lang === 'ar') x = x.replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  return x.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
}

/** Levenshtein distance between two strings or word lists. */
export function lev(a: ArrayLike<string>, b: ArrayLike<string>): number {
  const m = a.length, n = b.length
  let p = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const c = [i]
    for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    p = c
  }
  return p[n]
}
const weq = (a: string, b: string) => a === b || (a.length > 3 && b.length > 3 && lev(a, b) <= 1)

/** Which words of `a` are matched in order by words of `b` (longest common subsequence, one typo allowed on words over 3 letters). */
export function lcsMask(a: string[], b: string[]): boolean[] {
  const n = a.length, m = b.length
  const D = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0))
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = weq(a[i - 1], b[j - 1]) ? D[i - 1][j - 1] + 1 : Math.max(D[i - 1][j], D[i][j - 1])
  const mask = Array<boolean>(n).fill(false)
  let i = n, j = m
  while (i && j) {
    if (weq(a[i - 1], b[j - 1])) { mask[i - 1] = true; i--; j-- } else if (D[i - 1][j] >= D[i][j - 1]) i--; else j--
  }
  return mask
}

/**
 * Demo speech score: words matched against the target sentence (0.75) and time taken against the usual (0.25).
 * `green` from 0.8, `amber` from 0.6, below that `red`. Not a validated stroke test.
 */
export function scoreSpeech(said: string, secs: number | null, target: string, lang: Lang, mode: SpeechResult['mode']): SpeechResult {
  const t = words(target, lang), s = words(said, lang), mask = lcsMask(t, s)
  const ws = t.length ? mask.filter(Boolean).length / t.length : 0
  const tj = t.join(''), sj = s.join('')
  const cs = tj.length ? Math.max(0, 1 - lev(tj, sj) / tj.length) : 0
  const match = s.length ? Math.max(ws, cs) : 0
  const ratio = secs ? secs / BASE_SECS : null
  const score = Math.round((match * 0.75 + (ratio ? Math.min(1, 1 / ratio) : match) * 0.25) * 100) / 100
  const lvl = score < 0.6 ? 'red' : score < 0.8 ? 'amber' : 'green'
  return { said, secs, match, ratio, score, lvl, mode, lang, wpm: secs && s.length ? Math.round((s.length / secs) * 60) : null, mask, target: t, matched: mask.filter(Boolean).length, total: t.length }
}

/** The sentence the person says: "My name is {n} and I live in Abu Dhabi" (the English name even when the app is Arabic) or its Arabic version. */
export function sentenceTxt(lang: Lang, person: PersonId): Txt {
  const p = PEOPLE[person]
  return lang === 'ar' ? tx('speech.sentence.ar', { nar: tx(p.t.nar!) }) : tx('speech.sentence.en', { n: tx(p.t.nen!) })
}

/** The three ready-made answers: label key, and for each language the text and the seconds (null: no answer). */
export function samples(t: TFn, person: PersonId): Record<SampleKey, { label: Txt; en: [string, number | null]; ar: [string, number | null] }> {
  const p = PEOPLE[person]
  const en = resolveText(tx(p.t.nen!), t), ar = resolveText(tx(p.t.nar!), t)
  return {
    usual: { label: tx('speech.sample.usual', { n: tx(p.t.n!) }), en: [resolveText(sentenceTxt('en', person), t), 4.3], ar: [resolveText(sentenceTxt('ar', person), t), 4.4] },
    slurred: { label: tx('speech.sample.slurred'), en: [resolveText(tx('speech.slurred.en', { n2: en.slice(0, 2).toLowerCase() }), t), 11.2], ar: [resolveText(tx('speech.slurred.ar', { nar2: ar.slice(0, 2) }), t), 11.6] },
    none: { label: tx('speech.sample.none'), en: ['', null], ar: ['', null] },
  }
}
