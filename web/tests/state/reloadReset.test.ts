import { resetsOnLoad } from '@/state/reloadReset'

test('a reload of the live page resets the demo', () => {
  expect(resetsOnLoad('reload', '/individual/live')).toBe(true)
  expect(resetsOnLoad('reload', '/individual/live/')).toBe(true)
})

test('a first visit, back-forward or a reload of another page does not reset', () => {
  expect(resetsOnLoad('navigate', '/individual/live')).toBe(false)
  expect(resetsOnLoad('back_forward', '/individual/live')).toBe(false)
  expect(resetsOnLoad('reload', '/hospital/ed')).toBe(false)
  expect(resetsOnLoad(undefined, '/individual/live')).toBe(false)
})
