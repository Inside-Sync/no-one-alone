import { render } from '@testing-library/react'
import { NoaOrb } from '@/components/noa/NoaOrb'

test('renders the .om orb at the given size and adds talk only when asked', () => {
  const { container, rerender } = render(<NoaOrb size={26} />)
  const orb = container.querySelector('.om') as HTMLElement
  expect(orb.style.getPropertyValue('--s')).toBe('26px')
  expect(orb.classList.contains('talk')).toBe(false)
  rerender(<NoaOrb size={26} talk />)
  expect(container.querySelector('.om')!.classList.contains('talk')).toBe(true)
})
