'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { BenchPanel } from '@/features/testcase/ui/bench/BenchPanel'
import { useBenchRun } from '@/features/testcase/ui/bench/useBenchRun'
import '@/features/testcase/testcase.css'
import './benchmark.css'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'

const appIsDark = () => document.body.classList.contains('night') || document.body.classList.contains('dark')

/**
 * The live Benchmark on its own, opened from the header: a large modal dialog in a portal with the Benchmark panel of the Test case
 * (the same scenario set, run through the real engine in the browser). It borrows the Test case stylesheet (`.tc` scope, its light and
 * dark tokens), not the overlay. Open while mounted. Esc, the close button and the scrim close it; Tab stays inside; the page behind is
 * inert and does not scroll; focus returns to the header button. A run in progress stops when the dialog closes (useBenchRun).
 * There is no Test case tab here to open a scenario in, so the scenario list has no "Open" buttons.
 */
export default function BenchmarkDialog({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const run = useBenchRun()
  const titleId = useId()
  const hostRef = useRef<HTMLDivElement>(null)
  const dlgRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  const [dark, setDark] = useState(appIsDark)

  // Follow the app's theme while open.
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(appIsDark()))
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  // Focus in, lock the page scroll, make the page behind inert; undo all of it and give focus back on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const host = hostRef.current
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    const inerted: HTMLElement[] = []
    for (const el of Array.from(document.body.children)) {
      if (el instanceof HTMLElement && el !== host && !el.contains(host) && !el.hasAttribute('inert') && el.tagName !== 'SCRIPT') {
        el.setAttribute('inert', '')
        inerted.push(el)
      }
    }
    closeRef.current?.focus()
    return () => {
      html.style.overflow = prevOverflow
      for (const el of inerted) el.removeAttribute('inert')
      if (opener && opener.isConnected) opener.focus()
    }
  }, [])

  // Esc closes, Tab wraps inside the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      const root = dlgRef.current
      if (e.key !== 'Tab' || !root) return
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[hidden]') && el.getClientRects().length > 0)
      if (!items.length) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !root.contains(active))) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (active === last || !root.contains(active))) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const lang = i18n.resolvedLanguage ?? 'en'
  return createPortal(
    <div ref={hostRef} className="bmk-host">
      <div className="bmk-scrim" aria-hidden="true" onClick={onClose} />
      <div
        ref={dlgRef}
        id="benchDialog"
        className={`tc bmk${dark ? ' dark' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir={i18n.dir(lang)}
        lang={lang}
      >
        <div className="bmk-bar">
          <b id={titleId}>{t('nav.benchmarkTitle')}</b>
          <button ref={closeRef} type="button" className="btn ghost sm" aria-label={t('nav.benchmarkClose')} onClick={onClose}>
            {t('drawer.close')}
            <span className="ic"><Icon name="x" /></span>
          </button>
        </div>
        <div className="bmk-body">
          <div className="tc-bench card"><BenchPanel run={run} /></div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
