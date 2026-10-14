import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { Drawer, DrawerProvider, useDrawer } from '@/components/ui/Drawer'
import { Switch } from '@/components/ui/Switch'
import { Slider } from '@/components/ui/Slider'
import { Pill } from '@/components/ui/Pill'
import { CardHeader } from '@/components/ui/CardHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { Kpi } from '@/components/ui/Kpi'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Drawer open={open} title="Details" onClose={() => setOpen(false)}>
        <button>Inside</button>
      </Drawer>
    </>
  )
}

test('drawer is a modal dialog, Esc closes and focus returns', async () => {
  render(<Harness />)
  const opener = screen.getByRole('button', { name: 'Open' })
  opener.focus()
  fireEvent.click(opener)
  const dialog = screen.getByRole('dialog')
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(dialog.getAttribute('aria-labelledby')).toBe(screen.getByRole('heading', { name: 'Details' }).id)
  fireEvent.keyDown(dialog, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull() // aria-hidden when closed
  const aside = document.getElementById('drawer')!
  expect(aside).toBeInTheDocument()
  expect(aside).not.toHaveClass('on')
  expect(document.getElementById('scrim')).not.toHaveClass('on')
  expect(document.activeElement).toBe(opener)
})

test('Esc closes the drawer even when focus is on body', () => {
  render(<Harness />)
  fireEvent.click(screen.getByText('Open'))
  expect(document.getElementById('drawer')).toHaveClass('on')
  ;(document.activeElement as HTMLElement | null)?.blur()
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(document.getElementById('drawer')).not.toHaveClass('on')
})

test('close button moves focus in, scrim click closes, Tab is trapped', async () => {
  vi.useFakeTimers()
  try {
    render(<Harness />)
    fireEvent.click(screen.getByText('Open'))
    act(() => { vi.advanceTimersByTime(100) })
    const close = screen.getByRole('button', { name: 'Close' })
    expect(document.activeElement).toBe(close)
    const inside = screen.getByText('Inside')
    inside.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(inside)
    fireEvent.click(document.getElementById('scrim')!)
    expect(document.getElementById('drawer')).not.toHaveClass('on')
  } finally {
    vi.useRealTimers()
  }
})

test('useDrawer host opens content and closes', () => {
  function Opener() {
    const d = useDrawer()
    return <button onClick={() => d.open('Clinic', <p>Body text</p>)}>Go</button>
  }
  render(<DrawerProvider><Opener /></DrawerProvider>)
  fireEvent.click(screen.getByText('Go'))
  expect(screen.getByRole('heading', { name: 'Clinic' })).toBeInTheDocument()
  expect(screen.getByText('Body text')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(document.getElementById('drawer')).not.toHaveClass('on')
  // last title/body kept until next open, so the slide-out shows content
  expect(screen.getByText('Body text', { ignore: 'x' })).toBeInTheDocument()
})

test('useDrawer throws outside a provider', () => {
  const err = vi.spyOn(console, 'error').mockImplementation(() => {})
  function Bad() { useDrawer(); return null }
  expect(() => render(<Bad />)).toThrow(/DrawerProvider/)
  err.mockRestore()
})

test('switch toggles aria-checked via onChange', () => {
  const fn = vi.fn()
  render(<Switch checked={false} onChange={fn} label="Hearing" />)
  const sw = screen.getByRole('switch', { name: 'Hearing' })
  expect(sw).toHaveAttribute('aria-checked', 'false')
  fireEvent.click(sw)
  expect(fn).toHaveBeenCalledWith(true)
})

test('slider shows its value text and reports numbers', () => {
  const fn = vi.fn()
  render(<Slider min={60} max={100} value={86} onChange={fn} label="Tablets" valueText="86%" />)
  expect(screen.getByText('86%')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText(/Tablets/), { target: { value: '90' } })
  expect(fn).toHaveBeenCalledWith(90)
})

test('card, header, pill and kpi use prototype class names', () => {
  const { container } = render(
    <GlassCard span={4}>
      <CardHeader icon="heart" title="Heart" meta="today" pill={{ tone: 'warn', text: 'Watch' }} />
      <Kpi label="Heart rate" value="68" unit="bpm" sub="usual 63" delta="A bit higher" tone="warn" />
      <Pill tone="good">OK</Pill>
    </GlassCard>,
  )
  expect(container.querySelector('article.glass.card.c4')).not.toBeNull()
  expect(container.querySelector('.ch .li .ic svg')).not.toBeNull()
  expect(container.querySelector('.ch h2')?.textContent).toBe('Heart')
  expect(container.querySelector('.ch .meta')?.textContent).toBe('today')
  expect(container.querySelector('.ch .pill.warn')?.textContent).toBe('Watch')
  expect(container.querySelector('.glass.kpi .v small')?.textContent).toBe('bpm')
  expect(container.querySelector('.pill.good')).not.toBeNull()
})
