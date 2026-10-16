import { avatarSrc } from '@/data/avatars'

test('maps known names to their photo, case-insensitive', () => {
  expect(avatarSrc('David Collins')).toBe('/avatars/david.jpg')
  expect(avatarSrc('margaret')).toBe('/avatars/margaret.jpg')
  expect(avatarSrc('Dr. Aisha Patel')).toBe('/avatars/dr-patel.jpg')
  expect(avatarSrc('Priya Nair')).toBe('/avatars/priya.jpg')
})

test('unknown or missing names have no photo', () => {
  expect(avatarSrc('Ông Hùng')).toBeUndefined()
  expect(avatarSrc(null)).toBeUndefined()
})
