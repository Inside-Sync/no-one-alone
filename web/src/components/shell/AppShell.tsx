'use client'

import type { ReactNode } from 'react'
import { ContextBar } from './ContextBar'
import { TopNav } from './TopNav'

/** Header, context bar and the page below them (`.wrap` is a grid, so each is a row). */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNav />
      <ContextBar />
      {children}
    </>
  )
}
