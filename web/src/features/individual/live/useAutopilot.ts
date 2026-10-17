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
  checkin: (i: CheckinInput) => Promise<void>
  act: (memberId: string, a: ServerAction) => Promise<void>
}

const FIRST_MS = 8000
const LATER_MS = 5000
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

  useEffect(() => {
    if (!enabled || !id || !key) return
    const sentKey = `${id}|${key}`
    const index = (latest.current.incident?.checkIn?.turns ?? []).filter((t) => t.by === 'AGENT').length - 1
    const timer = setTimeout(() => {
      const url = clipFor(latest.current.settings, index)
      if (!url || sent.current.has(sentKey)) return
      sent.current.add(sentKey)
      void Promise.resolve().then(() => new Audio(url).play()).catch(() => {})
      void fetch(url)
        .then((r) => r.blob())
        .then((audio) => latest.current.checkin({ audio }))
        .catch(ignoreInvalidState)
    }, index <= 0 ? FIRST_MS : LATER_MS)
    return () => clearTimeout(timer)
  }, [enabled, id, key])

  useEffect(() => {
    if (!enabled || !id || !davidNotified || !davidPicksUp) return
    const timer = setTimeout(() => { latest.current.act('david', 'ACCEPT').catch(ignoreInvalidState) }, DAVID_MS)
    return () => clearTimeout(timer)
  }, [enabled, id, davidNotified, davidPicksUp])
}
