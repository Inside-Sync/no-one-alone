import { render } from '@testing-library/react'
import { Icon } from '@/components/ui/Icon'

test('heart renders the prototype svg', () => {
  const { container } = render(<Icon name="heart" />)
  const svg = container.querySelector('svg[viewBox="0 0 24 24"]')
  expect(svg).not.toBeNull()
  expect(svg).toHaveAttribute('stroke-width', '1.8')
  expect(svg).toHaveAttribute('stroke', 'currentColor')
  expect(svg?.querySelector('path')?.getAttribute('d')).toBe('M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z')
})
test('extra icons are available', () => {
  const { container } = render(<Icon name="lungs" />)
  expect(container.querySelector('svg path')).not.toBeNull()
})
