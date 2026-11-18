'use client'

import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TestCaseTab } from '../ui/tabContext'
import './shell.css'
import { loadTestCaseLocales } from './loadTestCaseLocales'
import { TestCaseContext, type TestCaseValue } from './TestCaseContext'

/** The overlay, its body, its stylesheet and its texts are loaded when it is first opened, so the app's first load does not carry them. */
const Host = lazy(async () => {
  const [mod] = await Promise.all([import('./TestCaseHost'), loadTestCaseLocales()])
  return mod
})

/** Shown for the moment the overlay is being fetched. */
function Loading() {
  const { t } = useTranslation('testcaseShell')
  return <p className="tc-loading" role="status">{t('loading')}</p>
}

/**
 * `?test=<key>` opens that case, `?test` alone opens the picker, `?test=bench` (or `judges`) opens that tab. Returns undefined when there is no param.
 * `tab` is only set for a tab link.
 */
export function readDeepLink(search: string): { caseKey: string | null; tab?: TestCaseTab } | undefined {
  const p = new URLSearchParams(search)
  if (!p.has('test')) return undefined
  const key = p.get('test') || null
  if (key === 'bench' || key === 'judges') return { caseKey: null, tab: key }
  return { caseKey: key }
}

/** Drops `test` from the address bar (keeps the router's history state and any other params). */
function stripDeepLink() {
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete('test')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  } catch { /* no history API: nothing to strip */ }
}

/**
 * Owns whether the Test case overlay is open, which case and which tab (Test case, For judges, Benchmark) it shows and whether it is night. Mount once in AppShell.
 * The deep link is read once, on mount, from the address bar (router redirects would drop the query otherwise).
 */
export function TestCaseProvider({ children }: { children: ReactNode }) {
  const [link] = useState(() => (typeof window === 'undefined' ? undefined : readDeepLink(window.location.search)))
  const [isOpen, setOpen] = useState(link !== undefined)
  const [caseKey, setCaseKey] = useState<string | null>(link?.caseKey ?? null)
  const [night, setNightState] = useState(false)
  const [tab, setTab] = useState<TestCaseTab>(link?.tab ?? 'case')

  const open = useCallback((key?: string) => { setCaseKey(key ?? null); setTab('case'); setOpen(true) }, [])
  const close = useCallback(() => { setOpen(false); setNightState(false); setTab('case') }, [])
  const setNight = useCallback((on: boolean) => setNightState(on), [])

  useEffect(() => {
    if (link) stripDeepLink()
  }, [link])

  const value = useMemo<TestCaseValue>(
    () => ({ isOpen, caseKey, open, close, setCaseKey, night, setNight }),
    [isOpen, caseKey, open, close, night, setNight],
  )

  return (
    <TestCaseContext.Provider value={value}>
      {children}
      {isOpen && (
        <Suspense fallback={<Loading />}>
          <Host onClose={close} night={night} tab={tab} onTabChange={setTab} />
        </Suspense>
      )}
    </TestCaseContext.Provider>
  )
}
