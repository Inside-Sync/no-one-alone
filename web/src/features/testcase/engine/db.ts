import type { DbState } from './types'

/** Running sequence numbers of the generated ids (O-10001, C-1, AL-01, T-01, E-01, A-01). */
export interface Seq { o: number; c: number; al: number; t: number; e: number; a: number }

/** The demo database: ten empty tables. `agents`, `patients`, `consents` and the first `audit` row are seeded when a case loads. */
export const emptyDb = (): DbState => ({ agents: [], patients: [], consents: [], observations: [], checkins: [], alerts: [], tasks: [], encounters: [], reports: [], audit: [] })
