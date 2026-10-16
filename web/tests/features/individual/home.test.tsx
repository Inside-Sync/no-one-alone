import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { HomePage } from '@/features/individual/home/HomePage'
import { PAGE_REGISTRY } from '@/features/registry'
import HOME_COPY from '@/locales/en/home.json'
import { mockCanvas, mockLayout, mockRaf } from '../../canvas/fakeCtx'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/home/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

beforeEach(() => {
  mockCanvas()
  mockLayout()
  mockRaf()
})

const ready = () => screen.findByText('🤖 What the helper did today')
const toastText = () => document.getElementById('toast')!.textContent

test('is registered for individual/home', () => {
  expect(PAGE_REGISTRY['individual/home']).toBe(HomePage)
})

test('home shows headline facts', async () => {
  renderWithProviders(<HomePage />, { who: 'self' })
  await ready()
  expect(screen.getByText('Margaret Collins')).toBeInTheDocument()
  expect(screen.getByText('72', { selector: 'text' })).toBeInTheDocument()
  expect(screen.getByText('demo rule, not a probability')).toBeInTheDocument()
  expect(document.querySelector('main')!.textContent).not.toMatch(/\d(\.\d)?% *(risk|chance)|2\.1%|1\.3%/)
  expect(screen.getByText(/Allergy: penicillin/)).toBeInTheDocument()
  expect(screen.getByText('64% · on wrist')).toBeInTheDocument()
  expect(screen.getByText(/72 out of 100, down 5 since last week/)).toBeInTheDocument()
})

test('shows every section heading in prototype order', async () => {
  renderWithProviders(<HomePage />, { who: 'self' })
  await ready()
  const heads = Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)
  expect(heads).toEqual([
    '🟢 Margaret today', 'Today so far', '👤 About Margaret', '🩺 Health conditions', '🧭 Overall wellbeing',
    '🕰️ Daily rhythm', '🔮 Coming up: one thing to act on', "This week's plan", '💞 Her care circle',
    "🗣️ Today's chat with her", '🏠 Her home today', '🤝 People and places near her', '🤖 What the helper did today',
  ])
})

test('approving a plan task updates its status', async () => {
  renderWithProviders(<HomePage />, { who: 'self' })
  await ready()
  const row = screen.getByText('Sat 10:00 · weekly pill box set-up').closest('li')!
  expect(within(row).getByText('Needs approval')).toBeInTheDocument()
  fireEvent.click(within(row).getByRole('button', { name: 'Approve' }))
  expect(within(row).getByText('Approved')).toBeInTheDocument()
  expect(within(row).queryByText('Needs approval')).toBeNull()
  expect(toastText()).toBe(HOME_COPY.plan.approve.toast)
})

test('approving in the helper log turns the button into a done state', async () => {
  renderWithProviders(<HomePage />, { who: 'self' })
  await ready()
  const row = screen.getByText('Suggested David sets up a weekly pill box').closest('tr')!
  fireEvent.click(within(row).getByRole('button', { name: 'Approve' }))
  const done = within(row).getByRole('button', { name: '✓ Approved' })
  expect(done).toBeDisabled()
})

test('heart-category card is absent for sarah when heart sharing is off', async () => {
  const r = renderWithProviders(<HomePage />, { who: 'family', viewer: 'sarah' })
  await ready()
  expect(screen.getByText('Blood pressure')).toBeInTheDocument()
  act(() => r.app().toggleShare('sarah', 'heart'))
  await waitFor(() => expect(screen.queryByText('Blood pressure')).toBeNull())
  // Like the prototype, each of the four heart-category KPI tiles is locked on its own.
  expect(screen.getAllByText('Margaret keeps her heart, blood pressure, body private')).toHaveLength(4)
  expect(document.body.innerHTML).not.toMatch(/Higher than usual|146\/88/)
})

test.each([
  ['Call Mum', 'Calling Margaret · captions on'],
  ['📤 Share profile', 'Profile shared with the care circle'],
  ['Ask David to set up a pill box', "Sent to David · he'll set up the pill box on Saturday"],
  ['Send BP report to Dr Patel', 'Blood pressure report sent to Dr Patel'],
])('button %s shows its exact toast', async (label, text) => {
  renderWithProviders(<HomePage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: label }))
  expect(toastText()).toBe(text)
})

