import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import i18n from '@/i18n'
import { App } from '@/app/App'
import { PAGE_REGISTRY } from '@/features/registry'
import { FamilyHealthPage, FamilyMessages, getEngine, resetFamilyHealthStore } from '@/features/familyHealth/ui'

// The whole app renders in each test: generous timeouts so a loaded machine (full suite in parallel) does not flake.
configure({ asyncUtilTimeout: 8000 })
vi.setConfig({ testTimeout: 30_000 })

/** The "Noa · family health" panel (stream C): what the prototype shows, driven through the real engine (no waits in tests). */
const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
const panel = () => document.getElementById('fh-panel') as HTMLElement
const next = () => within(panel()).getByRole('button', { name: /^Next/ })
const idle = () => act(() => getEngine().whenIdle())

beforeEach(async () => {
  sessionStorage.clear()
  localStorage.clear()
  resetFamilyHealthStore()
  document.body.className = ''
  await i18n.changeLanguage('en')
})
afterEach(async () => { await act(() => i18n.changeLanguage('en')) })
const now = () => document.getElementById('fh-now') as HTMLElement

test('the Family health tab is the panel', () => {
  expect(PAGE_REGISTRY['individual/lineage']).toBe(FamilyHealthPage)
})

test('header, tree, stepper and orchestra render; Saeed (s0) auto-runs once after 300 ms', async () => {
  at('/individual/lineage')
  expect(await screen.findByRole('heading', { name: 'Noa · family health' })).toBeInTheDocument()
  expect(screen.getByText('Prepared text (no live AI here)')).toBeInTheDocument()
  const tree = screen.getByRole('group', { name: 'Family tree' })
  expect(within(tree).getAllByRole('button')).toHaveLength(6)
  expect(within(tree).getByRole('button', { name: 'Open Saeed’s record' })).toHaveTextContent('Saeed, 64')
  expect(within(tree).getByRole('button', { name: 'Open Hind’s record' })).toHaveTextContent('Hind, 18 mo')
  expect(screen.getByRole('list', { name: 'Journey' }).querySelectorAll('li')).toHaveLength(5)
  expect(screen.getByText('Agent orchestra')).toBeInTheDocument()
  // Before the auto-run: the welcome screen.
  expect(screen.getByText('Prevention and screening for one family')).toBeInTheDocument()
  await waitFor(() => expect(getEngine().getSnapshot().journey?.testCase).toBe('s0'), { timeout: 8000 })
  await idle()
  expect(within(tree).getByRole('button', { name: 'Open Saeed’s record' })).toHaveAttribute('aria-pressed', 'true')
  expect(await within(now()).findByText('Triggered check')).toBeInTheDocument()
  expect(next()).toBeEnabled()
  expect(document.querySelectorAll('[class*="baton"]:not([hidden])')).toHaveLength(0)
})

test('Next and the → key step through Saeed’s journey to the referral', async () => {
  at('/individual/lineage')
  await waitFor(() => expect(getEngine().getSnapshot().pending).not.toBeNull(), { timeout: 8000 })
  fireEvent.click(next())
  await idle()
  expect(await within(now()).findByText('Today · second try')).toBeInTheDocument()
  fireEvent.keyDown(document.body, { key: 'ArrowRight' })
  await idle()
  for (let i = 0; i < 20 && !getEngine().getSnapshot().journey?.done; i++) { fireEvent.click(next()); await idle() }
  const s = getEngine().getSnapshot()
  expect(s.journey?.stage).toBe('referral')
  expect(await screen.findByRole('button', { name: 'Choose someone else' })).toBeInTheDocument()
  expect(within(now()).getByText(/Referred to the right pathway/)).toBeInTheDocument()
  expect(next()).toBeDisabled()
})

test('→ does nothing while typing in the composer', async () => {
  at('/individual/lineage')
  await waitFor(() => expect(getEngine().getSnapshot().pending).not.toBeNull(), { timeout: 8000 })
  const before = getEngine().getSnapshot().pending?.id
  const input = screen.getByRole('textbox', { name: 'Message to Noa' })
  expect(input).toHaveAttribute('placeholder', 'Type what Saeed says…')
  fireEvent.keyDown(input, { key: 'ArrowRight' })
  expect(getEngine().getSnapshot().pending?.id).toBe(before)
})

