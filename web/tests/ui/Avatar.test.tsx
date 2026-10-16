import { render } from '@testing-library/react'
import { Avatar } from '@/components/ui/Avatar'

test('a known name shows the photo, not the initials', () => {
  const { container } = render(<Avatar name="David">D</Avatar>)
  expect(container.querySelector('span.av img')?.getAttribute('src')).toBe('/avatars/david.jpg')
  expect(container.textContent).toBe('')
})

test('an unknown name keeps the initials', () => {
  const { container } = render(<Avatar name="Ông Hùng">ÔH</Avatar>)
  expect(container.querySelector('img')).toBeNull()
  expect(container.textContent).toBe('ÔH')
})
