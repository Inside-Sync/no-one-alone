import { useEffect, useRef } from 'react'
import type { CheckinInput, IncidentDoc, ServerAction } from '@/data/contract'
import { apiErrorCode } from '@/data/repo'
import type { LiveView } from '@/domain/incident'
import { clipFor, type SimSettings } from '@/domain/simulator'

export interface AutopilotOptions {
  enabled: boolean
  /** False once Margaret answered by hand on this incident: no clip plays or posts. */
  voice: boolean
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
  const playing = useRef<(() => void) | null>(null)

  const { enabled, voice, view, incident } = opts
  const id = view?.id ?? null
  const key = view?.phone.voice ? view.phone.questionKey : null
  const davidNotified = !!incident?.assignments?.some((a) => a.memberId === 'david' && a.state === 'NOTIFIED')
  const davidPicksUp = opts.settings.davidPicksUp
  const spoken = !!key && opts.spokenKey === key

  useEffect(() => {
    if (!enabled || !voice || !id || !key) return
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
        playing.current = null
        void fetch(url)
          .then((r) => r.blob())
          .then((audio) => { if (latest.current.voice) return latest.current.checkin({ audio }) })
          .catch(ignoreInvalidState)
      }
      try {
        const clip = new Audio(url)
        // posted first: pause() rejects play() with AbortError, which would post.
        playing.current = () => { posted = true; clip.pause() }
        clip.addEventListener('ended', post)
        clip.addEventListener('error', post)
        clip.play().catch(post)
      } catch { post() }
    }, spoken ? GAP_MS : FALLBACK_MS)
    return () => clearTimeout(timer)
  }, [enabled, voice, id, key, spoken])

  // Stops a playing clip, unposted, when she answers by hand or the question moves on.
  useEffect(() => () => {
    playing.current?.()
    playing.current = null
  }, [voice, id, key])

  useEffect(() => {
    if (!enabled || !id || !davidNotified || !davidPicksUp) return
    const timer = setTimeout(() => { latest.current.act('david', 'ACCEPT').catch(ignoreInvalidState) }, DAVID_MS)
    return () => clearTimeout(timer)
  }, [enabled, id, davidNotified, davidPicksUp])
}
