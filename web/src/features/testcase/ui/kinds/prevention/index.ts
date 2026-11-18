import type { KindRegistry } from '../types'
import { PassportCard } from './Passport'
import { ReferCard } from './Refer'
import { ResultCard } from './Result'

export { PassportCard } from './Passport'
export { ResultCard } from './Result'
export { ReferCard } from './Refer'
export { PhoneP, WebP, preventionScreens } from './screens'
export { Moment } from './moment'
export { ReviewQueue } from './queue'

/** Step cards of the prevention cases (Hind, Khalid, Arjun, Hamad). The shared kinds (tl, btn, teach, ...) come from the safety set. */
export const preventionKinds: KindRegistry = { passport: PassportCard, result: ResultCard, refer: ReferCard }
