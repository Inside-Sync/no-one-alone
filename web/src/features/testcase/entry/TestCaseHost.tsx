'use client'

import { useEffect } from 'react'
import { CASES } from '../data/cases'
import { TestCaseOverlay, type TestCaseTab } from '../ui/TestCaseOverlay'
import TestCaseBody from './TestCaseBody'
import { useTestCase } from './TestCaseContext'

interface Props {
  onClose: () => void
  night: boolean
  tab: TestCaseTab
  onTabChange: (tab: TestCaseTab) => void
}

/**
 * The overlay with its body, loaded in one lazy chunk (the app's first load carries neither the overlay, its stylesheet nor its texts).
 * An unknown `?test=<key>` is dropped here, so the picker opens rather than a case nobody asked for.
 */
export default function TestCaseHost(p: Props) {
  const tc = useTestCase()
  const unknown = tc.caseKey !== null && !Object.prototype.hasOwnProperty.call(CASES, tc.caseKey)
  const { setCaseKey } = tc
  useEffect(() => { if (unknown) setCaseKey(null) }, [unknown, setCaseKey])
  return (
    <TestCaseOverlay onClose={p.onClose} night={p.night} tab={p.tab} onTabChange={p.onTabChange}>
      {unknown ? null : <TestCaseBody />}
    </TestCaseOverlay>
  )
}
