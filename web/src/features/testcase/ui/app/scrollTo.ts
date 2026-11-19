/** The overlay's scroll container (the page behind is inert, so everything scrolls inside it). */
export const HOST_ID = 'tcHost'
/** Space kept between the sticky bar and the top of a target. */
const GAP = 12

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export interface ScrollOpts {
  /** Smooth by default; reduced motion always makes it instant. */
  behavior?: 'smooth' | 'instant'
  /** Move keyboard focus to the target's heading (only for a button the person pressed, never during a run). */
  focus?: boolean
}

type Target = Element | string | null | undefined

const resolve = (t: Target): Element | null => (typeof t === 'string' ? document.getElementById(t) : t ?? null)
const behaviorOf = (o?: ScrollOpts): ScrollBehavior => (prefersReducedMotion() || o?.behavior === 'instant' ? 'auto' : 'smooth')

/** Height of the sticky bar as it covers the top of the overlay, plus a small gap. */
export function barOffset(host: Element): number {
  const bar = host.querySelector('.tc-bar')
  if (!bar) return GAP
  const covered = bar.getBoundingClientRect().bottom - host.getBoundingClientRect().top
  // The run controls stick under the bar (8 px below it) while a run is on.
  const pb = host.querySelector<HTMLElement>('.tc-pb')
  return Math.max(0, covered) + (pb ? 8 + pb.offsetHeight : 0) + GAP
}

/** Put keyboard focus on a target's heading (or the target) without scrolling again. */
export function focusHeading(target: Target): void {
  const el = resolve(target)
  if (!el) return
  const h = (el.querySelector('h2,h3') as HTMLElement | null) ?? (el as HTMLElement)
  if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1')
  h.focus({ preventScroll: true })
}

/** The element's own scroll box inside the overlay (the sticky step column on a wide screen), when it has one and the target is inside it. */
function scrollBoxOf(el: Element): HTMLElement | null {
  const box = el.parentElement?.closest<HTMLElement>('[data-tc-scroll]') ?? null
  if (!box || typeof box.scrollTo !== 'function') return null
  const oy = typeof getComputedStyle === 'function' ? getComputedStyle(box).overflowY : ''
  return oy === 'auto' || oy === 'scroll' ? box : null
}

/**
 * Scroll the overlay so the target sits just under the sticky bar. A target inside the step column (which scrolls by itself on a
 * wide screen) is scrolled inside that column, and the column is brought under the bar. Returns false when the target does not exist.
 */
export function scrollToTarget(target: Target, opts?: ScrollOpts): boolean {
  const el = resolve(target)
  if (!el) return false
  const behavior = behaviorOf(opts)
  const host = document.getElementById(HOST_ID)
  const box = scrollBoxOf(el)
  let page: Element = el
  if (box) {
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - GAP
    box.scrollTo({ top: Math.max(0, top), behavior })
    page = box
  } else if (el.hasAttribute('data-tc-scroll') && (el as HTMLElement).scrollTop > 0 && typeof (el as HTMLElement).scrollTo === 'function') {
    ;(el as HTMLElement).scrollTo({ top: 0, behavior })
  }
  if (host && typeof host.scrollTo === 'function') {
    const top = page.getBoundingClientRect().top - host.getBoundingClientRect().top + host.scrollTop - barOffset(host)
    host.scrollTo({ top: Math.max(0, top), behavior })
  } else if (typeof (page as HTMLElement).scrollIntoView === 'function') {
    page.scrollIntoView({ block: 'start', behavior })
  }
  if (opts?.focus) focusHeading(el)
  return true
}

/** Scroll the overlay back to its top. */
export function scrollOverlayTop(opts?: ScrollOpts): void {
  const host = document.getElementById(HOST_ID)
  if (host && typeof host.scrollTo === 'function') host.scrollTo({ top: 0, behavior: behaviorOf(opts) })
}

/** Same as `scrollToTarget`, a moment later: after React has drawn what the button changed. Returns a cancel function. */
export function scrollSoon(target: Target, opts?: ScrollOpts, ms = 0): () => void {
  const id = window.setTimeout(() => { scrollToTarget(target, opts) }, ms)
  return () => window.clearTimeout(id)
}

/** Same as `scrollOverlayTop`, a moment later. Returns a cancel function. */
export function scrollTopSoon(opts?: ScrollOpts, ms = 0): () => void {
  const id = window.setTimeout(() => scrollOverlayTop(opts), ms)
  return () => window.clearTimeout(id)
}

/** Keys that scroll a page. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'])

/**
 * Call `onManual` when the person scrolls by hand (wheel, touch or a scrolling key) in the overlay.
 * A key pressed on a field, a button or a tab is not a scroll. Returns the cleanup.
 */
export function watchManualScroll(onManual: () => void): () => void {
  const host: HTMLElement | Document = document.getElementById(HOST_ID) ?? document
  const onKey = (e: Event) => {
    const k = e as KeyboardEvent
    if (!SCROLL_KEYS.has(k.key)) return
    const el = k.target as HTMLElement | null
    if (el && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName)) return
    if (el?.getAttribute?.('role') === 'tab') return
    onManual()
  }
  const onPointer = () => onManual()
  host.addEventListener('wheel', onPointer, { passive: true })
  host.addEventListener('touchmove', onPointer, { passive: true })
  host.addEventListener('keydown', onKey)
  return () => {
    host.removeEventListener('wheel', onPointer)
    host.removeEventListener('touchmove', onPointer)
    host.removeEventListener('keydown', onKey)
  }
}
