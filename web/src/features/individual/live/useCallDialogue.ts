import { useEffect, useRef, useState, type RefObject } from 'react'

interface Line { by: 'operator' | 'noa'; clip: string; text: string }

const FOUND = {
  'slurred speech': { clip: '6', text: 'Slurred speech at 02:04, last seen well at 01:22. She is awake and breathing, but confused.' },
  weakness: { clip: '6-weakness', text: 'Sudden weakness at 02:04, last seen well at 01:22. She says she cannot move properly. She is awake and breathing.' },
  'chest pain': { clip: '6-chest-pain', text: 'Chest pain at 02:04, last seen well at 01:22. She is awake and breathing.' },
  fall: { clip: '6-fall', text: 'She had a fall at 02:04, last seen well at 01:22. She is awake and breathing.' },
} as const

/** The fixed 000 dialogue (spec 4.5), English only, with its pre-recorded clips in public/noa; line 6 says the strongest triage finding. */
export function callLines(davidAccepted: boolean, reasons: readonly string[] = []): Line[] {
  const found = (Object.keys(FOUND) as (keyof typeof FOUND)[]).find((k) => reasons.includes(k)) ?? 'slurred speech'
  const line = (by: Line['by'], n: string, text: string): Line => ({ by, clip: `/noa/000-${n}.mp3`, text })
  return [
    line('operator', '1', 'Ambulance. What is your emergency?'),
    line('noa', '2', 'This is Noa from No One Alone, calling for Moza Al Hammadi, 78, female, who lives alone. Possible stroke.'),
    line('operator', '3', "What's the address?"),
    davidAccepted
      ? line('noa', '4-david', 'Villa 12, Street 18, Al Bateen, Abu Dhabi. Her brother Hamad is on his way with a key.')
      : line('noa', '4-alone', 'Villa 12, Street 18, Al Bateen, Abu Dhabi. Nobody is with her. Her neighbour Shamma holds a spare key.'),
    line('operator', '5', 'Tell me exactly what happened.'),
    line('noa', FOUND[found].clip, `${FOUND[found].text} Heart rate 142. Not on blood thinners. Allergic to penicillin.`),
    line('operator', '7', "An ambulance is on its way, about 12 minutes. Don't give her anything to eat or drink."),
    line('noa', '8', "Thank you. Her details are going to Corniche Stroke Centre, and I'm staying with her."),
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
  // Line 4 says who is coming as it stands when Noa reaches it, then stays.
  if (state.key !== callKey) setState({ key: callKey, accepted: davidAccepted, shown: live ? 0 : 8 })
  const accepted = state.key === callKey ? state.accepted : davidAccepted
  const done = useRef(onDone)
  useEffect(() => { done.current = onDone })
  const latest = useRef(davidAccepted)
  useEffect(() => { latest.current = davidAccepted })
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
      let accepted = false
      for (let i = 0; i < 8 && !stopped; i++) {
        if (i === 3) accepted = latest.current
        const said = accepted
        setState((s) => (s.key === callKey ? { ...s, accepted: said, shown: i + 1 } : s))
        await playClip(callLines(said, reasonsRef.current)[i].clip, (a) => { audio = a })
      }
      if (!stopped) done.current(false)
    })()
    return () => { stopped = true; audio?.pause() }
  }, [callKey, live, dialDone, speechRef])

  if (callKey === null) return { lines: [], dialling: false }
  const shown = state.key === callKey ? state.shown : live ? 0 : 8
  return { lines: callLines(accepted, reasons).slice(0, shown), dialling: live && shown === 0 }
}