test('tapping a person opens their record and starts their journey; Esc closes it; edit and re-run', async () => {
  at('/individual/lineage')
  await waitFor(() => expect(getEngine().getSnapshot().journey).not.toBeNull(), { timeout: 8000 })
  await idle()
  fireEvent.click(screen.getByRole('button', { name: 'Open Khalid’s record' }))
  await idle()
  const drawer = document.getElementById('fh-drawer') as HTMLElement
  expect(drawer).toHaveAttribute('aria-hidden', 'false')
  expect(within(drawer).getByText('Khalid Al Mansoori')).toBeInTheDocument()
  expect(within(drawer).getByRole('button', { name: /Back to Khalid’s screening/ })).toBeInTheDocument()
  expect(getEngine().getSnapshot().journey?.person).toBe('khalid')
  // Try different data: out of range is refused, in range is used by the re-run.
  const hr = within(drawer).getByRole('spinbutton', { name: /Resting heart/ })
  fireEvent.change(hr, { target: { value: '500' } })
  expect(hr).toHaveAttribute('aria-invalid', 'true')
  fireEvent.change(hr, { target: { value: '130' } })
  expect(hr).not.toHaveAttribute('aria-invalid')
  fireEvent.click(within(drawer).getByRole('button', { name: /Re-run Noa for Khalid/ }))
  await idle()
  expect(drawer).toHaveAttribute('aria-hidden', 'true')
  expect(getEngine().getSnapshot().journey?.urgent).toBe('G1')
  fireEvent.click(screen.getByRole('button', { name: 'Open Khalid’s record' }))
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(drawer).toHaveAttribute('aria-hidden', 'true')
})

test('Reset shows the welcome; Khalid’s protect card confirms with the chosen data', async () => {
  at('/individual/lineage')
  await waitFor(() => expect(getEngine().getSnapshot().journey).not.toBeNull(), { timeout: 8000 })
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  expect(await screen.findByText('Prevention and screening for one family')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Khalid, 38/ }))
  await idle()
  expect(await within(now()).findByText('What may Noa use, and who may see the pathway?')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: /Genomic result/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  await idle()
  expect(getEngine().getSnapshot().journey?.genomic).toBe(false)
  expect(getEngine().getSnapshot().journey?.stage).toBe('home')
})

test('an emergency turns the app to night and Reset brings it back', async () => {
  at('/individual/lineage')
  await waitFor(() => expect(getEngine().getSnapshot().journey).not.toBeNull(), { timeout: 8000 })
  act(() => { void getEngine().runTestCase('s2') })
  await idle()
  fireEvent.click(screen.getByRole('button', { name: 'Use clearly slurred' }))
  await idle()
  expect(await screen.findByRole('alert')).toHaveTextContent('Saeed should see a doctor now')
  expect(document.body).toHaveClass('night')
  expect(within(now()).getByText('Fixed script')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  await waitFor(() => expect(document.body).not.toHaveClass('night'))
})

test('in Arabic the chrome is translated and Noa speaks switch only changes the agent language', async () => {
  await act(() => i18n.changeLanguage('ar'))
  at('/individual/lineage')
  expect(await screen.findByText('نوا · صحة العائلة')).toBeInTheDocument()
  expect(document.documentElement.dir).toBe('rtl')
  const seg = screen.getByRole('group', { name: 'نوا تتحدث' })
  fireEvent.click(within(seg).getByRole('button', { name: 'العربية' }))
  expect(getEngine().getSnapshot().lang).toBe('ar')
  await waitFor(() => expect(within(seg).getByRole('button', { name: 'العربية' })).toHaveAttribute('aria-pressed', 'true'))
})

test('the messages button: unread badge, the panel marks them read, Ask Noa answers', async () => {
  render(<FamilyMessages />)
  const fab = screen.getByRole('button', { name: 'Noa messages, 3 new' })
  fireEvent.click(fab)
  const chat = document.getElementById('fh-chat') as HTMLElement
  expect(chat).toHaveAttribute('aria-hidden', 'false')
  expect(within(chat).getByText(/Stroke clinic on Mon 30 Nov/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Noa messages' })).toHaveAttribute('aria-expanded', 'true')
  const ask = within(chat).getByRole('textbox', { name: 'Ask Noa' })
  fireEvent.change(ask, { target: { value: 'Is anyone slurring?' } })
  fireEvent.keyDown(ask, { key: 'Enter' })
  expect(await within(chat).findByText(/should see a doctor immediately at the emergency department/)).toBeInTheDocument()
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(chat).toHaveAttribute('aria-hidden', 'true')
})

test('the messages button shows on Individual tabs only', async () => {
  at('/individual/me')
  expect(await screen.findByRole('button', { name: /^Noa messages/ })).toBeInTheDocument()
})
