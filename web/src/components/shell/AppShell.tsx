'use client'

import type { ReactNode } from 'react'
import { usePathname } from '@/app/navigation'
import { parsePath } from '@/domain/views'
import { ChatPanel } from '@/features/chat/ChatPanel'
import { ContextBar } from './ContextBar'
import { Guide } from './Guide'
import { ShellOverridesProvider } from './ShellOverrides'
import { TopNav } from './TopNav'
import { TourBar } from './TourBar'
import { TestCaseBanner } from '@/features/testcase/entry/TestCaseBanner'
import { TestCaseProvider } from '@/features/testcase/entry/TestCaseProvider'
import { legacyTestCaseOn } from '@/config/legacy'
import { FamilyMessages } from '@/features/familyHealth/ui/Messages'
import { EmergencyNight } from '@/features/familyHealth/ui/EmergencyNight'

/**
 * Header, context bar, the "On this screen" tip and the page below them (`.wrap` is a grid, so each is a row), plus the
 * Ask Noa chat panel (without its floating button) and the walkthrough bar. The Test case banner is off (config/legacy).
 * Pages can adjust the context bar and the tip (ShellOverrides).
 */
export function AppShell({ children }: { children: ReactNode }) {
  // The Family health tab is the "Noa · family health" panel alone: no context bar (nor its pause banner) and no tip.
  const { view, page } = parsePath(usePathname())
  const famTab = view === 'individual' && page === 'lineage'
  return (
    <ShellOverridesProvider>
      <TestCaseProvider>
        <TopNav />
        {legacyTestCaseOn() && <TestCaseBanner />}
        {!famTab && <ContextBar />}
        {!famTab && <Guide />}
        {children}
        {/* No "Ask Noa" floating button on any view (the redesign has its own messages button on Individual); the panel
            still opens from the in-page Ask Noa buttons. */}
        <ChatPanel fab={false} />
        {/* Decision (b): on the Individual view the messages button is "Noa · family messages" (the family-health panel's). */}
        {view === 'individual' && <FamilyMessages />}
        <EmergencyNight />
        <TourBar />
      </TestCaseProvider>
    </ShellOverridesProvider>
  )
}
