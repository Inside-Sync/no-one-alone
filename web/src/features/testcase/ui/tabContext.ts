import { createContext, useContext } from 'react'

export type TestCaseTab = 'case' | 'judges' | 'bench'
export const TEST_CASE_TABS: readonly TestCaseTab[] = ['case', 'judges', 'bench']

export interface TabValue { tab: TestCaseTab; setTab: (tab: TestCaseTab) => void }

/** The overlay's active tab, for the body to read and change (the bar's switch and the in-page links share it). */
export const TabContext = createContext<TabValue>({ tab: 'case', setTab: () => {} })
export const useTestCaseTab = (): TabValue => useContext(TabContext)

/** DOM ids that tie a tab to its panel (`aria-controls` / `aria-labelledby`). The panel ids are the layout's section ids. */
export const tabId = (tab: TestCaseTab): string => `tcTab-${tab}`
export const panelId = (tab: TestCaseTab): string => (tab === 'case' ? 'v-demo' : tab === 'judges' ? 'v-judges' : 'v-bench')
