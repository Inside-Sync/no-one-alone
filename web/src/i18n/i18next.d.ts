import 'i18next'
import type around from '../locales/en/around.json'
import type common from '../locales/en/common.json'
import type community from '../locales/en/community.json'
import type forecast from '../locales/en/forecast.json'
import type health from '../locales/en/health.json'
import type home from '../locales/en/home.json'
import type hospital from '../locales/en/hospital.json'
import type lineage from '../locales/en/lineage.json'
import type live from '../locales/en/live.json'
import type me from '../locales/en/me.json'
import type overlay from '../locales/en/overlay.json'
import type privacy from '../locales/en/privacy.json'
import type record from '../locales/en/record.json'

/** English is the reference: keys are type-checked against it (`t('live:idle.title')`). */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      home: typeof home
      health: typeof health
      around: typeof around
      forecast: typeof forecast
      live: typeof live
      me: typeof me
      privacy: typeof privacy
      lineage: typeof lineage
      record: typeof record
      hospital: typeof hospital
      community: typeof community
      overlay: typeof overlay
    }
  }
}
