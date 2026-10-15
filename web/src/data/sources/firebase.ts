import { collection, doc, getDoc, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { DemoCurrentDoc, FamilyDoc, ForecastDoc, HospitalDoc, IncidentDoc, PersonDoc } from '../contract'
import { mockSource } from './mock'
import { overlayCircle, overlayForecast, overlayLineage, overlayOrbit, overlayPerson, overlaySharePeople, type Seed } from './overlay'
import type { DataSource } from './source'

/** The older person every page is about (contract seed id), and the family viewer the prototype speaks to. */
export const SUBJECT = 'margaret'
const VIEWER = 'james'

async function read<T>(path: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(await db(), path, id))
  return snap.exists() ? (snap.data() as T) : null
}

let seedP: Promise<Seed | null> | null = null

/**
 * `people/{SUBJECT}`, its circle members and `hospitals`, read once per session (core-api re-seeds them only on
 * reset). Null when the person is not seeded yet: pages then show the prototype data. A failed read can be retried.
 */
export function getSeed(): Promise<Seed | null> {
  seedP ??= (async () => {
    const person = await read<PersonDoc>('people', SUBJECT)
    if (!person) return null
    const ids = (person.circle ?? []).map((c) => c.memberId)
    const docs = await Promise.all(ids.map((id) => read<PersonDoc>('people', id)))
    const members: Record<string, PersonDoc> = {}
    ids.forEach((id, i) => { const d = docs[i]; if (d) members[id] = d })
    const hospitals: Record<string, HospitalDoc> = {}
    for (const h of (await getDocs(collection(await db(), 'hospitals'))).docs) hospitals[h.id] = h.data() as HospitalDoc
    return { person, members, hospitals }
  })().catch((e: unknown) => {
    seedP = null
    throw e
  })
  return seedP
}

/** Forget the cached seed (after `POST /api/demo/reset` re-seeds it). */
export function clearSeed(): void {
  seedP = null
}

/**
 * Reads what the contract stores from Firestore and lays it over the prototype data (see overlay.ts). Everything the
 * contract has no collection for, plus consent and audit, stays with the mock: the web never writes Firestore.
 */
export const firebaseSource: DataSource = {
  ...mockSource,
  async getPerson(id) {
    const [p, seed] = await Promise.all([mockSource.getPerson(id), getSeed()])
    return seed ? overlayPerson(p, seed.person) : p
  },
  async getCareCircle(id) {
    const [c, seed] = await Promise.all([mockSource.getCareCircle(id), getSeed()])
    return seed ? overlayCircle(c, seed, VIEWER) : c
  },
  async getSharePeople() {
    const [p, seed] = await Promise.all([mockSource.getSharePeople(), getSeed()])
    return seed ? overlaySharePeople(p, seed) : p
  },
  async getOrbitScene() {
    const [o, seed] = await Promise.all([mockSource.getOrbitScene(), getSeed()])
    return seed ? overlayOrbit(o, seed, VIEWER) : o
  },
  async getForecast(id) {
    const [f, d, seed] = await Promise.all([mockSource.getForecast(id), read<ForecastDoc>('forecasts', id), getSeed()])
    return d ? overlayForecast(f, d, seed) : f
  },
  async getLineage(id) {
    const [l, d] = await Promise.all([mockSource.getLineage(id), read<FamilyDoc>('families', id)])
    return d ? overlayLineage(l, d, VIEWER) : l
  },
}

/* ---------- Live subscriptions (contract 2.6: every role screen follows demo/current, then its incident) ---------- */

export type Unsubscribe = () => void

function follow<T>(path: string, id: string, next: (v: T | null) => void, fail: (e: Error) => void): Unsubscribe {
  let stop: Unsubscribe | null = null
  let cancelled = false
  db().then((d) => {
    if (cancelled) return
    stop = onSnapshot(doc(d, path, id), (s) => next(s.exists() ? (s.data() as T) : null), fail)
  }, fail)
  return () => {
    cancelled = true
    stop?.()
  }
}

export const subscribeDemo = (next: (v: DemoCurrentDoc | null) => void, fail: (e: Error) => void) =>
  follow<DemoCurrentDoc>('demo', 'current', next, fail)

export const subscribeIncident = (id: string, next: (v: IncidentDoc | null) => void, fail: (e: Error) => void) =>
  follow<IncidentDoc>('incidents', id, next, fail)
