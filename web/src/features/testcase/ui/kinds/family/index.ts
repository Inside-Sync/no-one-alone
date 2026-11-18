import type { KindRegistry } from '../types'
import { FamHubCard } from './FamHub'
import { FamResultCard } from './FamResult'

export { FamHubCard } from './FamHub'
export { FamResultCard } from './FamResult'
export { FamilyDashboard } from './FamilyDashboard'
export { FamilyTree } from './Tree'
export { FamilyEditor } from './Editor'
export { FamilyForecast } from './Forecast'
export { ForecastChartSvg } from './Chart'
export { FamilyAlerts } from './Alerts'
export { PhoneF, WebF, familyScreens } from './screens'

/** Step cards of the whole-family case. The shared kinds (tl, teach, report...) come from the safety set. */
export const familyKinds: KindRegistry = { famhub: FamHubCard, famresult: FamResultCard }
