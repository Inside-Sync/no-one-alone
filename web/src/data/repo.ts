import type { CheckinInput, DemoCurrentDoc, DemoScenario, IncidentDoc, ServerAction } from './contract'
import { mockSource } from './sources/mock'
import type { Seed } from './sources/overlay'
import type { DataSource } from './sources/source'

export type { DataSource } from './sources/source'

/** Static UI copy (drawers, headings): same for every source, so re-exported rather than fetched. */
export {
  AROUND_COPY, CHAT_INTRO, CHAT_QA, COMMUNITY_COPY, COND_ACTIONS, DRAWER_ACTIONS, EXPLAIN, EXPLAIN_FALLBACK, FORECAST_COPY, HEALTH_COPY, HOME_COPY, HOSPITAL_COPY, KEPT_PRIVATE, LINEAGE_COPY, LIVE_COPY, ME_COPY, ONCE_LABELS, PACKET_NOTE, PAGE_ERROR, PRIVACY_COPY, RECORD_COPY, SAVE_FAILED,
} from './fixtures/copy'

/**
 * `VITE_DATA_SOURCE=firebase` reads Firestore (contract section 2) over the prototype data and runs the real
 * emergency flow through core-api; anything else uses the mock. The Firebase SDK is loaded only in that mode.
 * `setDataSource` installs another implementation (tests).
 */
export const LIVE = import.meta.env.VITE_DATA_SOURCE === 'firebase'

type FirebaseModule = typeof import('./sources/firebase')
let firebaseModule: Promise<FirebaseModule> | null = null
const firebase = () => (firebaseModule ??= import('./sources/firebase'))

let override: DataSource | null = null

export function setDataSource(next: DataSource): void {
  override = next
}

export function resetDataSource(): void {
  override = null
}

/**
 * Each call resolves the source when it runs, so a test's `setDataSource` and the lazy Firebase module both apply.
 * The mock (or a test source) is called synchronously, as before; only the Firestore source waits for its module.
 */
const via = <K extends keyof DataSource>(k: K) =>
  ((...args: unknown[]) => {
    const call = (s: DataSource) => (s[k] as (...a: unknown[]) => unknown)(...args)
    if (override || !LIVE) return call(override ?? mockSource)
    return firebase().then((m) => call(m.firebaseSource))
  }) as DataSource[K]

export const getPerson = via('getPerson')
export const getHealth = via('getHealth')
export const getSurroundings = via('getSurroundings')
export const getForecast = via('getForecast')
export const getLineage = via('getLineage')
export const getCareRecord = via('getCareRecord')
export const getDeviceFeed = via('getDeviceFeed')
export const getCareCircle = via('getCareCircle')
export const getSharePeople = via('getSharePeople')
export const getHospital = via('getHospital')
export const getCommunity = via('getCommunity')
export const getWatch = via('getWatch')
export const getCityScene = via('getCityScene')
export const getOrbitScene = via('getOrbitScene')
export const getShare = via('getShare')
export const saveShare = via('saveShare')
export const appendAudit = via('appendAudit')
export const getAudit = via('getAudit')

/* ---------- Live emergency (VITE_DATA_SOURCE=firebase only) ---------- */

export type { Seed } from './sources/overlay'

/** The contract error code of a failed core-api call (`ALREADY_OWNED`, `INVALID_STATE`, …), or `NETWORK`. */
export const apiErrorCode = (e: unknown): string | null =>
  e instanceof Error && 'code' in e && typeof e.code === 'string' ? e.code : null

export interface LiveSnapshot {
  demo: DemoCurrentDoc | null
  /** The incident `demo/current` points to; null before the first snapshot or when there is none. */
  incident: IncidentDoc | null
}

/** Follows `demo/current`, then the incident it points to, re-subscribing when it changes. Returns the unsubscribe. */
export function followLive(next: (s: LiveSnapshot) => void, fail: (e: Error) => void): () => void {
  let stopped = false
  let stopIncident: (() => void) | null = null
  let stopDemo: (() => void) | null = null
  // undefined until the first snapshot, so an absent `demo/current` (null) is still reported once.
  let followed: string | null | undefined
  void firebase().then((fb) => {
    if (stopped) return
    stopDemo = fb.subscribeDemo((demo) => {
      const id = demo?.incidentId ?? null
      if (id === followed) return
      followed = id
      stopIncident?.()
      stopIncident = null
      next({ demo, incident: null })
      if (id) stopIncident = fb.subscribeIncident(id, (incident) => next({ demo, incident }), fail)
    }, fail)
  }, fail)
  return () => {
    stopped = true
    stopDemo?.()
    stopIncident?.()
  }
}

/** The seeded person, circle members and hospitals (null until seeded). */
export const getSeed = async (): Promise<Seed | null> => (await firebase()).getSeed()

/** The contract id of the person every page is about. */
export const SUBJECT_ID = 'margaret'

export async function audioUrl(path: string): Promise<string> {
  return (await import('@/lib/firebase')).audioUrl(path)
}

const api = () => import('./api')

export const startDemo = async (scenario: DemoScenario) => (await api()).startDemo(scenario, SUBJECT_ID)
export const checkin = async (incidentId: string, input: CheckinInput) => (await api()).checkin(incidentId, input)
export const act = async (incidentId: string, memberId: string, action: ServerAction) => (await api()).act(incidentId, memberId, action)

/** Resets the demo; the next read gets the re-seeded people and hospitals. */
export async function resetDemo(): Promise<void> {
  await (await api()).resetDemo()
  ;(await firebase()).clearSeed()
}
