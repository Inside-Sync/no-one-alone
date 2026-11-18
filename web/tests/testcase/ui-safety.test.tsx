import { act, fireEvent, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { safetyKinds, safetyScreens } from '@/features/testcase/ui/kinds/safety'
import { make } from './helpers'
import { drive, renderKind } from './uiSafetyHelpers'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

const options = () => screen.getAllByRole('button').filter((b) => b.className.includes('opt'))

test('the registry covers the safety kinds and the screens have a phone and a web app', () => {
  expect(Object.keys(safetyKinds).sort()).toEqual(['accept', 'btn', 'daily', 'home', 'recheck', 'report', 'teach', 'tl'])
  expect(safetyScreens.Phone).toBeTruthy()
  expect(safetyScreens.Web).toBeTruthy()
})

describe('home (step 0)', () => {
  test('readings are labelled sliders, locked once playing, and the playback is driven by 90 ms ticks', () => {
    vi.useFakeTimers()
    const e = make('stroke')
    renderKind(e)
    const hr = screen.getByLabelText(/Heart rate from/) as HTMLInputElement
    expect(hr.type).toBe('range')
    fireEvent.change(hr, { target: { value: '131' } })
    expect((e.S.inp as { hr: number }).hr).toBe(131)
    expect(screen.getByText('131 bpm')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Play/ }))
    expect(e.S.phase).toBe('playing')
    expect(screen.getByRole('button', { name: 'Playing…' })).toBeDisabled()
    expect(hr).toBeDisabled()
    act(() => { vi.advanceTimersByTime(90 * 60) })
    expect(e.S.phase).toBe('check')
    expect(e.S.read.length).toBeGreaterThan(10)
    expect(screen.getByText(/speech check \(play Moza\)/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Heart rate by minute' })).toBeInTheDocument()
  })

  test('toggles drive the engine: fall adds the floor slider, the glucose sensor adds the glucose slider', () => {
    const e = make('stroke')
    renderKind(e)
    expect(screen.queryByLabelText(/Time on the floor/)).toBeNull()
    fireEvent.click(within(screen.getByRole('group', { name: 'Fall detected' })).getByRole('button', { name: 'Yes' }))
    expect(screen.getByLabelText(/Time on the floor/)).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('group', { name: 'Glucose sensor' })).getByRole('button', { name: 'On' }))
    expect(screen.getByLabelText('Glucose')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('group', { name: 'Movement' })).getByRole('button', { name: 'Moving' }))
    expect((e.S.inp as { still: boolean }).still).toBe(false)
  })

  test('stroke: play, slurred sample, Noa asks, the answer takes the decision with the rule table and the checks', () => {
    const e = make('stroke')
    const run = drive(e)
    renderKind(e)
    run(() => e.play())
    expect(e.S.phase).toBe('check')
    fireEvent.click(screen.getByRole('button', { name: 'Use slurred speech' }))
    expect(e.S.speech.home?.lvl).toBe('red')
    expect(screen.getByText(/Speech clearly changed · /)).toBeInTheDocument()
    expect(screen.getByText(/words clear/)).toBeInTheDocument()
    expect(screen.getByText(/words\/min/)).toBeInTheDocument()
    expect(screen.queryByText(/Noa’s decision/)).toBeNull()
    fireEvent.click(options()[1])
    expect(e.S.dec?.rule).toBe('R5')
    expect(screen.getByText(/Noa’s decision · R5/)).toBeInTheDocument()
    expect(screen.getByText('Right action, right time?')).toBeInTheDocument()
    expect(screen.getAllByText(/998 called at/).length).toBeGreaterThan(0)
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows.filter((r) => r.className === 'hit').length).toBeGreaterThan(0)
    expect(within(table).getByText('R12')).toBeInTheDocument()
    expect(within(table).getAllByRole('cell', { name: /^R\d+$/ })).toHaveLength(12)
    // locked after the decision
    expect(screen.getByRole('button', { name: 'Use slurred speech' })).toBeDisabled()
  })

  test('a usual-speech answer "fine" stands down: no journey, a try-another note', () => {
    const e = make('stroke')
    const run = drive(e)
    renderKind(e)
    run(() => e.play())
    fireEvent.click(screen.getByRole('button', { name: /usual speech/ }))
    fireEvent.click(options()[0])
    expect(e.S.dec?.standdown).toBe(true)
    expect(screen.getByText(/Try another case/)).toBeInTheDocument()
  })

  test('no rule met (R12) shows the decision straight after the playback and lets the readings change', () => {
    const e = make('stroke')
    e.setInput('dur', 5)
    const run = drive(e)
    renderKind(e)
    run(() => e.play())
    expect(e.S.dec?.rule).toBe('R12')
    expect(screen.getByText(/Noa’s decision · R12/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Change the readings and play again' }))
    expect(e.S.phase).toBe('setup')
    expect(screen.getByRole('button', { name: /Play/ })).toBeEnabled()
  })

  test('fall case: the question offers three answers and "can’t get up" calls 998 (R7)', () => {
    const e = make('fall')
    const run = drive(e)
    renderKind(e)
    run(() => e.play())
    fireEvent.click(screen.getByRole('button', { name: /usual speech/ }))
    expect(options()).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: /can’t get up/ }))
    expect(e.S.dec?.rule).toBe('R7')
    expect(e.S.dec?.path).toBe('fall_em')
  })

  test('the polite live region announces the phase, not every tick', () => {
    const e = make('stroke')
    const run = drive(e)
    renderKind(e)
    run(() => e.play())
    expect(screen.getAllByRole('status').some((s) => /is asking Moza to say a sentence/.test(s.textContent ?? ''))).toBe(true)
  })
})

