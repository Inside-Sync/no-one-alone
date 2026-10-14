import type { ReactNode } from 'react'

export type PillTone = 'good' | 'warn' | 'bad' | 'brand' | 'plain' | 'jac'

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>
}