test('Ask how she is opens the chat drawer and answers questions', async () => {
  renderWithProviders(<HomePage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: 'Ask how she is' }))
  const drawer = document.getElementById('drawer')!
  expect(drawer).toHaveClass('on')
  expect(within(drawer).getByRole('heading', { name: 'Ask the agent' })).toBeInTheDocument()
  expect(within(drawer).getByText(/Mum is steady today/)).toBeInTheDocument()
  fireEvent.click(within(drawer).getByRole('button', { name: 'Why is stroke risk high?' }))
  expect(within(drawer).getByText(/Four drivers: morning blood pressure/)).toBeInTheDocument()
  expect(within(drawer).queryByRole('button', { name: 'Why is stroke risk high?' })).toBeNull()
})

test('a condition opens its detail drawer', async () => {
  renderWithProviders(<HomePage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: /High blood pressure/ }))
  const drawer = document.getElementById('drawer')!
  expect(within(drawer).getByRole('heading', { name: '🩺 High blood pressure' })).toBeInTheDocument()
  expect(within(drawer).getByText('Since age 61 (2009)')).toBeInTheDocument()
  fireEvent.click(within(drawer).getByRole('button', { name: '🩺 Raise with Dr Patel' }))
  expect(toastText()).toBe('Added to the GP visit agenda')
})

test('sarah (no records access) never gets the conditions list in the DOM', async () => {
  renderWithProviders(<HomePage />, { who: 'family', viewer: 'sarah' })
  await ready()
  expect(screen.queryByRole('button', { name: /High blood pressure/ })).toBeNull()
  expect(document.body.innerHTML).not.toMatch(/Not well controlled lately|Osteopenia/)
  expect(screen.getByText('Margaret keeps her health records private')).toBeInTheDocument()
})

test('pausing sharing locks every category tile but keeps the unlocked cards', async () => {
  const r = renderWithProviders(<HomePage />, { who: 'family', viewer: 'james' })
  await ready()
  expect(screen.getByText('Blood pressure')).toBeInTheDocument()
  act(() => r.app().togglePause())
  await waitFor(() => expect(screen.queryByText('Blood pressure')).toBeNull())
  expect(screen.queryByText('Speaking pace')).toBeNull()
  expect(screen.getByText('🔮 Coming up: one thing to act on')).toBeInTheDocument()
})

test('a KPI tile opens its explanation drawer', async () => {
  renderWithProviders(<HomePage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByText('Blood pressure'))
  const drawer = document.getElementById('drawer')!
  expect(within(drawer).getByRole('heading', { name: '🩺Blood pressure' })).toBeInTheDocument()
  expect(within(drawer).getByText('usual 132/82')).toBeInTheDocument()
  expect(within(drawer).getByText(/The top number has crept up/)).toBeInTheDocument()
})

const TODAY_STRINGS = ['Doing well', '64% · on wrist', '🍽️ Lunch chat · cheerful', 'Last chat 13:02 · cheerful']

test('viewer without check-in access gets no Margaret-today data in the DOM', async () => {
  const r = renderWithProviders(<HomePage />, { who: 'family', viewer: 'sarah' })
  await ready()
  expect(screen.getByText('Doing well')).toBeInTheDocument() // sarah sees check-ins by default
  act(() => r.app().toggleShare('sarah', 'checkin'))
  await waitFor(() => expect(screen.queryByText('Doing well')).toBeNull())
  for (const t of TODAY_STRINGS) expect(document.body.innerHTML).not.toContain(t)
  expect(screen.queryByRole('button', { name: 'Call Mum' })).toBeNull()
})

test('pausing sharing removes Margaret-today data for a family viewer', async () => {
  const r = renderWithProviders(<HomePage />, { who: 'family', viewer: 'james' })
  await ready()
  act(() => r.app().togglePause())
  await waitFor(() => expect(screen.queryByText('Doing well')).toBeNull())
  for (const t of TODAY_STRINGS) expect(document.body.innerHTML).not.toContain(t)
})
