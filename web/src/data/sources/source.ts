import type {
  AuditEntry, SharePerson, CareRecord, CategoryId, CircleMember, CityGeometry, OrbitScene, CommunityData, DeviceFeed, Forecast, HealthData,
  HospitalData, Lineage, Person, PersonId, ShareMatrix, SubjectId, Surroundings, WatchData,
} from '../types'

/**
 * Contract every data source implements: the mock source (fixtures, in-memory
 * writes) and the Firestore source (Task 15). All calls are async so both can
 * satisfy it.
 */
export interface DataSource {
  getPerson(id: SubjectId): Promise<Person>
  getHealth(id: SubjectId): Promise<HealthData>
  getSurroundings(id: SubjectId): Promise<Surroundings>
  getForecast(id: SubjectId): Promise<Forecast>
  getLineage(id: SubjectId): Promise<Lineage>
  getCareRecord(id: SubjectId): Promise<CareRecord>
  getDeviceFeed(id: SubjectId): Promise<DeviceFeed>
  getCareCircle(id: SubjectId): Promise<CircleMember[]>
  /** Everyone Margaret can share with (PEOPLE2 in the prototype). */
  getSharePeople(): Promise<SharePerson[]>
  getHospital(): Promise<HospitalData>
  getCommunity(): Promise<CommunityData>
  getWatch(): Promise<WatchData>
  /** Inputs of the procedural 3D Marrickville model and the camera presets. */
  getCityScene(): Promise<CityGeometry>
  /** The 3D care-circle orbit (balls, rings, centre). */
  getOrbitScene(): Promise<OrbitScene>
  /** Consent: the full viewer x category matrix (defaults to the prototype's SHARE). */
  getShare(): Promise<ShareMatrix>
  /** Consent: store one switch. Which switches may change is domain logic (Task 5). */
  saveShare(viewer: PersonId, cat: CategoryId, on: boolean): Promise<void>
  appendAudit(entry: AuditEntry): Promise<void>
  getAudit(): Promise<AuditEntry[]>
}
