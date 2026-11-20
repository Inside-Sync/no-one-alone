import type { StageId } from '../index'
import { getEngine, reducedMotion, setUi } from './store'

/**
 * One-screen layout of the newer prototype: the feed's `.items` is its own scroll area that follows new messages unless the
 * viewer scrolled up (prototype FOLLOW / SCROLL_Y), and starting a check collapses the tree and the "Try it" panel and brings the
 * panel into place (collapseTop).
 */
export const feedScroll = { follow: true }
export const followFeed = () => { feedScroll.follow = true }

/** The sticky top nav's height plus a gap: where the panel's top lands after collapsing (prototype: 66 px). */
const TOP_GAP = 66

export function collapseTop() {
  setUi({ wiOpen: false, treeOpen: false })
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') return
  requestAnimationFrame(() => {
    const r = document.querySelector('#fh-panel section')
    if (!r) return
    const y = r.getBoundingClientRect().top + window.scrollY - TOP_GAP
    // jsdom (unit tests) has no layout and no scrolling.
    if (Math.abs(window.scrollY - y) <= 8 || /jsdom/i.test(navigator.userAgent)) return
    window.scrollTo({ top: Math.max(0, y), behavior: reducedMotion() ? 'auto' : 'smooth' })
  })
}

/**
 * "Run this case" and "Run Noa with these readings": bring the running area (the stage feed and the agent orchestra, `#fh-body`)
 * to just under the sticky top nav, once the new journey has rendered, so the viewer sees it start.
 */
export function showRun() {
  followFeed()
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined' || /jsdom/i.test(navigator.userAgent)) return
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const body = document.getElementById('fh-body')
    if (!body) return
    const y = body.getBoundingClientRect().top + window.scrollY - TOP_GAP
    if (Math.abs(window.scrollY - y) > 8) window.scrollTo({ top: Math.max(0, y), behavior: reducedMotion() ? 'auto' : 'smooth' })
  }))
}

/** Next ▸ (button or →): on the go card it starts the check, so the top collapses first, like the go button. */
export function nextStep() {
  const e = getEngine(), p = e.getSnapshot().pending
  if (p?.type === 'go') { collapseTop(); followFeed() }
  e.next()
}
/** Answer the go card from its buttons ("Start…" collapses the top; "Not now"/"Later" leaves it). */
export function answerGo(id: number, value: 'go' | 'later') {
  if (value === 'go') collapseTop()
  followFeed()
  getEngine().answer(id, value)
}

/** Opens an earlier stage's folded history in the feed and brings it into view (the step pills call this). */
export function openPast(stage: StageId) {
  const d = document.getElementById(`fh-past-${stage}`) as HTMLDetailsElement | null
  if (!d) return
  d.open = true
  feedScroll.follow = false
  const box = d.closest('[data-feed]') as HTMLElement | null
  if (box) box.scrollTo({ top: box.scrollTop + d.getBoundingClientRect().top - box.getBoundingClientRect().top, behavior: reducedMotion() ? 'auto' : 'smooth' })
  d.querySelector('summary')?.focus({ preventScroll: true })
}
