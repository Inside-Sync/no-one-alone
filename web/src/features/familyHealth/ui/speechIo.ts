import type { NoaLang } from '../index'

/**
 * Speech out (🔊 and the hearing test's play button) and in (the speech check and the composer microphone), with the
 * browser's own APIs: `speechSynthesis` (ar-AE / en-GB, prototype fallback) and the Web Speech API when the browser has it.
 */
export function speak(text: string, lang: NoaLang) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'ar' ? 'ar-AE' : 'en-GB'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch { /* no speech out here */ }
}

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
/**
 * Listen once. `onText` gets the words so far; `onDone` the final text, the seconds from the start of listening to the end
 * (the speech check's speed), or an error ('not_granted' when the microphone is blocked).
 */
export function listen(lang: NoaLang, onText: (t: string) => void, onDone: (r: { text: string; secs: number | null; error?: string }) => void): Listening | null {
  const C = ctor()
  if (!C) return null
  const r = new C()
  r.lang = lang === 'ar' ? 'ar-AE' : 'en-GB'
  r.interimResults = true
  r.continuous = false
  let final = '', partial = '', t0: number | null = null, error: string | undefined, ended = false
  r.onstart = () => { t0 = performance.now() }
  r.onresult = (e) => {
    partial = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) final += res[0].transcript
      else partial += res[0].transcript
    }
    onText(`${final} ${partial}`.trim())
  }
  r.onerror = (e) => { error = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'not_granted' : e.error }
  r.onend = () => {
    if (ended) return
    ended = true
    onDone({ text: `${final} ${partial}`.trim(), secs: t0 ? (performance.now() - t0) / 1000 : null, error })
  }
  try { r.start() } catch { onDone({ text: '', secs: null, error: 'start' }); return null }
  return { stop: () => { try { r.stop() } catch { /* already stopped */ } } }
}
