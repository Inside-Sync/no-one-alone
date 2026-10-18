import { useEffect, useRef, useState, type RefObject } from 'react'

interface Line { by: 'operator' | 'noa'; clip: string; text: string }

const FOUND = {
  'slurred speech': { clip: '6', text: 'Slurred speech at 01:40, last seen well at 01:30. She is awake and breathing, but confused.' },
  weakness: { clip: '6-weakness', text: 'Sudden weakness at 01:40, last seen well at 01:30. She says she cannot move properly. She is awake and breathing.' },
  'chest pain': { clip: '6-chest-pain', text: 'Chest pain at 01:40, last seen well at 01:30. She is awake and breathing.' },
  fall: { clip: '6-fall', text: 'She had a fall at 01:40, last seen well at 01:30. She is awake and breathing.' },
} as const

/** The fixed 000 dialogue (spec 4.5), English only, with its pre-recorded clips in public/noa; line 6 says the strongest triage finding. */
export function callLines(davidAccepted: boolean, reasons: readonly string[] = []): Line[] {
  const found = (Object.keys(FOUND) as (keyof typeof FOUND)[]).find((k) => reasons.includes(k)) ?? 'slurred speech'
  const line = (by: Line['by'], n: string, text: string): Line => ({ by, clip: `/noa/000-${n}.mp3`, text })
  return [
    line('operator', '1', 'Emergency. Police, Fire or Ambulance?'),
    line('noa', '2', 'Ambulance. This is Noa from No One Alone, calling for Margaret Collins, 78, female, who lives alone. Possible stroke.'),
    line('operator', '3', "What's the address?"),
    davidAccepted
      ? line('noa', '4-david', '186 Marrickville Road, Marrickville 2204. Her brother David is on his way with a key.')
      : line('noa', '4-alone', '186 Marrickville Road, Marrickville 2204. Nobody is with her. Key lockbox by the front door.'),
    line('operator', '5', 'Tell me exactly what happened.'),
    line('noa', FOUND[found].clip, `${FOUND[found].text} Heart rate 137. Not on blood thinners. Allergic to penicillin.`),
    line('operator', '7', "An ambulance is on its way, about 12 minutes. Don't give her anything to eat or drink."),
    line('noa', '8', "Thank you. Her details are going to Camperdown Stroke Centre, and I'm staying with her."),
  ]
}

function playClip(src: string, track: (a: HTMLAudioElement) => void): Promise<void> {
  return new Promise((done) => {
    try {
      const a = new Audio(src)
      track(a)
      a.addEventListener('ended', () => done())
      a.addEventListener('error', () => done())
      a.play().catch(() => done())
    } catch { done() }
  })
}

export type CallLine = Line

/**
 * Noa's 000 call: when `live`, the lines play after the dial and the phone's speech; else (reload) the transcript only.
 * `callKey` names the call: a new one starts over. Returns the lines said so far and whether it is still dialling.
 */
export function useCallDialogue({ callKey, davidAccepted, reasons = [], live, dialDone, speechRef, onDone }: {
  callKey: string | null; davidAccepted: boolean; reasons?: readonly string[]; live: boolean; dialDone: Promise<void> | null
  speechRef?: RefObject<Promise<void>>; onDone: (silent: boolean) => void
}): { lines: Line[]; dialling: boolean } {
  const [state, setState] = useState<{ key: string | null; accepted: boolean; shown: number }>(
    { key: callKey, accepted: davidAccepted, shown: live ? 0 : 8 })
  // A late David accept does not change the call already under way.
  if (state.key !== callKey) setState({ key: callKey, accepted: davidAccepted, shown: live ? 0 : 8 })
  const accepted = state.key === callKey ? state.accepted : davidAccepted
  const done = useRef(onDone)
  useEffect(() => { done.current = onDone })
  const acceptedRef = useRef(accepted)
  useEffect(() => { acceptedRef.current = accepted })
  const reasonsRef = useRef(reasons)
  useEffect(() => { reasonsRef.current = reasons })

  useEffect(() => {
    if (callKey === null) return
    if (!live) { done.current(true); return }
    if (!dialDone) return
    let stopped = false
    let audio: HTMLAudioElement | null = null
    void (async () => {
      await dialDone
      await speechRef?.current
      const all = callLines(acceptedRef.current, reasonsRef.current)
      for (let i = 0; i < all.length && !stopped; i++) {
        setState((s) => (s.key === callKey ? { ...s, shown: i + 1 } : s))
        await playClip(all[i].clip, (a) => { audio = a })
      }
      if (!stopped) done.current(false)
    })()
    return () => { stopped = true; audio?.pause() }
  }, [callKey, live, dialDone, speechRef])

  if (callKey === null) return { lines: [], dialling: false }
  const shown = state.key === callKey ? state.shown : live ? 0 : 8
  return { lines: callLines(accepted, reasons).slice(0, shown), dialling: live && shown === 0 }
}
