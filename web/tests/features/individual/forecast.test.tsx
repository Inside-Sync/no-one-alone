import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { ForecastPage } from '@/features/individual/forecast/ForecastPage'
import { PAGE_REGISTRY } from '@/features/registry'
import { renderWithProviders } from '../../helpers/renderWithProviders'
import i18n from '@/i18n'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/forecast/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const ready = () => screen.findByText('ℹ️ How this forecast works')
const strokeCell = () => screen.getByText('Stroke · 90 d').closest('div')!

test('is registered for individual/forecast', () => {
  expect(PAGE_REGISTRY['individual/forecast']).toBe(ForecastPage)
})

test('sections appear in prototype order with the disclaimer card', async () => {
  renderWithProviders(<ForecastPage />, { who: 'self' })
  await ready()
  expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual([
    'ℹ️ How this forecast works', '📊 Chances over time', '🎛️ Try it: what if…', 'Morning systolic blood pressure',
    '⚖️ What pushes her stroke chance up or down', '👀 What we keep an eye on',
  ])
  expect(screen.getByText('Example figures for a prototype')).toBeInTheDocument()
  expect(screen.getByText('Her doctor, not the app')).toBeInTheDocument()
  expect(document.querySelectorAll('#riskRows tr')).toHaveLength(8)
  expect(document.querySelectorAll('#sigRows tr')).toHaveLength(11)
})

test('baseline shows no change; dragging adherence to 100 shows 1.3% stroke', async () => {
  renderWithProviders(<ForecastPage />, { who: 'self' })
  await ready()
  expect(within(strokeCell()).getByText('2.1%')).toBeInTheDocument()
  expect(within(strokeCell()).getByText('no change')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText(/Tablets taken on time/), { target: { value: '100' } })
  expect(within(strokeCell()).getByText('1.3%')).toBeInTheDocument()
  expect(within(strokeCell()).getByText('−38% relative')).toBeInTheDocument()
  expect(screen.getByText('100%')).toBeInTheDocument()
})

test('salt label, steps format, hearing switch update the outputs', async () => {
  renderWithProviders(<ForecastPage />, { who: 'self' })
  await ready()
  fireEvent.change(screen.getByLabelText(/Steps a day/), { target: { value: '5000' } })
  expect(screen.getByText('5,000')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText(/Salt in food/), { target: { value: '2' } })
  expect(within(screen.getByLabelText(/Salt in food/).closest('label')!).getByText('High')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('switch', { name: 'Wears hearing aids daily' }))
  expect(within(screen.getByText('MCI · 90 d').closest('div')!).getByText('2.5%')).toBeInTheDocument()
})

test('what-if line appears on the chart only when adherence is off 86 and 100', async () => {
  renderWithProviders(<ForecastPage />, { who: 'self' })
  await ready()
  const svg = () => document.querySelector('#bpChart svg')!
  expect(svg().querySelectorAll('path[stroke="#8f6fd0"]')).toHaveLength(0)
  fireEvent.change(screen.getByLabelText(/Tablets taken on time/), { target: { value: '95' } })
  expect(svg().querySelectorAll('path[stroke="#8f6fd0"]')).toHaveLength(1)
})

test('shap bars and fine print', async () => {
  renderWithProviders(<ForecastPage />, { who: 'self' })
  await ready()
  expect(screen.getByText('+0.58')).toBeInTheDocument()
  expect(screen.getByText('−0.07')).toBeInTheDocument()
})

test('R19: hearing mode is on by default and toggles aria-pressed', async () => {
  renderWithProviders(<ForecastPage />, { who: 'self' })
  await ready()
  const hearing = screen.getByRole('button', { name: /Hearing mode/ })
  expect(hearing).toHaveAttribute('aria-pressed', 'true')
  expect(hearing).toHaveTextContent('ON · AUTO-ENABLED 09 OCT')
  fireEvent.click(hearing)
  expect(hearing).toHaveAttribute('aria-pressed', 'false')
  expect(hearing).toHaveTextContent('OFF')
  expect(document.getElementById('toast')!.textContent).toBe('Hearing mode off')
  const vision = screen.getByRole('button', { name: /Vision mode/ })
  expect(vision).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(vision)
  expect(vision).toHaveAttribute('aria-pressed', 'true')
  expect(vision).toHaveTextContent('ON')
  expect(document.getElementById('toast')!.textContent).toBe('Vision mode on')
})

test('forecast cards are not consent-tagged: nothing is locked when sharing is paused', async () => {
  const r = renderWithProviders(<ForecastPage />, { who: 'family', viewer: 'james' })
  await ready()
  act(() => r.app().togglePause())
  await waitFor(() => expect(r.app().paused).toBe(true))
  expect(screen.getByText('📊 Chances over time')).toBeInTheDocument()
  expect(document.querySelectorAll('.locked')).toHaveLength(0)
})

test('in Vietnamese the mode toast names the mode in Vietnamese', async () => {
  await act(() => i18n.changeLanguage('vi'))
  try {
    renderWithProviders(<ForecastPage />, { who: 'self' })
    await screen.findByText('ℹ️ Dự báo này hoạt động thế nào')
    fireEvent.click(screen.getByRole('button', { name: /Chế độ khiếm thính/ }))
    expect(document.getElementById('toast')!.textContent).toBe('Đã tắt chế độ khiếm thính')
  } finally {
    await act(() => i18n.changeLanguage('en'))
  }
})
