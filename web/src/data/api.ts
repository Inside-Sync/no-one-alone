import { idToken } from '@/lib/firebase'
import type { ApiErrorCode, CheckinInput, DemoScenario, RecoveryRequest, ServerAction } from './contract'

/**
 * core-api public routes (contract 4.1). Same origin `/api` on Firebase Hosting and through the Vite proxy;
 * `VITE_API_BASE` is the contract's fallback when the Hosting rewrite to Cloud Run does not work.
 */
const BASE = String(import.meta.env.VITE_API_BASE ?? '').trim().replace(/\/$/, '') + '/api'

/** An error response in the contract's single shape, or a network failure (`status` 0). */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | 'NETWORK'

  constructor(status: number, code: ApiErrorCode | 'NETWORK', message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function call<T>(path: string, body?: BodyInit | object): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${await idToken()}` }
  let payload: BodyInit | undefined
  if (body instanceof FormData) payload = body
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  let res: Response
  try {
    res = await fetch(BASE + path, { method: 'POST', headers, body: payload })
  } catch (e) {
    throw new ApiError(0, 'NETWORK', e instanceof Error ? e.message : String(e))
  }
  const text = await res.text()
  const json: unknown = text ? JSON.parse(text) : undefined
  if (!res.ok) {
    const err = (json as { error?: { code?: ApiErrorCode; message?: string } } | undefined)?.error
    throw new ApiError(res.status, err?.code ?? 'INVALID_REQUEST', err?.message ?? res.statusText)
  }
  return json as T
}

/** Starts a scenario for `personId`; `409 INVALID_STATE` while another incident is open. */
export function startDemo(scenario: DemoScenario, personId: string, timerSeconds = 3, noReplySeconds = 10) {
  return call<{ incidentId: string }>(`/demo/${scenario}`, { timerSeconds, noReplySeconds, personId })
}

/** Deletes the current incident, re-seeds `people` and `hospitals`, clears `demo/current`. */
export function resetDemo() {
  return call<void>('/demo/reset')
}

/** One check-in reply from the person screen; the result appears in Firestore. */
export function checkin(incidentId: string, input: CheckinInput) {
  let body: FormData | object = input
  if ('audio' in input) {
    const form = new FormData()
    form.append('audio', input.audio, 'reply.webm')
    body = form
  }
  return call<void>(`/incidents/${encodeURIComponent(incidentId)}/checkin`, body)
}

/** A member's button (or `console` closing the incident). */
export function act(incidentId: string, memberId: string, action: ServerAction) {
  return call<{ version: number }>(`/incidents/${encodeURIComponent(incidentId)}/actions`, { memberId, action })
}

/** Hospital sends the person home with a recovery plan (contract 4.1); `409` when there is no handoff or a plan exists. */
export function recovery(incidentId: string, body: RecoveryRequest) {
  return call<{ version: number }>(`/incidents/${encodeURIComponent(incidentId)}/recovery`, body)
}
