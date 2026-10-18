import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
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

test('a 429 from the rate limit asks to try again in a minute', async () => {
  chat.mockRejectedValue(Object.assign(new Error('Too many requests'), { status: 429 }))
  renderWithProviders(<ChatPanel />)
  openChat()
  ask('How is she?')
  expect(await within(panel()).findByText('Lots of questions just now. Please try again in a minute.')).toBeInTheDocument()
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
  expect(within(panel()).getByText('COLLINS, Margaret')).toBeInTheDocument()
  expect(within(panel()).getByRole('button', { name: 'Patient summary' })).toBeInTheDocument()
  expect(within(panel()).queryByRole('button', { name: 'My tablets' })).toBeNull()
  r.unmount()

  path = '/individual/me'
  renderWithProviders(<ChatPanel />, { who: 'self' })
  openChat()
  await within(panel()).findByRole('button', { name: 'My tablets' })
  expect(within(panel()).getByText(/^Hello Margaret/)).toBeInTheDocument()
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

test('the hidden FAB leaves the tab order while the panel is open', () => {
  renderWithProviders(<ChatPanel />)
  const fab = screen.getByRole('button', { name: 'Ask Noa' })
  fireEvent.click(fab)
  expect(fab).toHaveAttribute('tabindex', '-1')
})

test('submitting while a reply is pending keeps the text and posts once', async () => {
  let reply!: (v: { answer: string }) => void
  chat.mockImplementation(() => new Promise((r) => { reply = r }))
  renderWithProviders(<ChatPanel />)
  openChat()
  ask('first')
  const box = within(panel()).getByRole('textbox', { name: 'Your question' })
  expect(within(panel()).getByRole('button', { name: 'Send' })).toBeDisabled()
  fireEvent.change(box, { target: { value: 'second' } })
  fireEvent.submit(box.closest('form')!)
  expect(box).toHaveValue('second')
  await waitFor(() => expect(chat).toHaveBeenCalled())
  reply({ answer: 'done' })
  await within(panel()).findByText('done')
  expect(chat).toHaveBeenCalledTimes(1)
})

test('offline and failure bubbles are not sent as history', async () => {
  chat.mockRejectedValueOnce(new Error('502')).mockResolvedValue({ answer: 'ok' })
  renderWithProviders(<ChatPanel />)
  openChat()
  ask('q1')
  await within(panel()).findByText("Noa can't answer right now.")
  ask('q2')
  await within(panel()).findByText('ok')
  expect((chat.mock.calls[1][0] as { history: unknown }).history).toEqual([{ by: 'me', text: 'q1' }])
})

test('the fam greeting says "there" when the viewer has no name', async () => {
  renderWithProviders(<ChatPanel />, { who: 'family', viewer: 'nobody' })
  openChat()
  expect(within(panel()).getByText(/^Hi there 👋/)).toBeInTheDocument()
})

test('an Escape another handler already used does not close the chat', () => {
  renderWithProviders(<ChatPanel />)
  openChat()
  const e = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
  e.preventDefault()
  act(() => { document.dispatchEvent(e) })
  expect(panel()).toHaveClass('on')
})

test('a question is cut to 500 characters', async () => {
  chat.mockResolvedValue({ answer: 'ok' })
  renderWithProviders(<ChatPanel />)
  openChat()
  expect(within(panel()).getByRole('textbox', { name: 'Your question' })).toHaveAttribute('maxlength', '500')
  ask('x'.repeat(600))
  await within(panel()).findByText('ok')
  expect((chat.mock.calls[0][0] as { question: string }).question).toHaveLength(500)
})
