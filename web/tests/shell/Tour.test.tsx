import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { TourBar } from '@/components/shell/TourBar'
import { TOUR_STEPS } from '@/domain/tour'
import i18n from '@/i18n'
import { AppStateProvider, useAppState } from '@/state/AppState'
import { TourProvider, useTour } from '@/state/Tour'

const push = vi.fn()
vi.mock('@/app/navigation', () => ({
  usePathname: () => '/individual/me/',
  useRouter: () => ({ push, replace: vi.fn() }),
}))

const Probe = () => {
  const { start } = useTour()
  const { who } = useAppState()
  return <><button onClick={start}>open</button><output data-testid="who">{who}</output></>
}

const ui = () => (
  <AppStateProvider>
    <TourProvider>
      <Probe />
      <TourBar />
    </TourProvider>
  </AppStateProvider>
)

beforeEach(() => { push.mockClear(); sessionStorage.clear(); localStorage.clear() })
afterEach(async () => { await act(() => i18n.changeLanguage('en')) })

const next = () => act(async () => { fireEvent.click(screen.getByRole('button', { name: /^(Next|Finish)$/ })) })
const region = { name: "Moza's case walkthrough" }

test('there are 21 steps of text in English and in Arabic', () => {
  for (const lng of ['en', 'ar']) {
    const bundle = i18n.getResourceBundle(lng, 'guide') as { tour: { steps: { title: string; text: string; try: string }[] } }
    expect(bundle.tour.steps).toHaveLength(TOUR_STEPS.length)
    for (const s of bundle.tour.steps) expect([s.title, s.text, s.try].every(Boolean)).toBe(true)
  }
})

test("the bar is closed until Moza's case starts, then shows step 1 with Back disabled", async () => {
  render(ui())
  expect(screen.queryByRole('region', region)).toBeNull()
  await act(async () => { fireEvent.click(screen.getByText('open')) })
  expect(screen.getByRole('region', region)).toBeInTheDocument()
  expect(screen.getByText('1 / 21')).toBeInTheDocument()
  expect(screen.getByText('Meet Moza')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  expect(push).toHaveBeenLastCalledWith('/individual/me')
})

test('Next and Back walk through the views and switch role where a step says so', async () => {
  render(ui())
  await act(async () => { fireEvent.click(screen.getByText('open')) })
  for (let i = 0; i < 6; i++) await next()
  expect(screen.getByText('7 / 21')).toBeInTheDocument()
  expect(screen.getByText('What her family sees')).toBeInTheDocument()
  expect(screen.getByTestId('who')).toHaveTextContent('family')
  expect(push).toHaveBeenLastCalledWith('/individual/health')
  await next()
  expect(push).toHaveBeenLastCalledWith('/individual/live')
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  await next()
  expect(push).toHaveBeenLastCalledWith('/hospital/ed')
  expect(screen.queryByRole('button', { name: 'Play' })).toBeNull()
  await next()
  await next()
  expect(push).toHaveBeenLastCalledWith('/hospital/patients?patient=moza&step=sum')
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Back' })) })
  expect(push).toHaveBeenLastCalledWith('/hospital/patients')
})

test('the last step says Finish and closes the bar; Close closes it at any step', async () => {
  render(ui())
  await act(async () => { fireEvent.click(screen.getByText('open')) })
  for (let i = 0; i < 20; i++) await next()
  expect(screen.getByText('21 / 21')).toBeInTheDocument()
  expect(push).toHaveBeenLastCalledWith('/government/signals')
  await next()
  expect(screen.queryByRole('region', region)).toBeNull()
  await act(async () => { fireEvent.click(screen.getByText('open')) })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Close' })) })
  expect(screen.queryByRole('region', region)).toBeNull()
})

test('the text is Arabic when the language is Arabic', async () => {
  render(ui())
  await act(async () => { await i18n.changeLanguage('ar') })
  await act(async () => { fireEvent.click(screen.getByText('open')) })
  expect(screen.getByRole('region', { name: i18n.t('guide:tour.label') })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: i18n.t('guide:tour.next') })).toBeInTheDocument()
})
