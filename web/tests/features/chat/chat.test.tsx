import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { ChatPanel } from '@/features/chat/ChatPanel'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { renderWithProviders } from '../../helpers/renderWithProviders'

let path = '/individual/home'
vi.mock('@/app/navigation', () => ({ usePathname: () => path, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const idle = async () => {}
let live = true
vi.mock('@/state/LiveIncident', () => ({
  useLiveIncident: (): LiveIncidentValue => ({
    live, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
    start: idle, reset: idle, checkin: idle, act: idle, recover: idle,
  }),
}))

const chat = vi.fn<(body: unknown) => Promise<{ answer: string }>>()
vi.mock('@/data/api', () => ({ chat: (body: unknown) => chat(body) }))

beforeEach(() => {
  path = '/individual/home'
  live = true
  chat.mockReset()
})

const panel = () => screen.getByRole('complementary', { name: 'Chat with Noa' })
const openChat = () => fireEvent.click(screen.getByRole('button', { name: 'Ask Noa' }))
const ask = (q: string) => {
  fireEvent.change(within(panel()).getByRole('textbox', { name: 'Your question' }), { target: { value: q } })
  fireEvent.click(within(panel()).getByRole('button', { name: 'Send' }))
}

test('asking posts question, mode, viewer and the last 10 messages, then renders the answer', async () => {
  chat.mockImplementation(async (b) => ({ answer: `A:${(b as { question: string }).question}` }))
  renderWithProviders(<ChatPanel />, { who: 'family', viewer: 'james' })
  openChat()
  for (const q of ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7']) {
    ask(q)
    expect(await within(panel()).findByText(`A:${q}`)).toBeInTheDocument()
  }
  expect(chat).toHaveBeenNthCalledWith(2, { question: 'q2', mode: 'fam', viewer: 'james', history: [{ by: 'me', text: 'q1' }, { by: 'noa', text: 'A:q1' }] })
  const last = chat.mock.calls[6][0] as { history: { text: string }[] }
  expect(last.history).toHaveLength(10)
  expect(last.history[0].text).toBe('q2')
})

test('an API failure shows that Noa cannot answer', async () => {
  chat.mockRejectedValue(new Error('502'))
  renderWithProviders(<ChatPanel />)
  openChat()
  ask('How is she?')
  expect(await within(panel()).findByText("Noa can't answer right now.")).toBeInTheDocument()
})

test('in mock mode Noa is offline and nothing is posted', async () => {
  live = false
  renderWithProviders(<ChatPanel />)
  openChat()
  ask('How is she?')
  expect(await within(panel()).findByText('Noa is offline in this preview.')).toBeInTheDocument()
  expect(chat).not.toHaveBeenCalled()
})

test('chips and greeting follow the mode', async () => {
  path = '/hospital/ed'
  const r = renderWithProviders(<ChatPanel />)
  openChat()
  expect(within(panel()).getByRole('button', { name: 'Patient summary' })).toBeInTheDocument()
  expect(within(panel()).queryByRole('button', { name: 'My tablets' })).toBeNull()
  r.unmount()

  path = '/individual/me'
  renderWithProviders(<ChatPanel />, { who: 'self' })
  openChat()
  await within(panel()).findByRole('button', { name: 'My tablets' })
  expect(within(panel()).queryByRole('button', { name: 'Patient summary' })).toBeNull()
})

test('a fam chip asks its text with the viewer', async () => {
  chat.mockResolvedValue({ answer: 'Resting.' })
  renderWithProviders(<ChatPanel />, { who: 'family', viewer: 'james' })
  openChat()
  fireEvent.click(await within(panel()).findByRole('button', { name: 'How is Mum right now?' }))
  await waitFor(() => expect(chat).toHaveBeenCalledWith({ question: 'How is Mum right now?', mode: 'fam', viewer: 'james', history: [] }))
})

test('opening focuses the input and Escape closes', () => {
  renderWithProviders(<ChatPanel />)
  openChat()
  expect(panel()).toHaveClass('on')
  expect(within(panel()).getByRole('textbox', { name: 'Your question' })).toHaveFocus()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(panel()).not.toHaveClass('on')
})
