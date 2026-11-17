/** "Moza's case": the 21-step walkthrough across the three views. Text is in `guide:tour.steps[i]` (title, text, try). */

import type { ViewId, Who } from './views'

export interface TourStep {
  view: ViewId
  /** The role to switch to (individual view only); family also selects Khalid as the viewer. */
  who?: Who
  page: string
  /** Query string for the page: `step` is the care-record step (sum, his, scr, res, tx, fu); `patient` an opened patient id. */
  query?: Record<string, string>
  /** The step shows a Play button that starts the night alert replay. */
  night?: boolean
  /** The element to outline: any element with `data-tour="<target>"`. A page without it is simply not outlined. */
  target: string
}

export const TOUR_STEPS: readonly TourStep[] = [
  { view: 'individual', who: 'self', page: 'me', target: 'me' },
  { view: 'individual', who: 'self', page: 'health', target: 'health' },
  { view: 'individual', who: 'self', page: 'record', query: { step: 'sum' }, target: 'record-steps' },
  { view: 'individual', who: 'self', page: 'treatment', target: 'treatment-plan' },
  { view: 'individual', who: 'self', page: 'around', target: 'around' },
  { view: 'individual', who: 'self', page: 'lineage', target: 'lineage' },
  { view: 'individual', who: 'family', page: 'health', target: 'context' },
  { view: 'individual', who: 'family', page: 'live', night: true, target: 'live' },
  { view: 'hospital', page: 'ed', target: 'ed' },
  { view: 'hospital', page: 'patients', target: 'patient-list' },
  { view: 'hospital', page: 'patients', query: { patient: 'moza', step: 'sum' }, target: 'chart-steps' },
  { view: 'hospital', page: 'patients', query: { patient: 'moza', step: 'his' }, target: 'chart-episodes' },
  { view: 'hospital', page: 'patients', query: { patient: 'moza', step: 'scr' }, target: 'chart-loop' },
  { view: 'hospital', page: 'patients', query: { patient: 'moza', step: 'res' }, target: 'chart-results' },
  { view: 'hospital', page: 'patients', query: { patient: 'moza', step: 'tx' }, target: 'chart-treatment' },
  { view: 'hospital', page: 'patients', query: { patient: 'moza', step: 'fu' }, target: 'chart-followup' },
  { view: 'hospital', page: 'overview', target: 'departments' },
  { view: 'government', page: 'population', target: 'wellbeing' },
  { view: 'government', page: 'population', target: 'recovery' },
  { view: 'government', page: 'population', target: 'hospital-performance' },
  { view: 'government', page: 'signals', target: 'decisions' },
]

/** `/hospital/patients?patient=moza&step=sum` */
export function tourPath(step: TourStep): string {
  const q = step.query ? `?${new URLSearchParams(step.query).toString()}` : ''
  return `/${step.view}/${step.page}${q}`
}
