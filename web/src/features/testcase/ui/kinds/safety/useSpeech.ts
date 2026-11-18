import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '../../../engine'

/* The Web Speech API is not in every lib.dom: the few members used here. */
interface RecAlt { transcript: string }
interface RecResult { isFinal: boolean; length: number; [i: number]: RecAlt }
interface RecEvent { resultIndex: number; results: { length: number; [i: number]: RecResult } }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean
  onstart: (() => void) | null; onaudiostart: (() => void) | null; onresult: ((e: RecEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
type RecognitionCtor = new () => Recognition

const recognitionCtor = (): RecognitionCtor | null => {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}
const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null)

/** Why the microphone did not give a result (the UI maps it to a sentence in `tcSafety:speech.*`). */
export type MicProblem = 'micOff' | 'unavailable' | 'noWords' | 'failed'

export const recLang = (l: Lang) => (l === 'ar' ? 'ar-AE' : 'en-GB')

export interface UseSpeech {
  /** The browser has speech recognition (Chrome, Edge). Without it the UI offers typing and samples. */
  canListen: boolean
  /** The browser can read text aloud. */
  canSpeak: boolean
  /** `starting` until the microphone is open, then `listening`. */
  state: 'idle' | 'starting' | 'listening'
  /** What is heard so far (final and interim). */
  heard: string
  problem: MicProblem | null
  speaking: boolean
  start: () => void
  stop: () => void
  speak: (text: string) => void
  stopSpeaking: () => void
}

/**
 * Microphone and read-aloud on the browser's Web Speech API.
 * `onHeard(text, seconds)` is called once per take with what was said and how long the person spoke (seconds from the microphone
 * opening to Done, null when the browser gave no start event). Everything is released on unmount: the microphone is aborted and
 * speaking is cancelled.
 */
export function useSpeech(lang: Lang, onHeard: (text: string, seconds: number | null) => void): UseSpeech {
  const [state, setState] = useState<UseSpeech['state']>('idle')
  const [heard, setHeard] = useState('')
  const [problem, setProblem] = useState<MicProblem | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const rec = useRef<Recognition | null>(null)
  const take = useRef({ t0: null as number | null, t1: null as number | null, text: '', all: '', err: null as MicProblem | null })
  const cb = useRef(onHeard)
  useEffect(() => { cb.current = onHeard })

  const canListen = recognitionCtor() !== null
  const canSpeak = synth() !== null

  const start = useCallback(() => {
    const Ctor = recognitionCtor()
    if (!Ctor || rec.current) return
    setProblem(null); setHeard('')
    take.current = { t0: null, t1: null, text: '', all: '', err: null }
    let r: Recognition
    try { r = new Ctor() } catch { setProblem('unavailable'); return }
    r.lang = recLang(lang); r.continuous = true; r.interimResults = true
    const opened = () => { if (take.current.t0 == null) { take.current.t0 = performance.now(); setState('listening') } }
    r.onaudiostart = opened
    r.onresult = (e) => {
      opened()
      let fin = '', interim = ''
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) fin += ' ' + res[0].transcript
        else interim += ' ' + res[0].transcript
      }
      take.current.text = fin.trim()
      take.current.all = (fin + interim).trim()
      setHeard((fin + interim).trim())
    }
    r.onerror = (e) => {
      take.current.err = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'micOff' : e.error === 'no-speech' ? 'noWords' : e.error === 'aborted' ? null : e.error === 'audio-capture' || e.error === 'language-not-supported' ? 'unavailable' : 'failed'
    }
    r.onend = () => {
      rec.current = null
      setState('idle')
      const tk = take.current
      // Interim words the browser never finalised still count when the person pressed Done.
      const text = (tk.text || tk.all).trim()
      const secs = tk.t0 != null ? ((tk.t1 ?? performance.now()) - tk.t0) / 1000 : null
      if (!text) { if (tk.err) setProblem(tk.err); else setProblem('noWords'); return }
      setProblem(null)
      cb.current(text, secs)
    }
    rec.current = r
    setState('starting')
    try { r.start() } catch { rec.current = null; setState('idle'); setProblem('failed') }
  }, [lang])

  const stop = useCallback(() => {
    const r = rec.current
    if (!r) return
    take.current.t1 = performance.now()
    try { r.stop() } catch { /* already stopped */ }
  }, [])

  const stopSpeaking = useCallback(() => { synth()?.cancel(); setSpeaking(false) }, [])
  const speak = useCallback((text: string) => {
    const s = synth()
    if (!s) return
    try {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = lang === 'ar' ? 'ar-AE' : 'en-GB'
      u.rate = 0.95
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      s.cancel()
      s.speak(u)
      setSpeaking(true)
    } catch { setSpeaking(false) }
  }, [lang])

  useEffect(() => () => {
    const r = rec.current
    if (r) { r.onend = null; r.onresult = null; r.onerror = null; try { r.abort() } catch { /* gone */ } rec.current = null }
    synth()?.cancel()
  }, [])

  return { canListen, canSpeak, state, heard, problem, speaking, start, stop, speak, stopSpeaking }
}
