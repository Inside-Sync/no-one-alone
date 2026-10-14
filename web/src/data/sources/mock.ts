import { careCircle, orbitScene, sharePeople } from '../fixtures/circle'
import { cityScene } from '../fixtures/city'
import { careRecord } from '../fixtures/record'
import { community } from '../fixtures/community'
import { deviceFeed } from '../fixtures/device'
import { forecast } from '../fixtures/forecast'
import { health } from '../fixtures/health'
import { hospital } from '../fixtures/hospital'
import { lineage } from '../fixtures/lineage'
import { margaret } from '../fixtures/margaret'
import { surroundings } from '../fixtures/around'
import { defaultShare } from '../fixtures/share'
import { watch } from '../fixtures/watch'
import type { DataSource } from './source'
import type { AuditEntry, ShareMatrix } from '../types'

const clone = <T>(v: T): T => structuredClone(v)

let share: ShareMatrix = clone(defaultShare)
let audit: AuditEntry[] = []

/** Restore the in-memory consent matrix and audit log (for tests and the demo's "reset"). */
export function resetMockSource(): void {
  share = clone(defaultShare)
  audit = []
}

/**
 * Reads serve a fresh copy of each fixture so callers cannot mutate shared
 * module state. Writes (consent, audit) live in memory only.
 */
export const mockSource: DataSource = {
  async getPerson() {
    return clone(margaret)
  },
  async getHealth() {
    return clone(health)
  },
  async getSurroundings() {
    return clone(surroundings)
  },
  async getForecast() {
    return clone(forecast)
  },
  async getLineage() {
    return clone(lineage)
  },
  async getCareRecord() {
    return clone(careRecord)
  },
  async getDeviceFeed() {
    return clone(deviceFeed)
  },
  async getCareCircle() {
    return clone(careCircle)
  },
  async getSharePeople() {
    return clone(sharePeople)
  },
  async getHospital() {
    return clone(hospital)
  },
  async getCommunity() {
    return clone(community)
  },
  async getWatch() {
    return clone(watch)
  },
  async getCityScene() {
    return clone(cityScene)
  },
  async getOrbitScene() {
    return clone(orbitScene)
  },
  async getShare() {
    return clone(share)
  },
  async saveShare(viewer, cat, on) {
    share = { ...share, [viewer]: { ...share[viewer], [cat]: on } }
  },
  async appendAudit(entry) {
    audit = [...audit, clone(entry)]
  },
  async getAudit() {
    return clone(audit)
  },
}
