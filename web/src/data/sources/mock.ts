import { currentLanguage } from '@/i18n'
import { cityScene } from '../fixtures/city'
import { defaultShare } from '../fixtures/share'
import type { DataSource } from './source'
import type {
  AuditEntry, CareRecord, CircleMember, CommunityData, DeviceFeed, Forecast, HealthData, HospitalData, Lineage, OrbitScene,
  Person, SharePerson, ShareMatrix, Surroundings, WatchData,
} from '../types'

/**
 * The mock's content per language: `src/locales/{lng}/data/{file}.json`, one object per file keyed by the export
 * name it had as a TS fixture. A file missing in a language falls back to English.
 */
const files = import.meta.glob<Record<string, unknown>>('../../locales/*/data/*.json', { eager: true, import: 'default' })

function data<T>(file: string, key: string): T {
  const at = (lng: string) => files[`../../locales/${lng}/data/${file}.json`]?.[key]
  const v = at(currentLanguage()) ?? at('en')
  if (v === undefined) throw new Error(`mock data ${file}.${key} not found`)
  return v as T
}

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
    return clone(data<Person>('margaret', 'margaret'))
  },
  async getHealth() {
    return clone(data<HealthData>('health', 'health'))
  },
  async getSurroundings() {
    return clone(data<Surroundings>('around', 'surroundings'))
  },
  async getForecast() {
    return clone(data<Forecast>('forecast', 'forecast'))
  },
  async getLineage() {
    return clone(data<Lineage>('lineage', 'lineage'))
  },
  async getCareRecord() {
    return clone(data<CareRecord>('record', 'careRecord'))
  },
  async getDeviceFeed() {
    return clone(data<DeviceFeed>('device', 'deviceFeed'))
  },
  async getCareCircle() {
    return clone(data<CircleMember[]>('circle', 'careCircle'))
  },
  async getSharePeople() {
    return clone(data<SharePerson[]>('circle', 'sharePeople'))
  },
  async getHospital() {
    return clone(data<HospitalData>('hospital', 'hospital'))
  },
  async getCommunity() {
    return clone(data<CommunityData>('community', 'community'))
  },
  async getWatch() {
    return clone(data<WatchData>('watch', 'watch'))
  },
  async getCityScene() {
    return clone(cityScene)
  },
  async getOrbitScene() {
    return clone(data<OrbitScene>('circle', 'orbitScene'))
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
