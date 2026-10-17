import { useEffect, useRef } from 'react'
import type { CheckinInput, IncidentDoc, ServerAction } from '@/data/contract'
import { apiErrorCode } from '@/data/repo'
import type { LiveView } from '@/domain/incident'
import { clipFor, type SimSettings } from '@/domain/simulator'

/** What each clip in public/sim says (Chirp en-AU-Chirp3-HD-Gacrux, a different voice from the agent). */
export const CLIP_TEXTS: Record<string, string> = {
  '/sim/clear-0.mp3': 'Yes, I can hear you.',
  '/sim/clear-1.mp3': 'The weather is nice today.',
  '/sim/clear-2.mp3': "No, I don't think so.",
  '/sim/clear-3.mp3': 'Yes, I can move them.',
  '/sim/slurred-1.mp3': 'Thuh... wezzuh... ish... nysh... tuh-dey.',
}

export interface AutopilotOptions {
  enabled: boolean
  settings: SimSettings
  incident: IncidentDoc | null
  view: LiveView | null
  /** questionKey whose audio Margaret's screen has finished playing. */
  spokenKey: string | null
  checkin: (i: CheckinInput) => Promise<void>
  act: (memberId: string, a: ServerAction) => Promise<void>
}

const GAP_MS = 2500
// Answers anyway when the question audio never reports its end (autoplay blocked).
const FALLBACK_MS = 14000
const DAVID_MS = 1500

const ignoreInvalidState = (e: unknown) => {
  if (apiErrorCode(e) !== 'INVALID_STATE') console.error(e)
}

/** Answers Margaret's voice questions with recorded clips and accepts for David, for a Simulator run. */
export function useAutopilot(opts: AutopilotOptions): void {
  const latest = useRef(opts)
  useEffect(() => { latest.current = opts })
  const sent = useRef(new Set<string>())

  const { enabled, view, incident } = opts
  const id = view?.id ?? null
  const key = view?.phone.voice ? view.phone.questionKey : null
  const davidNotified = !!incident?.assignments?.some((a) => a.memberId === 'david' && a.state === 'NOTIFIED')
  const davidPicksUp = opts.settings.davidPicksUp
  const spoken = !!key && opts.spokenKey === key

  useEffect(() => {
    if (!enabled || !id || !key) return
    const sentKey = `${id}|${key}`
    const index = (latest.current.incident?.checkIn?.turns ?? []).filter((t) => t.by === 'AGENT').length - 1
    const timer = setTimeout(() => {
      const url = clipFor(latest.current.settings, index)
      if (!url || sent.current.has(sentKey)) return
      sent.current.add(sentKey)
      // Posts once Margaret's clip has finished, so the next question never cuts it off.
      let posted = false
      const post = () => {
        if (posted) return
        posted = true
        void fetch(url)
          .then((r) => r.blob())
          .then((audio) => latest.current.checkin({ audio }))
          .catch(ignoreInvalidState)
      }
      try {
        const clip = new Audio(url)
        clip.addEventListener('ended', post)
        clip.addEventListener('error', post)
        clip.play().catch(post)
      } catch { post() }
    }, spoken ? GAP_MS : FALLBACK_MS)
    return () => clearTimeout(timer)
  }, [enabled, id, key, spoken])

  useEffect(() => {
    if (!enabled || !id || !davidNotified || !davidPicksUp) return
    const timer = setTimeout(() => { latest.current.act('david', 'ACCEPT').catch(ignoreInvalidState) }, DAVID_MS)
    return () => clearTimeout(timer)
  }, [enabled, id, davidNotified, davidPicksUp])
}
