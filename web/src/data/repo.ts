import { mockSource } from './sources/mock'
import type { DataSource } from './sources/source'

export type { DataSource } from './sources/source'

/** Static UI copy (drawers, headings): same for every source, so re-exported rather than fetched. */
export { CHAT_INTRO, CHAT_QA, COND_ACTIONS, EXPLAIN, EXPLAIN_FALLBACK, HOME_COPY, ONCE_LABELS } from './fixtures/copy'

/**
 * Chooses the source from VITE_DATA_SOURCE=mock|firebase. The Firestore
 * source arrives in Task 15; until then every value resolves to the mock, and
 * `setDataSource` lets that task (or a test) install another implementation.
 */
let source: DataSource = mockSource

export function setDataSource(next: DataSource): void {
  source = next
}

export function resetDataSource(): void {
  source = mockSource
}

export const getPerson: DataSource['getPerson'] = (id) => source.getPerson(id)
export const getHealth: DataSource['getHealth'] = (id) => source.getHealth(id)
export const getSurroundings: DataSource['getSurroundings'] = (id) => source.getSurroundings(id)
export const getForecast: DataSource['getForecast'] = (id) => source.getForecast(id)
export const getLineage: DataSource['getLineage'] = (id) => source.getLineage(id)
export const getCareRecord: DataSource['getCareRecord'] = (id) => source.getCareRecord(id)
export const getDeviceFeed: DataSource['getDeviceFeed'] = (id) => source.getDeviceFeed(id)
export const getCareCircle: DataSource['getCareCircle'] = (id) => source.getCareCircle(id)
export const getSharePeople: DataSource['getSharePeople'] = () => source.getSharePeople()
export const getHospital: DataSource['getHospital'] = () => source.getHospital()
export const getCommunity: DataSource['getCommunity'] = () => source.getCommunity()
export const getWatch: DataSource['getWatch'] = () => source.getWatch()
export const getCityScene: DataSource['getCityScene'] = () => source.getCityScene()
export const getOrbitScene: DataSource['getOrbitScene'] = () => source.getOrbitScene()
export const getShare: DataSource['getShare'] = () => source.getShare()
export const saveShare: DataSource['saveShare'] = (viewer, cat, on) => source.saveShare(viewer, cat, on)
export const appendAudit: DataSource['appendAudit'] = (entry) => source.appendAudit(entry)
export const getAudit: DataSource['getAudit'] = () => source.getAudit()
