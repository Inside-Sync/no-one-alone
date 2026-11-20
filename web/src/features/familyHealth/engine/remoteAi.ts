import i18next from 'i18next'
import type { NoaSayBody, NoaSayReply, NoaUnderstandBody } from '@/data/api'
import { PreparedAi, type GuardHit, type NoaAi, type SayRequest, type SayResult, type UnderstandRequest, type UnderstandResult } from './ai'
import { FH_NS } from './text'

/** How `RemoteAi` reaches core-api (`noaSay` / `noaUnderstand` in the app; a fake in tests). */
export interface NoaTransport {
  say(body: NoaSayBody, signal: AbortSignal): Promise<NoaSayReply>
  understand(body: NoaUnderstandBody, signal: AbortSignal): Promise<{ choice: string }>
}

const NOTED: readonly string[] = ['dose', 'diagnosis', 'againstEmergency'] satisfies GuardHit[]
const TIMEOUT = Symbol('timeout')

/** The live AI port: never throws; a timeout, error or bad reply gives the prepared text (say) or the keyword reader (understand). */
export class RemoteAi implements NoaAi {
  private readonly keywords = new PreparedAi()
  constructor(private readonly net: NoaTransport, private readonly timeoutMs = 8000) {}

  async say(req: SayRequest): Promise<SayResult> {
    const r = await this.post((s) => this.net.say({ callId: req.callId, lang: req.lang, params: { ...req.facts, audience: req.audience } }, s))
    const t = i18next.getFixedT(req.lang, FH_NS) as unknown as (k: string) => string
    if (r === TIMEOUT) return { text: req.fallback, source: 'prepared', note: t('ai.prepared.timeout') }
    if (r && r.source === 'live' && typeof r.text === 'string' && r.text.trim()) return { text: r.text.trim(), source: 'live' }
    if (r && r.source === 'guardrail' && r.reason === 'emergency') return { text: req.fallback, source: 'guardrail', emergency: true }
    if (r && r.source === 'guardrail') return { text: req.fallback, source: 'guardrail', note: NOTED.includes(r.reason ?? '') ? t(`ai.guardrail.${r.reason}`) : undefined }
    return { text: req.fallback, source: 'prepared', note: t('ai.prepared.failed') }
  }

  async understand(req: UnderstandRequest): Promise<UnderstandResult> {
    const r = await this.post((s) => this.net.understand({ qid: req.qid, lang: req.lang, options: req.options, reply: req.reply }, s))
    if (r && r !== TIMEOUT && req.options.some((o) => o.id === r.choice)) return { choice: r.choice, summary: '', source: 'live' }
    return this.keywords.understand(req)
  }

  /** The transport's answer, TIMEOUT after `timeoutMs` (the Firebase token wait included), or null on any error. */
  private async post<T>(send: (s: AbortSignal) => Promise<T>): Promise<T | typeof TIMEOUT | null> {
    const ctl = new AbortController()
    const timedOut = new Promise<typeof TIMEOUT>((res) => ctl.signal.addEventListener('abort', () => res(TIMEOUT)))
    const timer = setTimeout(() => ctl.abort(), this.timeoutMs)
    try { return await Promise.race([send(ctl.signal), timedOut]) } catch { return ctl.signal.aborted ? TIMEOUT : null } finally { clearTimeout(timer) }
  }
}
