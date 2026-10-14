import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { PhoneScreen } from '@/components/phone/PhoneScreen'

test('structure: dark hearing-mode screen, question, optional parts', () => {
  const { container } = render(<PhoneScreen time="02:04" q="Can you hear me?" small="Phone rings" flash listen help="David · 6 min away" yn onAnswer={() => {}} />)
  expect(container.querySelector('.device .dev-screen.dark')).not.toBeNull()
  expect(screen.getByText('02:04 · Hearing mode')).toBeInTheDocument()
  expect(screen.getByText('Can you hear me?')).toBeInTheDocument()
  expect(screen.getByText('Phone rings')).toBeInTheDocument()
  expect(container.querySelector('.dev-flash.on')).not.toBeNull()
  expect(container.querySelectorAll('.listen i')).toHaveLength(5)
  expect(screen.getByText('David · 6 min away')).toBeInTheDocument()
  const yes = screen.getByRole('button', { name: 'Yes' })
  expect(yes.tagName).toBe('BUTTON')
  expect(screen.getByRole('button', { name: 'No' }).tagName).toBe('BUTTON')
})

test('omits flash, listen, help and buttons when the step has none', () => {
  const { container } = render(<PhoneScreen time="02:04" q="Sit still, love." onAnswer={() => {}} />)
  expect(container.querySelector('.dev-flash.on')).toBeNull()
  expect(container.querySelector('.listen')).toBeNull()
  expect(container.querySelector('.dev-help')).toBeNull()
  expect(screen.queryByRole('button')).toBeNull()
})

test('answers report Yes / No', () => {
  const onAnswer = vi.fn()
  render(<PhoneScreen time="02:04" q="?" yn onAnswer={onAnswer} />)
  fireEvent.click(screen.getByRole('button', { name: 'No' }))
  expect(onAnswer).toHaveBeenCalledWith('No')
})
