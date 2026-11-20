'use client'

import { lazy, Suspense, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import './benchmarkButton.css'

/**
 * The Benchmark dialog, its stylesheets, the scenario set, the engine and the Test case texts (the bench and rule texts live there)
 * load in one lazy step when the dialog first opens, so the app's first load does not grow.
 */
const BenchmarkDialog = lazy(async () => {
  const [mod] = await Promise.all([
    import('./BenchmarkDialog'),
    import('@/features/testcase/entry/loadTestCaseLocales').then((m) => m.loadTestCaseLocales()),
  ])
  return mod
})

function Loading() {
  const { t } = useTranslation()
  // In a portal: the glass header would otherwise be the containing block of this fixed note.
  return createPortal(<p className="bmk-loading" role="status">{t('nav.benchmarkLoading')}</p>, document.body)
}

/**
 * Header button (`#runBench`) that opens the live Benchmark: the labelled scenario set run through the real engine in the browser.
 * It stands on its own, without the legacy Test case overlay; the label shows from 1024 px up, icon only (aria-label stays) below.
 */
export function BenchmarkButton() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <button
        type="button"
        className="btn"
        id="runBench"
        aria-label={t('nav.benchmarkLabel')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="ic"><Icon name="chart-column" /></span>
        <span className="t">{t('nav.benchmark')}</span>
      </button>
      {open && (
        <Suspense fallback={<Loading />}>
          <BenchmarkDialog onClose={close} />
        </Suspense>
      )}
    </>
  )
}
