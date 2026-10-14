import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { ContextBar } from '@/components/shell/ContextBar'
import { resetMockSource } from '@/data/sources/mock'
import { CATEGORIES } from '@/domain/consent'
import { HomePage } from '@/features/individual/home/HomePage'
import { PrivacyPage } from '@/features/individual/privacy/PrivacyPage'
import { PAGE_REGISTRY } from '@/features/registry'
import { mockCanvas, mockLayout, mockRaf } from '../../canvas/fakeCtx'
import { renderWithProviders } from '../../helpers/renderWithProviders'

let mockPath = '/individual/privacy/'
const push = vi.fn()
vi.mock('@/app/navigation', () => ({ usePathname: () => mockPath, useRouter: () => ({ push, replace: vi.fn() }) }))

beforeEach(() => {
  resetMockSource()
  mockCanvas()
  mockLayout()
  mockRaf()
  mockPath = '/individual/privacy/'
  push.mockClear()
})

const toastText = () => document.getElementById('toast')!.textContent
// People and consent load separately: wait until James's sleep switch is on (the default).
const ready = () => waitFor(() => expect(screen.getByRole('switch', { name: 'Share Sleep with James' })).toHaveAttribute('aria-checked', 'true'))
const sw = (cat: string, who: string) => screen.getByRole('switch', { name: `Share ${cat} with ${who}` })

test('is registered for individual/privacy', () => {
  expect(PAGE_REGISTRY['individual/privacy']).toBe(PrivacyPage)
})

test('grid is people x categories with the prototype defaults', async () => {
  renderWithProviders(<PrivacyPage />, { who: 'self' })
  await ready()
  expect(screen.getAllByRole('switch')).toHaveLength(6 * CATEGORIES.length)
  expect(sw('Sleep', 'James')).toHaveAttribute('aria-checked', 'true')
  expect(sw('Mood and feelings', 'James')).toHaveAttribute('aria-checked', 'false')
  expect(sw('Home sensors', 'David')).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByText('Dr Patel')).toBeInTheDocument()
  expect(screen.getByText(/Clinicians see named patients only where the patient consented to hospital sharing\./)).toBeInTheDocument()
})

test('toggling a share writes an audit entry', async () => {
  const r = renderWithProviders(<PrivacyPage />, { who: 'self' })
  await ready()
  expect(r.app().audit).toHaveLength(0)
  fireEvent.click(sw('Mood and feelings', 'James'))
  expect(r.app().audit).toHaveLength(1)
  expect(r.app().audit[0]).toMatchObject({ viewer: 'james', category: 'mood', on: true, action: 'share-on' })
  expect(sw('Mood and feelings', 'James')).toHaveAttribute('aria-checked', 'true')
  expect(toastText()).toBe('Now sharing mood and feelings with James')
  // The audit list on the page shows the entry.
  expect(within(screen.getByRole('list', { name: 'Audit log' })).getByText('Now sharing mood and feelings with James')).toBeInTheDocument()
  fireEvent.click(sw('Mood and feelings', 'James'))
  expect(toastText()).toBe('Stopped sharing mood and feelings with James')
  expect(r.app().audit).toHaveLength(2)
})

test('safety row switches are disabled (always on) for emergency contacts', async () => {
  const r = renderWithProviders(<PrivacyPage />, { who: 'self' })
  await ready()
  for (const who of ['James', 'David']) {
    const s = sw('Safety alerts', who)
    expect(s).toBeDisabled()
    expect(s).toHaveAttribute('aria-checked', 'true')
    expect(s).toHaveAttribute('title', 'Always on for emergency contacts')
    fireEvent.click(s)
  }
  expect(r.app().audit).toHaveLength(0)
  expect(sw('Safety alerts', 'Sarah')).not.toBeDisabled()
})

test('pause button toggles, toasts and audits with the prototype wording', async () => {
  const r = renderWithProviders(<PrivacyPage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: '⏸️ Pause sharing until tomorrow' }))
  expect(toastText()).toBe('Sharing paused until 9 am tomorrow · safety alerts still on')
  expect(r.app().audit.at(-1)).toMatchObject({ action: 'pause', detail: 'Sharing paused until 9 am tomorrow · safety alerts still on' })
  fireEvent.click(screen.getByRole('button', { name: '▶️ Resume sharing' }))
  expect(toastText()).toBe('Sharing resumed')
  expect(r.app().audit.at(-1)).toMatchObject({ action: 'resume', detail: 'Sharing resumed' })
})

