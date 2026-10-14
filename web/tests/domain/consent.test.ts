import { CATEGORY_IDS, countSees, sees } from '@/domain/consent'
import { defaultShare } from '@/data/fixtures/share'

test('11 categories in prototype order', () => {
  expect(CATEGORY_IDS).toHaveLength(11)
  expect(CATEGORY_IDS[0]).toBe('safety')
  expect(CATEGORY_IDS[10]).toBe('location')
})
test('safety stays visible when paused', () => expect(sees(defaultShare, true, 'james', 'safety')).toBe(true))
test('safety is visible even if the matrix says off', () => {
  const off = { ...defaultShare, james: { ...defaultShare.james, safety: false } }
  expect(sees(off, false, 'james', 'safety')).toBe(true)
})
test('paused hides heart', () => expect(sees(defaultShare, true, 'james', 'heart')).toBe(false))
test('unpaused follows the matrix', () => {
  expect(sees(defaultShare, false, 'james', 'heart')).toBe(true)
  expect(sees(defaultShare, false, 'james', 'mood')).toBe(false)
})
test('countSees', () => {
  expect(countSees(defaultShare, false, 'james')).toBe(8)
  expect(countSees(defaultShare, false, 'hosp')).toBe(2)
  expect(countSees(defaultShare, true, 'james')).toBe(1)
})

import { CATEGORIES } from '@/domain/consent'
test('CATEGORIES verbatim, in CATEGORY_IDS order', () => {
  expect(CATEGORIES.map((c) => c.id)).toEqual([...CATEGORY_IDS])
  expect(CATEGORIES[6]).toEqual({ id: 'meds', emoji: '💊', name: 'Tablets', detail: 'Taken or missed' })
  expect(CATEGORIES[1].name).toBe('"I\'m OK" check-ins')
  expect(CATEGORIES[10].detail).toBe('Never an address or a map')
})