describe('speech check', () => {
  const play = (caseId: 'stroke' | 'hypo' = 'stroke') => {
    const e = make(caseId)
    const run = drive(e)
    renderKind(e)
    run(() => e.play())
    return e
  }

  test('typing the sentence scores it as typed', () => {
    const e = play()
    const input = screen.getByLabelText('Type the sentence')
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    fireEvent.change(input, { target: { value: 'My name is Moza and I live in Abu Dhabi' } })
    fireEvent.submit(input.closest('form')!)
    expect(e.S.speech.home?.mode).toBe('typed')
    expect(e.S.speech.home?.lvl).not.toBe('red')
    expect(screen.getByText(/typed · no timing/)).toBeInTheDocument()
    expect(screen.getByText(/Heard: “My name is Moza/)).toBeInTheDocument()
  })

  test('without speech recognition it says so and offers typing and samples', () => {
    play()
    expect(screen.getByText('Speaking needs a browser with speech recognition, such as Chrome or Edge. Type it, or use a sample.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Say it now/ })).toBeNull()
  })

  test('the microphone (Web Speech API): Say it now, words appear live, Done scores them with the time spoken', async () => {
    const made: FakeRec[] = []
    class FakeRec {
      lang = ''; continuous = false; interimResults = false
      onaudiostart: (() => void) | null = null; onresult: ((e: unknown) => void) | null = null
      onerror: ((e: { error: string }) => void) | null = null; onend: (() => void) | null = null
      started = false; stopped = false
      constructor() { made.push(this) }
      start() { this.started = true }
      stop() { this.stopped = true }
      abort() { this.stopped = true }
    }
    vi.stubGlobal('webkitSpeechRecognition', FakeRec)
    const e = play()
    fireEvent.click(screen.getByRole('button', { name: /Say it now/ }))
    const rec = made[0]
    expect(rec.started).toBe(true)
    expect(rec.lang).toBe('en-GB')
    expect(screen.getByText('Starting the microphone…')).toBeInTheDocument()
    act(() => { rec.onaudiostart?.() })
    act(() => { rec.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: false, length: 1, 0: { transcript: 'my name is' } } } }) })
    expect(screen.getByText('my name is')).toBeInTheDocument()
    act(() => { rec.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: true, length: 1, 0: { transcript: 'My name is Moza and I live in Abu Dhabi' } } } }) })
    fireEvent.click(screen.getByRole('button', { name: /Done/ }))
    expect(rec.stopped).toBe(true)
    act(() => { rec.onend?.() })
    expect(e.S.speech.home?.mode).toBe('spoken')
    expect(e.S.speech.home?.secs).not.toBeNull()
    expect(e.S.speech.home?.lvl).toBe('green')
  })

  test('a refused microphone shows its message and nothing is scored', () => {
    const made: { onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null }[] = []
    class FakeRec {
      lang = ''; continuous = false; interimResults = false
      onaudiostart = null; onresult = null; onerror: ((e: { error: string }) => void) | null = null; onend: (() => void) | null = null
      constructor() { made.push(this) }
      start() { /* waits for the answer to the permission prompt */ }
      stop() { /* nothing */ }
      abort() { /* nothing */ }
    }
    vi.stubGlobal('SpeechRecognition', FakeRec)
    const e = play()
    fireEvent.click(screen.getByRole('button', { name: /Say it now/ }))
    act(() => { made[0].onerror?.({ error: 'not-allowed' }); made[0].onend?.() })
    expect(screen.getByText('The microphone is off for this page. Type it, or use a sample.')).toBeInTheDocument()
    expect(e.S.speech.home).toBeUndefined()
  })

  test('unmounting releases the microphone and stops reading aloud', () => {
    const abort = vi.fn()
    class FakeRec {
      onaudiostart = null; onresult = null; onerror = null; onend = null
      start() { /* nothing */ }
      stop() { /* nothing */ }
      abort = abort
    }
    vi.stubGlobal('SpeechRecognition', FakeRec)
    const cancel = vi.fn()
    vi.stubGlobal('speechSynthesis', { cancel, speak: vi.fn() })
    vi.stubGlobal('SpeechSynthesisUtterance', class { lang = '' })
    const e = make('stroke')
    const run = drive(e)
    const { unmount } = renderKind(e)
    run(() => e.play())
    fireEvent.click(screen.getByRole('button', { name: /Say it now/ }))
    unmount()
    expect(abort).toHaveBeenCalled()
    expect(cancel).toHaveBeenCalled()
  })

  test('hypo case offers the glucose answers', () => {
    play('hypo')
    fireEvent.click(screen.getByRole('button', { name: /usual speech/ }))
    expect(options()).toHaveLength(3)
  })
})
