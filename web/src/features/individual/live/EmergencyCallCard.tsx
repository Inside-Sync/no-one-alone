'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Head } from '../home/parts'

interface Line { by: 'operator' | 'noa'; clip: string; text: string }

/** The fixed 000 dialogue (spec 4.5), English only, with its pre-recorded clips in public/noa. */
function callLines(davidAccepted: boolean): Line[] {
  const line = (by: Line['by'], n: string, text: string): Line => ({ by, clip: `/noa/000-${n}.mp3`, text })
  return [
    line('operator', '1', 'Emergency. Police, Fire or Ambulance?'),
    line('noa', '2', 'Ambulance. This is Noa from No One Alone, calling for Margaret Collins, 78, female, who lives alone. Possible stroke.'),
    line('operator', '3', "What's the address?"),
    davidAccepted
      ? line('noa', '4-david', '186 Marrickville Road, Marrickville 2204. Her brother David is on his way with a key.')
      : line('noa', '4-alone', '186 Marrickville Road, Marrickville 2204. Nobody is with her. Key lockbox by the front door.'),
    line('operator', '5', 'Tell me exactly what happened.'),
    line('noa', '6', 'Slurred speech at 01:40, last seen well at 01:30. She is awake and breathing, but confused. Heart rate 137. Not on blood thinners. Allergic to penicillin.'),
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

/**
 * Noa's automatic 000 call. `live`: the call started in this tab, so the lines play after the dial sound
 * (`dialDone`, null until it starts); otherwise (a reload) the whole transcript shows without audio.
 */
export function EmergencyCallCard({ davidAccepted, live, dialDone, onDone }: {
  davidAccepted: boolean; live: boolean; dialDone: Promise<void> | null; onDone: () => void
}) {
  const { t } = useTranslation('live')
  const lines = callLines(davidAccepted)
  const [shown, setShown] = useState(live ? 0 : lines.length)
  const done = useRef(onDone)
  useEffect(() => { done.current = onDone })

  useEffect(() => {
    if (!live) { done.current(); return }
    if (!dialDone) return
    let stopped = false
    let audio: HTMLAudioElement | null = null
    void (async () => {
      await dialDone
      const all = callLines(davidAccepted)
      for (let i = 0; i < all.length && !stopped; i++) {
        setShown(i + 1)
        await playClip(all[i].clip, (a) => { audio = a })
      }
      if (!stopped) done.current()
    })()
    return () => { stopped = true; audio?.pause() }
  }, [live, dialDone, davidAccepted])

  return (
    <GlassCard span={7} id="call000">
      <Head title={t('call.title')} meta={shown === 0 ? t('call.dialling') : undefined} />
      <ol className="tx" aria-live="polite" style={{ listStyle: 'none', display: 'grid', gap: 8 }}>
        {lines.slice(0, shown).map((l) => (
          <li key={l.clip}><b>{l.by === 'operator' ? t('call.operator') : t('call.noa')}</b>: {l.text}</li>
        ))}
      </ol>
      <p className="fine">{t('call.fine')}</p>
    </GlassCard>
  )
}
