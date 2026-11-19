import { vi } from 'vitest'
import { barOffset, focusHeading, scrollOverlayTop, scrollSoon, scrollToTarget, watchManualScroll } from '@/features/testcase/ui/app/scrollTo'

function rect(top: number, bottom = top): DOMRect { return { top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) } as DOMRect }

function setup() {
  document.body.innerHTML = '<div id="tcHost"><div class="tc-bar"></div><div id="target"><h3>Title</h3></div></div>'
  const host = document.getElementById('tcHost') as HTMLElement
  const target = document.getElementById('target') as HTMLElement
  host.scrollTop = 100
  host.getBoundingClientRect = () => rect(0, 800)
  ;(host.querySelector('.tc-bar') as HTMLElement).getBoundingClientRect = () => rect(0, 60)
  target.getBoundingClientRect = () => rect(500, 600)
  const scrollTo = vi.fn()
  host.scrollTo = scrollTo as unknown as typeof host.scrollTo
  return { host, target, scrollTo }
}

const mm = (reduced: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduced && /reduce/.test(q), media: q, addEventListener: () => {}, removeEventListener: () => {} }))

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); document.body.innerHTML = '' })

test('scrolls the overlay so the target sits under the sticky bar, smoothly', () => {
  mm(false)
  const { scrollTo } = setup()
  expect(scrollToTarget('target')).toBe(true)
  // 500 (target) - 0 (host) + 100 (scrollTop) - (60 bar + 12 gap)
  expect(scrollTo).toHaveBeenCalledWith({ top: 528, behavior: 'smooth' })
})

test('reduced motion scrolls instantly, and so does an explicit instant', () => {
  mm(true)
  const { scrollTo } = setup()
  scrollToTarget('target')
  expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }))
  mm(false)
  scrollToTarget('target', { behavior: 'instant' })
  expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }))
})

test('a missing target does nothing; without a host it falls back to scrollIntoView', () => {
  mm(false)
  const { target, host, scrollTo } = setup()
  expect(scrollToTarget('nope')).toBe(false)
  expect(scrollTo).not.toHaveBeenCalled()
  host.id = 'other'
  const into = vi.fn()
  target.scrollIntoView = into
  scrollToTarget(target)
  expect(into).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
})

test('scrollOverlayTop goes to 0; barOffset has a floor when there is no bar', () => {
  mm(false)
  const { scrollTo, host } = setup()
  scrollOverlayTop()
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  expect(barOffset(host)).toBe(72)
  host.querySelector('.tc-bar')?.remove()
  expect(barOffset(host)).toBe(12)
})

test('focus moves to the heading without scrolling again, only when asked', () => {
  mm(false)
  const { target } = setup()
  scrollToTarget('target')
  expect(document.activeElement).toBe(document.body)
  scrollToTarget('target', { focus: true })
  const h = target.querySelector('h3') as HTMLElement
  expect(document.activeElement).toBe(h)
  expect(h.getAttribute('tabindex')).toBe('-1')
  focusHeading(null)
})

test('scrollSoon waits a tick and can be cancelled', () => {
  vi.useFakeTimers()
  mm(false)
  const { scrollTo } = setup()
  const cancel = scrollSoon('target')
  expect(scrollTo).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(scrollTo).toHaveBeenCalledTimes(1)
  scrollSoon('target')()
  vi.advanceTimersByTime(10)
  expect(scrollTo).toHaveBeenCalledTimes(1)
  cancel()
})

test('watchManualScroll hears the wheel, touch and scrolling keys, not Enter or a key on a field', () => {
  const { host } = setup()
  host.insertAdjacentHTML('beforeend', '<input id="f" /><button id="b"></button>')
  const on = vi.fn()
  const off = watchManualScroll(on)
  host.dispatchEvent(new Event('wheel'))
  host.dispatchEvent(new Event('touchmove'))
  expect(on).toHaveBeenCalledTimes(2)
  host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
  document.getElementById('f')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  document.getElementById('b')!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
  expect(on).toHaveBeenCalledTimes(2)
  host.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }))
  expect(on).toHaveBeenCalledTimes(3)
  off()
  host.dispatchEvent(new Event('wheel'))
  expect(on).toHaveBeenCalledTimes(3)
})
