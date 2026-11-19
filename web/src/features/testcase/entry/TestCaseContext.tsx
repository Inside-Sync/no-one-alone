'use client'

import { createContext, useContext } from 'react'

export interface TestCaseValue {
  isOpen: boolean
  /** The case on screen (a key of the case table); null while the picker is showing or the overlay is closed. */
  caseKey: string | null
  /** Open the overlay, on that case or (no key) on the picker. */
  open: (caseKey?: string) => void
  /** Open the overlay and start the 3-minute Judge path. */
  openJudge: () => void
  /** True from `openJudge` until the UI has started the path (it calls `consumeJudge`). */
  judgePending: boolean
  consumeJudge: () => void
  close: () => void
  /** The UI records which case it is showing, so reopening and the deep link agree. */
  setCaseKey: (caseKey: string | null) => void
  /** True while a night emergency plays: the overlay turns dark even when the app is light. */
  night: boolean
  setNight: (on: boolean) => void
}

const NOOP: TestCaseValue = {
  isOpen: false, caseKey: null, open: () => {}, openJudge: () => {}, judgePending: false, consumeJudge: () => {}, close: () => {}, setCaseKey: () => {}, night: false, setNight: () => {},
}

export const TestCaseContext = createContext<TestCaseValue>(NOOP)

/** Without a provider (a unit test of one component) this is a no-op value, so entry points never throw. */
export const useTestCase = (): TestCaseValue => useContext(TestCaseContext)
