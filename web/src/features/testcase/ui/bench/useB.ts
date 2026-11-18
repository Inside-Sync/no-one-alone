import { useTranslation } from 'react-i18next'

/** The tcBench translator; keys are built at run time (a group, a decision, a tag), so it is untyped. */
export type TB = (key: string, opts?: Record<string, unknown>) => string
export const useB = (): TB => useTranslation('tcBench').t as unknown as TB
/** The `testcase` namespace, for the published rule text. */
export const useRuleText = (): TB => useTranslation('testcase').t as unknown as TB
