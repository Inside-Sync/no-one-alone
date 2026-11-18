import type { KindRegistry, ScreenSet } from '../types'
import { HomeCard } from './HomeCard'
import { SafetyPhone, SafetyWeb } from './Screens'
import { AcceptCard, BtnCard, DailyCard, RecheckCard, ReportCard, TlCard } from './StepCards'
import { TeachCard } from './TeachCard'
import './safety.css'

/** The step cards of the safety-net cases (and the kinds every case shares: tl, btn, teach, daily, accept, report). */
export const safetyKinds: KindRegistry = {
  home: HomeCard,
  tl: TlCard,
  btn: BtnCard,
  teach: TeachCard,
  recheck: RecheckCard,
  daily: DailyCard,
  accept: AcceptCard,
  report: ReportCard,
}

/** Phone and family web app of the safety-net cases. The Noa panel (screen 3) is built by the app. */
export const safetyScreens: ScreenSet = { Phone: SafetyPhone, Web: SafetyWeb }

export { useSpeech } from './useSpeech'
export { SpeechCheck, SpeechResultView } from './SpeechCheck'
export { HomeCard } from './HomeCard'
export { AcceptCard, BtnCard, DailyCard, RecheckCard, ReportCard, TlCard } from './StepCards'
export { TeachCard } from './TeachCard'
export { SafetyPhone, SafetyWeb } from './Screens'
