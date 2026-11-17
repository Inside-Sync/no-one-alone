'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { PageContext } from '@/domain/views'

/**
 * What a page can change in the shell while it is mounted:
 * - `context`: the context bar's title, subtitle, avatar and facts (the hospital patient list shows the opened patient there);
 * - `tip`: the key of the "On this screen" tip under `guide:tips`, for example `chart.fu` instead of the page's own tip.
 * Both fall back to the page's defaults when the page unmounts or passes `null`.
 */
export type ContextOverride = Partial<PageContext> & { title?: string }

interface Value {
  context: ContextOverride | null
  tip: string | null
  setContext: (c: ContextOverride | null) => void
  setTip: (k: string | null) => void
}

const Ctx = createContext<Value | null>(null)

export function ShellOverridesProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<ContextOverride | null>(null)
  const [tip, setTip] = useState<string | null>(null)
  const value = useMemo(() => ({ context, tip, setContext, setTip }), [context, tip])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Read side, for the shell. Outside a provider nothing is overridden. */
export function useShellOverrides(): Pick<Value, 'context' | 'tip'> {
  const v = useContext(Ctx)
  return { context: v?.context ?? null, tip: v?.tip ?? null }
}

/** Page side: show `ctx` in the context bar while this component is mounted. Pass a memoised object (or null). */
export function useContextOverride(ctx: ContextOverride | null): void {
  const v = useContext(Ctx)
  const set = v?.setContext
  useEffect(() => {
    set?.(ctx)
    return () => set?.(null)
  }, [set, ctx])
}

/** Page side: show the tip `guide:tips.<key>` (for example `chart.sum`, `pages.loop`) while mounted; null keeps the page's own. */
export function useTipKey(key: string | null): void {
  const v = useContext(Ctx)
  const set = v?.setTip
  useEffect(() => {
    set?.(key)
    return () => set?.(null)
  }, [set, key])
}
