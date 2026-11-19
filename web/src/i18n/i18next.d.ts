import 'i18next'
import type around from '../locales/en/around.json'
import type chat from '../locales/en/chat.json'
import type common from '../locales/en/common.json'
import type government from '../locales/en/government.json'
import type health from '../locales/en/health.json'
import type home from '../locales/en/home.json'
import type hospital from '../locales/en/hospital.json'
import type screening from '../locales/en/screening.json'
import type lineage from '../locales/en/lineage.json'
import type live from '../locales/en/live.json'
import type me from '../locales/en/me.json'
import type overlay from '../locales/en/overlay.json'
import type privacy from '../locales/en/privacy.json'
import type record from '../locales/en/record.json'
import type treatment from '../locales/en/treatment.json'
import type patients from '../locales/en/patients.json'
import type overview from '../locales/en/overview.json'
import type guide from '../locales/en/guide.json'
import type testcase from '../locales/en/testcase.json'
import type testcaseShell from '../locales/en/testcaseShell.json'
import type tcSafety from '../locales/en/tcSafety.json'
import type tcPrevention from '../locales/en/tcPrevention.json'
import type tcApp from '../locales/en/tcApp.json'
import type tcBench from '../locales/en/tcBench.json'
import type tcGates from '../locales/en/tcGates.json'
import type familyHealth from '../locales/en/familyHealth.json'
import type familyHealthUi from '../locales/en/familyHealthUi.json'

/** English is the reference: keys are type-checked against it (`t('live:idle.title')`). */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      home: typeof home
      health: typeof health
      around: typeof around
      live: typeof live
      me: typeof me
      privacy: typeof privacy
      lineage: typeof lineage
      record: typeof record
      hospital: typeof hospital
      screening: typeof screening
      government: typeof government
      overlay: typeof overlay
      chat: typeof chat
      treatment: typeof treatment
      patients: typeof patients
      overview: typeof overview
      guide: typeof guide
      testcase: typeof testcase
      testcaseShell: typeof testcaseShell
      tcSafety: typeof tcSafety
      tcPrevention: typeof tcPrevention
      tcApp: typeof tcApp
      tcBench: typeof tcBench
      tcGates: typeof tcGates
      familyHealth: typeof familyHealth
      familyHealthUi: typeof familyHealthUi
    }
  }
}
