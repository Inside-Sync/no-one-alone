import { ApiError, noaSay, noaUnderstand } from '@/data/api'
import { PreparedAi, type NoaAi, type SayRequest, type SayResult, type UnderstandRequest, type UnderstandResult } from '../engine/ai'

/** The AI plan: no answer within 8 s means prepared text (and the keyword reader for free-text replies). */
export const NOA_AI_TIMEOUT_MS = 8000

/**
 * The live AI port: respond-agent through core-api (`POST /api/noa/say`, `/api/noa/understand`). The server holds the prompts,
 * the per-call params schema, the model per tier and the output checks; the web sends only `{ callId, lang, params }` (the
 * server forbids any other field, so `tier`, `task` and `fallback` stay here). `params` = the call's `facts` plus `audience`.
 *
 * Every failure falls back to what the engine would show without AI: the prepared text (`busy` on a rate limit, `failed` on
 * anything else) and, for `understand`, the keyword reader. A `guardrail` reply passes its reason up: `emergency` makes the
 * engine show the fixed safety line for a typed question.
 */
export class RemoteAi implements NoaAi {
  private readonly prepared = new PreparedAi()

  constructor(private readonly timeoutMs = NOA_AI_TIMEOUT_MS) {}

  async say(req: SayRequest): Promise<SayResult> {
    const fallback = (reason: 'busy' | 'failed'): SayResult => ({ text: req.fallback, source: 'prepared', reason })
    try {
      const r = await this.withTimeout((signal) => noaSay({ callId: req.callId, lang: req.lang, params: { ...req.facts, audience: req.audience } }, signal))
      if (r.source === 'live' && typeof r.text === 'string' && r.text.trim()) return { text: r.text.trim(), source: 'live' }
      if (r.source === 'guardrail') return { text: req.fallback, source: 'guardrail', reason: r.reason as SayResult['reason'] }
      return fallback('failed')
    } catch (e) {
      return fallback(e instanceof ApiError && e.status === 429 ? 'busy' : 'failed')
    }
  }

  async understand(req: UnderstandRequest): Promise<UnderstandResult> {
    try {
      const options = req.options.map((o) => ({ id: o.id, label: o.label }))
      const r = await this.withTimeout((signal) => noaUnderstand({ qid: req.qid, lang: req.lang, options, reply: req.reply }, signal))
      if (options.some((o) => o.id === r.choice)) return { choice: r.choice, summary: '', source: 'live' }
    } catch {
      /* no answer: the keyword reader below */
    }
    return this.prepared.understand(req)
  }

  private async withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), this.timeoutMs)
    try {
      return await run(ctl.signal)
    } finally {
      clearTimeout(timer)
    }
  }
}

/**
 * Live AI is on only when the app runs on live data (`VITE_DATA_SOURCE=firebase`) and `VITE_NOA_AI=on`; otherwise the panel keeps
 * the prepared text (and its chip reads "Prepared text (no live AI here)").
 */
export function liveNoaAiEnabled(env: { VITE_DATA_SOURCE?: string; VITE_NOA_AI?: string } = import.meta.env as Record<string, string | undefined>): boolean {
  return env.VITE_DATA_SOURCE === 'firebase' && env.VITE_NOA_AI === 'on'
}
