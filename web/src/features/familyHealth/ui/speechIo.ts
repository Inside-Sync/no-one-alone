import type { NoaLang } from '../index'

/**
 * Speech out (🔊 and the hearing test's play button) and in (the speech check and the composer microphone), with the
 * browser's own APIs: `speechSynthesis` (ar-AE / en-GB, prototype fallback) and the Web Speech API when the browser has it.
 */
export function speak(text: string, lang: NoaLang, onEnd?: () => void, rate = 1): boolean {
  let done = false
  const end = () => { if (!done) { done = true; onEnd?.() } }
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'ar' ? 'ar-AE' : 'en-GB'
    u.rate = rate
    u.onend = end
    u.onerror = end
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
    // Some browsers never fire onend: go on after a generous estimate of the speaking time.
    if (onEnd) setTimeout(end, 1800 + text.split(/\s+/).length * 520 / rate)
    return true
  } catch { end(); return false }
}
/** Stop Noa speaking (the speech check's Stop while the prompt is read). */
export function hush() { try { window.speechSynthesis.cancel() } catch { /* nothing to stop */ } }

interface Rec {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  start(): void; stop(): void
}
type RecCtor = new () => Rec
const ctor = (): RecCtor | null => {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}
export const canDictate = (): boolean => !!ctor()

export interface Listening { stop(): void }
/** A long take for the speech check: keep listening through pauses, stop after `silenceMs` without new words, at most `maxMs`. */
export interface LongTake { silenceMs: number; maxMs: number }
export const SPEECH_TAKE: LongTake = { silenceMs: 3500, maxMs: 20000 }

/**
 * Listen once. `onText` gets the words so far; `onDone` the final text, the seconds the person spoke (from the microphone
 * opening to the last word heard: the speech check's speed), or an error ('not_granted' when the microphone is blocked).
 * Without `take` the browser ends at the first pause (the composer's dictation). With `take` it keeps listening through pauses,
 * so slow or slurred speech is heard in full, and ends after `silenceMs` without new words, at `maxMs`, or on stop().
 */
export function listen(lang: NoaLang, onText: (t: string) => void, onDone: (r: { text: string; secs: number | null; error?: string }) => void, take?: LongTake): Listening | null {
  const C = ctor()
  if (!C) return null
  const r = new C()
  r.lang = lang === 'ar' ? 'ar-AE' : 'en-GB'
  r.interimResults = true
  r.continuous = !!take
  let final = '', partial = '', t0: number | null = null, tLast: number | null = null, error: string | undefined, ended = false
  let quiet: ReturnType<typeof setTimeout> | undefined, cap: ReturnType<typeof setTimeout> | undefined
  const stop = () => { try { r.stop() } catch { /* already stopped */ } }
  const armQuiet = () => { if (!take) return; clearTimeout(quiet); quiet = setTimeout(stop, take.silenceMs) }
  r.onstart = () => {
    t0 = performance.now()
    if (take) cap = setTimeout(stop, take.maxMs)
  }
  r.onresult = (e) => {
    partial = ''
    let fin = ''
    for (let i = take ? 0 : e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) fin += ` ${res[0].transcript}`
      else partial += ` ${res[0].transcript}`
    }
    final = take ? fin.trim() : `${final} ${fin}`.trim()
    tLast = performance.now()
    armQuiet()
    onText(`${final} ${partial}`.trim())
  }
  r.onerror = (e) => { error = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'not_granted' : e.error }
  r.onend = () => {
    if (ended) return
    ended = true
    clearTimeout(quiet); clearTimeout(cap)
    const until = take && tLast != null ? tLast : performance.now()
    onDone({ text: `${final} ${partial}`.trim(), secs: t0 != null ? Math.max(0.3, (until - t0) / 1000) : null, error })
  }
  try { r.start() } catch { onDone({ text: '', secs: null, error: 'start' }); return null }
  return { stop }
}
