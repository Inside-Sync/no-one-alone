import { SENTENCE, SPEECH } from '../data/tests'
import type { NoaLang } from '../data/types'

/**
 * The Noa Speech Check scoring (prototype scoreSpeech): words matched in order against the sentence (one-letter slips allowed in
 * words over 3 letters) or the character similarity, whichever is higher, weighted 0.75, plus speed against the person's usual
 * 3.0 s, weighted 0.25. Green from 0.8, amber from 0.6, red below; no words = none.
 */
export type SpeechLevel = 'green' | 'amber' | 'red' | 'none'
export type SpeechHow = 'sample' | 'typed' | 'spoken'
export interface SpeechResult { said: string; secs: number | null; score: number; lvl: SpeechLevel; matched: number; total: number; how: SpeechHow }

export function words(s: string, lang: NoaLang): string[] {
  let x = String(s).toLowerCase()
  if (lang === 'ar') x = x.replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  return x.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
}

/** Levenshtein distance. */
export function lev(a: string, b: string): number {
  const m = a.length, n = b.length
  let p = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const c = [i]
    for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    p = c
  }
  return p[n]
}
export const wordEq = (a: string, b: string): boolean => a === b || (a.length > 3 && b.length > 3 && lev(a, b) <= 1)

export const levelOf = (score: number, said: string): SpeechLevel => (!said ? 'none' : score < SPEECH.amber ? 'red' : score < SPEECH.green ? 'amber' : 'green')

export function scoreSpeech(said: string, secs: number | null, lang: NoaLang, how: SpeechHow = 'typed'): SpeechResult {
  const t = words(SENTENCE[lang], lang), s = words(said, lang)
  const n = t.length, k = s.length
  const D = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0) as number[])
  for (let i = 1; i <= n; i++) for (let j = 1; j <= k; j++) D[i][j] = wordEq(t[i - 1], s[j - 1]) ? D[i - 1][j - 1] + 1 : Math.max(D[i - 1][j], D[i][j - 1])
  const ws = n ? D[n][k] / n : 0
  const tj = t.join(''), sj = s.join('')
  const cs = tj.length ? Math.max(0, 1 - lev(tj, sj) / tj.length) : 0
  const match = k ? Math.max(ws, cs) : 0
  const ratio = secs ? secs / SPEECH.baseSecs : null
  const score = Math.round((match * SPEECH.wordWeight + (ratio ? Math.min(1, 1 / ratio) : match) * SPEECH.speedWeight) * 100) / 100
  return { said, secs, score, lvl: levelOf(score, said), matched: D[n][k], total: n, how }
}
