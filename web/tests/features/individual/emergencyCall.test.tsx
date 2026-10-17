import { act, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import type { IncidentDoc, TurnDoc } from '@/data/contract'
import { SpeechCheckCard } from '@/features/individual/live/SpeechCheckCard'
import { useCallDialogue } from '@/features/individual/live/useCallDialogue'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/live/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

let played: string[] = []
let ended: () => void = () => {}
beforeEach(() => {
  played = []
  vi.stubGlobal('Audio', vi.fn(function Audio(url: string) {
    return {
      play: () => { played.push(url); return Promise.resolve() },
      pause: () => {},
      addEventListener: (ev: string, f: () => void) => { if (ev === 'ended') ended = f },
    }
  }))
})
afterEach(() => { vi.unstubAllGlobals() })

function EmergencyCallCard(props: Omit<Parameters<typeof useCallDialogue>[0], 'callKey'>) {
  const { lines, dialling } = useCallDialogue({ callKey: 'call-1', ...props })
  return (
    <>
      {dialling && <p>Dialling 000…</p>}
      <ol>{lines.map((l) => <li key={l.clip}><b>{l.by === 'operator' ? '000 operator' : 'Noa'}</b>: {l.text}</li>)}</ol>
    </>
  )
}

const flush = () => act(async () => { await Promise.resolve() })

test('000 call: waits for the dial, then plays the 8 clips in order with the David line, then reports done', async () => {
  let dialed = () => {}
  const dialDone = new Promise<void>((r) => { dialed = r })
  const onDone = vi.fn()
  renderWithProviders(<EmergencyCallCard live davidAccepted dialDone={dialDone} onDone={onDone} />)
  expect(screen.getByText('Dialling 000…')).toBeInTheDocument()
  await flush()
  expect(played).toEqual([])
  await act(async () => { dialed(); await dialDone })
  for (let i = 0; i < 8; i++) {
    await flush()
    await act(async () => { ended() })
  }
  await flush()
  expect(played).toEqual(['1', '2', '3', '4-david', '5', '6', '7', '8'].map((n) => `/noa/000-${n}.mp3`))
  expect(screen.getAllByText('000 operator')).toHaveLength(4)
  expect(screen.getAllByText('Noa')).toHaveLength(4)
  expect(screen.getByText(/Her brother David is on his way with a key/)).toBeInTheDocument()
  expect(onDone).toHaveBeenCalledTimes(1)
  expect(onDone).toHaveBeenCalledWith(false)
})

test("000 call: line 1 waits for Margaret's phone to finish speaking", async () => {
  let spoke = () => {}
  const speechRef = { current: new Promise<void>((r) => { spoke = r }) }
  renderWithProviders(<EmergencyCallCard live davidAccepted dialDone={Promise.resolve()} speechRef={speechRef} onDone={() => {}} />)
  await flush()
  await flush()
  expect(played).toEqual([])
  await act(async () => { spoke() })
  await flush()
  expect(played).toEqual(['/noa/000-1.mp3'])
})

test('000 call: a late David accept does not restart the dialogue', async () => {
  const dialDone = Promise.resolve()
  const { rerender } = render(<EmergencyCallCard live davidAccepted={false} dialDone={dialDone} onDone={() => {}} />)
  await flush()
  await flush()
  expect(played).toEqual(['/noa/000-1.mp3'])
  rerender(<EmergencyCallCard live davidAccepted dialDone={dialDone} onDone={() => {}} />)
  await flush()
  await flush()
  expect(played).toEqual(['/noa/000-1.mp3'])
})

test('000 call on reload: the whole transcript, no audio, and done is silent', async () => {
  const onDone = vi.fn()
  renderWithProviders(<EmergencyCallCard live={false} davidAccepted={false} dialDone={Promise.resolve()} onDone={onDone} />)
  await flush()
  expect(played).toEqual([])
  expect(onDone).toHaveBeenCalledWith(true)
  expect(screen.getAllByRole('listitem')).toHaveLength(8)
  expect(screen.getByText(/Nobody is with her\. Key lockbox by the front door/)).toBeInTheDocument()
})

const turn = (by: TurnDoc['by'], text: string, clarity?: 'CLEAR' | 'SLURRED'): TurnDoc =>
  ({ by, at: '', text, ...(clarity ? { assessment: { clarity } } : {}) })
const q1 = turn('AGENT', "Hello Margaret, it's Noa. Are you all right?")
const q2 = turn('AGENT', 'Thank you, Margaret. Please say after me: The sky is blue in Sydney.')

const card = (turns: TurnDoc[], busy = false) =>
  <SpeechCheckCard incident={{ checkIn: { turns, busy } } as unknown as IncidentDoc} name="Margaret" timeZone="UTC" />

test('speech check: ready, then listening to Q2, then the slurred verdict and five measures', () => {
  const { rerender } = renderWithProviders(card([q1]))
  expect(screen.getByText('Ready · baseline from 41 morning chats')).toBeInTheDocument()
  rerender(card([q1, turn('PERSON', 'yes', 'SLURRED'), q2]))
  expect(screen.getByText('🎙️ Listening to Margaret…')).toBeInTheDocument()
  rerender(card([q1, turn('PERSON', 'yes', 'CLEAR'), q2, turn('PERSON', 'the sky iz', 'SLURRED')]))
  expect(screen.getByText('⚠ Slurred speech detected · possible stroke')).toBeInTheDocument()
  expect(screen.getByText('0.41')).toBeInTheDocument()
  expect(screen.queryByText('✓ Clear · matches her normal voice')).toBeNull()
})

test('speech check: a re-asked speech question still shows the latest verdict', () => {
  const again = turn('AGENT', 'Say after me again, the sky is blue in Sydney.')
  renderWithProviders(card([q1, turn('PERSON', 'yes', 'CLEAR'), q2, turn('PERSON', '', 'CLEAR'), again, turn('PERSON', 'iz', 'SLURRED')]))
  expect(screen.getByText('⚠ Slurred speech detected · possible stroke')).toBeInTheDocument()
})
