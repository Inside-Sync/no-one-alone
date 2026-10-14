import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { ToastProvider, useToast } from '@/components/ui/Toast'

function Btn() {
  const toast = useToast()
  return <button onClick={() => toast('Shared')}>Share</button>
}

test('toast announces politely and auto-hides after 2400ms', () => {
  vi.useFakeTimers()
  try {
    render(<ToastProvider><Btn /></ToastProvider>)
    fireEvent.click(screen.getByText('Share'))
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Shared')
    expect(status).toHaveClass('on')
    act(() => { vi.advanceTimersByTime(2399) })
    expect(screen.getByRole('status')).toHaveTextContent('Shared')
    act(() => { vi.advanceTimersByTime(1) })
    // prototype keeps the text so the 0.2s fade is not an empty box
    expect(screen.getByRole('status')).toHaveTextContent('Shared')
    expect(screen.getByRole('status')).not.toHaveClass('on')
  } finally {
    vi.useRealTimers()
  }
})

test('a second toast restarts the timer', () => {
  vi.useFakeTimers()
  try {
    function Two() {
      const toast = useToast()
      return <><button onClick={() => toast('A')}>a</button><button onClick={() => toast('B')}>b</button></>
    }
    render(<ToastProvider><Two /></ToastProvider>)
    fireEvent.click(screen.getByText('a'))
    act(() => { vi.advanceTimersByTime(2000) })
    fireEvent.click(screen.getByText('b'))
    act(() => { vi.advanceTimersByTime(2000) })
    expect(screen.getByRole('status')).toHaveTextContent('B')
  } finally {
    vi.useRealTimers()
  }
})
