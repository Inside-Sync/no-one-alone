'use client'

import type { ReactNode } from 'react'
import { ChatPanel } from '@/features/chat/ChatPanel'
import { ContextBar } from './ContextBar'
import { Guide } from './Guide'
import { ShellOverridesProvider } from './ShellOverrides'
import { TopNav } from './TopNav'
import { TourBar } from './TourBar'

/**
 * Header, context bar, the "On this screen" tip and the page below them (`.wrap` is a grid, so each is a row), plus the
 * fixed Ask Noa chat and the walkthrough bar. Pages can adjust the context bar and the tip (ShellOverrides).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ShellOverridesProvider>
      <TopNav />
      <ContextBar />
      <Guide />
      {children}
      <ChatPanel />
      <TourBar />
    </ShellOverridesProvider>
  )
}