test('pause shows banner on family home and locks all but safety', async () => {
  mockPath = '/individual/home/'
  const r = renderWithProviders(<><ContextBar /><PrivacyPage /><HomePage /></>, { who: 'family', viewer: 'james' })
  await ready()
  expect(document.getElementById('pauseBanner')).toBeNull()
  expect(screen.getByRole('button', { name: /See what James sees · 8 of 11/ })).toBeInTheDocument()
  await screen.findByText('Blood pressure')
  fireEvent.click(screen.getByRole('button', { name: '⏸️ Pause sharing until tomorrow' }))
  expect(toastText()).toBe('Sharing paused until 9 am tomorrow · safety alerts still on')
  expect(document.getElementById('pauseBanner')).toHaveTextContent('Margaret paused sharing until 9 am tomorrow.')
  await waitFor(() => expect(screen.queryByText('Blood pressure')).toBeNull())
  // Every category is locked except safety: the preview counts say 1 of 11 for everyone.
  expect(screen.getAllByRole('button', { name: /sees · 1 of 11/ })).toHaveLength(4)
  expect(screen.getAllByText('Margaret paused sharing until tomorrow').length).toBeGreaterThan(0)
  expect(screen.queryByText(/keeps her .* private/)).toBeNull()
  // The page itself still shows the grid, but with sharing paused no one is told anything new.
  expect(r.app().paused).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '▶️ Resume sharing' }))
  expect(toastText()).toBe('Sharing resumed')
  expect(document.getElementById('pauseBanner')).toBeNull()
})

test('presets change the family rows in one go and audit once', async () => {
  const r = renderWithProviders(<PrivacyPage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: '🚨 Safety alerts only' }))
  expect(toastText()).toBe('Family now sees safety alerts only')
  expect(sw('Sleep', 'James')).toHaveAttribute('aria-checked', 'false')
  expect(sw('Sleep', 'Sarah')).toHaveAttribute('aria-checked', 'false')
  expect(sw('Safety alerts', 'Sarah')).toHaveAttribute('aria-checked', 'true')
  // Not part of "family": Priya keeps her row.
  expect(sw('Home sensors', 'Priya')).toHaveAttribute('aria-checked', 'true')
  expect(r.app().audit).toHaveLength(1)
  expect(r.app().audit[0].action).toBe('preset')
  fireEvent.click(screen.getByRole('button', { name: '🤝 Share everything with family' }))
  expect(toastText()).toBe('Family now sees everything')
  expect(sw('Mood and feelings', 'David')).toHaveAttribute('aria-checked', 'true')
  fireEvent.click(screen.getByRole('button', { name: '👨‍👩‍👧 Family sees most, not my mood' }))
  expect(toastText()).toBe('Family sees most things, not your mood')
  expect(sw('Mood and feelings', 'David')).toHaveAttribute('aria-checked', 'false')
  expect(sw('Home or out', 'James')).toHaveAttribute('aria-checked', 'false')
  expect(sw('Sleep', 'David')).toHaveAttribute('aria-checked', 'true')
})

test('two toggles in the same tick are both applied', async () => {
  const r = renderWithProviders(<PrivacyPage />, { who: 'self' })
  await ready()
  act(() => {
    r.app().toggleShare('sarah', 'mood')
    r.app().toggleShare('sarah', 'meds')
  })
  expect(sw('Mood and feelings', 'Sarah')).toHaveAttribute('aria-checked', 'true')
  expect(sw('Tablets', 'Sarah')).toHaveAttribute('aria-checked', 'true')
  expect(r.app().audit).toHaveLength(2)
})

test('preview as david hides heart card on home', async () => {
  const r = renderWithProviders(<PrivacyPage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: /See what David sees · 4 of 11/ }))
  expect(push).toHaveBeenCalledWith('/individual/home')
  expect(r.app().who).toBe('family')
  expect(r.app().viewer).toBe('david')
  expect(toastText()).toBe('Previewing what David sees')
  r.unmount()

  renderWithProviders(<HomePage />, { who: 'family', viewer: 'david' })
  await screen.findByText('🔮 Coming up: one thing to act on')
  await waitFor(() => expect(screen.queryByText('Blood pressure')).toBeNull())
  expect(screen.getAllByText('Margaret keeps her heart, blood pressure, body private').length).toBeGreaterThan(0)
  expect(document.body.innerHTML).not.toMatch(/146\/88/)
})

test('preview and emergency cards and the audit empty state', async () => {
  renderWithProviders(<PrivacyPage />, { who: 'self' })
  await ready()
  expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual(
    ['🔐 Who sees what', '👁️ Preview', '🏥 In an emergency', '🧾 Changes you made'],
  )
  expect(screen.getAllByRole('button', { name: /See what .* sees/ })).toHaveLength(4)
  expect(screen.getByText('No changes yet')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Emergency contacts' }))
  expect(toastText()).toBe('Emergency contacts: David and James')
})
