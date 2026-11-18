import { isSuppressed, leadingCount, MIN_CELL, suppressCount, suppressRate, suppressSplit } from '@/domain/suppression'

test('the threshold is 10: 9 is hidden, 10 is shown', () => {
  expect(MIN_CELL).toBe(10)
  expect(isSuppressed(9)).toBe(true)
  expect(isSuppressed(10)).toBe(false)
  expect(suppressCount(9)).toBeNull()
  expect(suppressCount(0)).toBeNull()
  expect(suppressCount(10)).toBe(10)
})

test('a rate is hidden when its denominator is under 10', () => {
  expect(suppressRate(80, 9)).toBeNull()
  expect(suppressRate(80, 10)).toBe(80)
})

test('complementary suppression hides the next smallest cell when exactly one is hidden', () => {
  expect(suppressSplit([60, 9])).toEqual([null, null])
  expect(suppressSplit([30, 9, 22])).toEqual([30, null, null])
  expect(suppressSplit([23, 27, 9])).toEqual([null, 27, null])
})

test('no extra suppression when nothing, or several cells, are hidden already', () => {
  expect(suppressSplit([30, 12])).toEqual([30, 12])
  expect(suppressSplit([4, 6, 40])).toEqual([null, null, 40])
  expect(suppressSplit([9])).toEqual([null])
})

test('leadingCount reads the number a text starts with', () => {
  expect(leadingCount('41 people')).toBe(41)
  expect(leadingCount('1,210 on diabetes medicines')).toBe(1210)
  expect(leadingCount('Ongoing')).toBeNull()
})
