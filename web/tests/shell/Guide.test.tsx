import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { Guide } from '@/components/shell/Guide'
import { ShellOverridesProvider, useTipKey } from '@/components/shell/ShellOverrides'
import { allRoutes } from '@/domain/views'
import i18n from '@/i18n'
import { AppStateProvider, useAppState } from '@/state/AppState'

let mockPath = '/individual/me/'
vi.mock('@/app/navigation', () => ({
  usePathname: () => mockPath,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const AsFamily = () => {
  const { setWho } = useAppState()
  return <button onClick={() => setWho('family')}>family</button>
}
const Picks = ({ k }: { k: string }) => { useTipKey(k); return null }

const ui = (extra?: React.ReactNode) => (
  <AppStateProvider>
    <ShellOverridesProvider>
      <Guide />
      <AsFamily />
      {extra}
    </ShellOverridesProvider>
  </AppStateProvider>
)

beforeEach(() => { mockPath = '/individual/me/'; localStorage.clear(); sessionStorage.clear() })
afterEach(async () => { await act(() => i18n.changeLanguage('en')) })

test('every page has an "On this screen" tip with a Try line, in both languages', () => {
  for (const lng of ['en', 'ar']) {
    for (const { page } of allRoutes()) {
      expect(i18n.exists(`guide:tips.pages.${page}.text`, { lng }), `${lng} ${page} text`).toBe(true)
      expect(i18n.exists(`guide:tips.pages.${page}.try`, { lng }), `${lng} ${page} try`).toBe(true)
    }
  }
})

test('shows the tip of the page with its Try line', async () => {
  render(ui())
  expect(await screen.findByText('On this screen')).toBeInTheDocument()
  expect(screen.getByText(/Moza's own home screen, 11 days after her stroke/)).toBeInTheDocument()
  expect(screen.getByText('Answer one of the idea cards.')).toBeInTheDocument()
})

test('Hide tips is remembered under noa-tips and leaves a Show tips chip; Show brings them back', async () => {
  render(ui())
  await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'Hide tips' })) })
  expect(localStorage.getItem('noa-tips')).toBe('off')
  expect(screen.queryByText('On this screen')).toBeNull()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Show tips' })) })
  expect(localStorage.getItem('noa-tips')).toBe('on')
  expect(screen.getByText('On this screen')).toBeInTheDocument()
})

test('a hidden choice from an earlier visit starts hidden', () => {
  localStorage.setItem('noa-tips', 'off')
  render(ui())
  expect(screen.queryByText('On this screen')).toBeNull()
  expect(screen.getByRole('button', { name: 'Show tips' })).toBeInTheDocument()
})

test('the family role has its own tip on Health', async () => {
  mockPath = '/individual/health/'
  render(ui())
  expect(await screen.findByText(/Readings from her watch/)).toBeInTheDocument()
  await act(async () => { fireEvent.click(screen.getByText('family')) })
  expect(await screen.findByText(/What Khalid sees: only the health data Moza chose to share/)).toBeInTheDocument()
})

test('a page can pick another tip (a step of the patient record)', async () => {
  mockPath = '/hospital/patients/'
  render(ui(<Picks k="chart.fu" />))
  expect(await screen.findByText(/How the patient is doing at home/)).toBeInTheDocument()
  expect(screen.getByText('Tick a follow-up task or write a note.')).toBeInTheDocument()
})

test('the tip is translated', async () => {
  render(ui())
  await act(async () => { await i18n.changeLanguage('ar') })
  expect(await screen.findByText('في هذه الشاشة')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'إخفاء الإرشادات' })).toBeInTheDocument()
})
