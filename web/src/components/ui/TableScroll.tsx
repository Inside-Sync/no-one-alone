import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * `<div class="tw">`: the prototype's sideways-scrolling table wrapper.
 * When the table overflows (phones), keyboard users must be able to scroll it, so the
 * wrapper becomes a focusable, named region (WCAG 2.1.1; axe `scrollable-region-focusable`).
 * The name is the card heading unless `label` is given.
 */
export function TableScroll({ label, children }: { label?: string; children: ReactNode }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const check = () => {
      const overflows = el.scrollWidth > el.clientWidth + 1
      const heading = el.closest('.card')?.querySelector('h2')?.textContent?.trim()
      setName(overflows ? (label ?? heading ?? t('charts.table')) : null)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [label, t])

  return name === null
    ? <div className="tw" ref={ref}>{children}</div>
    : <div className="tw" ref={ref} tabIndex={0} role="region" aria-label={name}>{children}</div>
}
