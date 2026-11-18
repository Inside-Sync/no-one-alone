'use client'

import TestCaseApp from '../ui/app/TestCaseApp'

/**
 * What the overlay shows. This is the single seam between the shell and the UI: the app reads `useTestCase()` for the case key
 * and calls `setNight`. One engine lives for as long as the overlay is open.
 */
export default function TestCaseBody() {
  return <TestCaseApp />
}
