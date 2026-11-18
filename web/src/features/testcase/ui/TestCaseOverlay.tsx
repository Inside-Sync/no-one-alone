'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { AgentOrb } from '@/components/noa/AgentOrb'
import '../testcase.css'
import { TabContext, TEST_CASE_TABS, tabId, panelId, type TestCaseTab } from './tabContext'

export type { TestCaseTab }

interface Props {
  onClose: () => void
  /** A night emergency is playing: dark even when the app is light. */
  night?: boolean
  /** The active tab. Give `tab` with `onTabChange` to control it (the provider does); without them the overlay keeps it itself. */
  tab?: TestCaseTab
  onTabChange?: (tab: TestCaseTab) => void
  /** Extra controls in the bar, before Close. */
  actions?: ReactNode
  children: ReactNode
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'

const appIsDark = () => document.body.classList.contains('night') || document.body.classList.contains('dark')

/**
 * Full-screen dialog in a portal. Open while mounted: the provider mounts it on open and unmounts it on close.
 * Esc closes; Tab stays inside; the page behind is inert and cannot scroll; focus returns to the opener on close.
 * Dark = the app is dark (`body.night`, also set by the theme switch) or `night` is true.
 */
export function TestCaseOverlay({ onClose, night = false, tab, onTabChange, actions, children }: Props) {
  const { t, i18n } = useTranslation('testcaseShell')
  const titleId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  const [appDark, setAppDark] = useState(appIsDark)
  const [ownTab, setOwnTab] = useState<TestCaseTab>('case')
  const activeTab = tab ?? ownTab
  const changeTab = useCallback((next: TestCaseTab) => { if (onTabChange) onTabChange(next); else setOwnTab(next) }, [onTabChange])
  const tabValue = useMemo(() => ({ tab: activeTab, setTab: changeTab }), [activeTab, changeTab])

  // Follow the app's theme while open.
  useEffect(() => {
    const mo = new MutationObserver(() => setAppDark(appIsDark()))
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  // Focus in, lock scroll, make the page behind inert; undo all of it and restore focus on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = rootRef.current
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    const inerted: { el: HTMLElement; vis: string }[] = []
    for (const el of Array.from(document.body.children)) {
      if (el instanceof HTMLElement && !el.contains(root) && !el.hasAttribute('inert') && el.tagName !== 'SCRIPT') {
        el.setAttribute('inert', '')
        // Fully covered by the dialog anyway; hiding it also keeps the app's own tones out of the overlay's contrast checks.
        inerted.push({ el, vis: el.style.visibility })
        el.style.visibility = 'hidden'
      }
    }
    closeRef.current?.focus()
    return () => {
      html.style.overflow = prevOverflow
      for (const { el, vis } of inerted) { el.removeAttribute('inert'); el.style.visibility = vis }
      if (opener && opener.isConnected) opener.focus()
    }
  }, [])

  // Esc closes, Tab wraps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !rootRef.current) return
      const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[hidden]') && el.getClientRects().length > 0)
      if (!items.length) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !rootRef.current.contains(active))) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (active === last || !rootRef.current.contains(active))) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // APG tabs: Arrow keys (flipped in RTL), Home and End move focus and select; only the selected tab is in the Tab order.
  const rtl = i18n.dir(i18n.resolvedLanguage ?? 'en') === 'rtl'
  const onTabKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const i = TEST_CASE_TABS.indexOf(activeTab)
    const fwd = rtl ? 'ArrowLeft' : 'ArrowRight'
    const back = rtl ? 'ArrowRight' : 'ArrowLeft'
    let next = -1
    if (e.key === fwd) next = (i + 1) % TEST_CASE_TABS.length
    else if (e.key === back) next = (i - 1 + TEST_CASE_TABS.length) % TEST_CASE_TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TEST_CASE_TABS.length - 1
    if (next < 0) return
    e.preventDefault()
    changeTab(TEST_CASE_TABS[next])
    document.getElementById(tabId(TEST_CASE_TABS[next]))?.focus()
  }

  const dark = appDark || night
  const lang = i18n.resolvedLanguage ?? 'en'
  return createPortal(
    <div
      ref={rootRef}
      id="tcHost"
      className={`tc${dark ? ' dark' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      dir={i18n.dir(lang)}
      lang={lang}
    >
      <div className="tc-scene" aria-hidden="true"><div className="tc-tint" /></div>
      <div className="tc-bar">
        <span className="tc-orb" aria-hidden="true"><AgentOrb size={44} /></span>
        <div className="tc-bar-t">
          <b id={titleId}>{t('bar.title')}</b>
          <div className="src">{t('bar.subtitle')}</div>
        </div>
        <div className="tc-bar-actions">
          <div className="tc-tabs" role="tablist" aria-label={t('tabs.label')} onKeyDown={onTabKey}>
            {TEST_CASE_TABS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={tabId(id)}
                aria-selected={activeTab === id}
                aria-controls={panelId(id)}
                tabIndex={activeTab === id ? 0 : -1}
                onClick={() => changeTab(id)}
              >{t(`tabs.${id}`)}</button>
            ))}
          </div>
          {actions}
          <button ref={closeRef} type="button" className="btn ghost sm" id="tcClose" aria-label={t('bar.closeLabel')} onClick={onClose}>
            {t('bar.close')}
            <span className="ic"><Icon name="x" /></span>
          </button>
        </div>
      </div>
      <TabContext.Provider value={tabValue}>{children}</TabContext.Provider>
    </div>,
    document.body,
  )
}
