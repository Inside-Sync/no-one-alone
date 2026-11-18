import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { runAutopilot, type CaseId, type TestCaseEngine } from '@/features/testcase/engine'
import { GateStrip, gateStates, type GateId } from '@/features/testcase/ui/app/Gates'
import { DbPanel, LogPanel } from '@/features/testcase/ui/app/Panels'
import { dbProv, logProv } from '@/features/testcase/ui/app/Provenance'
import { SpeechResultView, usualScore } from '@/features/testcase/ui/kinds/safety/SpeechCheck'
import type { TestCaseSession } from '@/features/testcase/ui/app/useTestCaseEngine'
import { make, text } from './helpers'
import { advanceTo, renderKind } from './uiSafetyHelpers'
import { mount, useEngine } from './ui-helpers'
import { preventionKinds, preventionScreens } from '@/features/testcase/ui/kinds/prevention'

const statuses = (e: TestCaseEngine) => {
  const snap = e.getSnapshot()
  return Object.fromEntries(gateStates(snap, (x) => text(e, x)).map((g) => [g.id, g.status])) as Record<GateId, string>
}

describe('G1 gate statuses, read from the engine', () => {
  it('a stroke run: urgent bypass of the routine flow, then the care team accepts', () => {
    const e = make('stroke')
    expect(statuses(e)).toEqual({ consent: 'pass', data: 'pass', urgent: 'pending', rule: 'pending', human: 'pending' })
    advanceTo(e, 'tl')
    const g = gateStates(e.getSnapshot(), (x) => text(e, x))
    expect(g.map((x) => x.status)).toEqual(['pass', 'pass', 'bypassed', 'pass', 'hold'])
    expect(g[3].p?.rule).toBe(e.S.dec?.rule)
    expect(g[4].key).toBe('human.holdEm')
    runAutopilot(e)
    expect(statuses(e).human).toBe('pass')
    expect(statuses(e).urgent).toBe('bypassed')
  })

  it('hypo and heart-failure defaults: a check-in on target leaves nothing to approve, so the human gate is not on hold', () => {
    for (const c of ['hypo', 'hf'] as const) {
      const e = make(c)
      runAutopilot(e)
      expect(statuses(e).human, c).not.toBe('hold')
      const g = gateStates(e.getSnapshot(), (x) => text(e, x)).find((x) => x.id === 'human')!
      expect(g.key, c).toBe('human.none')
    }
  })

  it('a 998 path never says the call waits for approval; approval is for the follow-up plan', () => {
    const e = make('stroke')
    advanceTo(e, 'tl')
    const g = gateStates(e.getSnapshot(), (x) => text(e, x)).find((x) => x.id === 'human')!
    expect(g.key).toBe('human.holdEm')
    expect(g.key).not.toBe('human.hold')
  })

  it('a prevention run: consent first, the decision is a rule, a person accepts at the end', () => {
    const e = make('ifhas')
    expect(statuses(e)).toEqual({ consent: 'pass', data: 'pass', urgent: 'pending', rule: 'pending', human: 'pending' })
    e.checkPassport()
    expect(statuses(e)).toMatchObject({ urgent: 'pass', rule: 'hold', human: 'pending' })
    e.chooseBarrier('value')
    expect(statuses(e)).toMatchObject({ rule: 'pass', human: 'hold' })
    runAutopilot(e)
    expect(statuses(e)).toEqual({ consent: 'pass', data: 'pass', urgent: 'pass', rule: 'pass', human: 'pass' })
  })

  it('a family run: the red alert is the urgent bypass, a person confirms with the booking', () => {
    const e = make('family')
    expect(statuses(e)).toMatchObject({ consent: 'pass', urgent: 'bypassed', rule: 'pass', human: 'hold' })
    runAutopilot(e)
    expect(statuses(e).human).toBe('pass')
  })

  it('a required issue holds the data gate with the engine message; consent holds when nobody may see the plan', () => {
    const e = make('stroke')
    e.setInput('hr', 400)
    const g = gateStates(e.getSnapshot(), (x) => text(e, x))
    expect(g[1].status).toBe('hold')
    expect(g[1].p?.first).toMatch(/400/)
    e.setPlanShare('f1', false)
    e.setPlanShare('f2', false)
    expect(statuses(e).consent).toBe('hold')
  })

  it('renders an ordered list with the status in words and a reason, not colour only', () => {
    const e = make('stroke')
    function Strip() { const { snap, r } = useEngine(e); return <GateStrip snap={snap} r={r} /> }
    render(<Strip />)
    const list = screen.getByRole('list', { name: /Gates this case passes through/ })
    expect(list.tagName).toBe('OL')
    const items = within(list).getAllByRole('listitem')
    expect(items.map((li) => li.getAttribute('data-gate'))).toEqual(['consent', 'data', 'urgent', 'rule', 'human'])
    expect(items[0]).toHaveTextContent('Consent')
    expect(items[0]).toHaveTextContent('Passed')
    expect(items[2]).toHaveTextContent('Not reached')
    act(() => { advanceTo(e, 'tl') })
    expect(items[2]).toHaveTextContent('Bypassed')
    expect(items[3]).toHaveTextContent(`${e.S.dec?.rule}:`)
    expect(items[4]).toHaveTextContent('On hold')
  })
})

describe('G2 provenance tags', () => {
  it('maps log categories and table rows', () => {
    expect(logProv('DETECT')).toBe('observed')
    expect(logProv('DECIDE')).toBe('calculated')
    expect(logProv('AI')).toBe('ai')
    expect(logProv('ACCEPT')).toBe('clinician')
    expect(dbProv('observations', {})).toBe('observed')
    expect(dbProv('alerts', { status: { k: 'status.accepted' } })).toBe('clinician')
    expect(dbProv('alerts', { status: { k: 'status.new' } })).toBe('calculated')
    expect(dbProv('encounters', { encounter_id: 'SRC-1' })).toBe('observed')
  })

  it('tags every database row and every log line, with a legend', () => {
    const e = make('stroke')
    act(() => { runAutopilot(e) })
    function Panels() {
      const { snap, r } = useEngine(e)
      const s = { engine: e, snap, r } as unknown as TestCaseSession
      return <><DbPanel s={s} /><LogPanel s={s} /></>
    }
    const { container } = render(<Panels />)
    expect(screen.getAllByRole('list', { name: 'What the tags mean' })).toHaveLength(2)
    const rows = container.querySelectorAll('table.tbl2 tbody tr')
    expect(rows.length).toBeGreaterThan(0)
    rows.forEach((row) => expect(row.querySelector('td:last-child .prov')).not.toBeNull())
    const lines = container.querySelectorAll('ul.loglist li')
    expect(lines.length).toBeGreaterThan(5)
    lines.forEach((li) => expect(li.querySelector('.prov')).not.toBeNull())
    expect(container.querySelector('ul.loglist [data-prov="clinician"]')).not.toBeNull()
    expect(container.querySelector('ul.loglist [data-prov="ai"]')).toBeNull()
    expect(screen.getAllByText('Calculated').length).toBeGreaterThan(2)
    act(() => { e.passTeachBack() })
  })
})

describe('G3 speech score against the usual one', () => {
  it('reads the usual score from the person description (also in Arabic digits)', () => {
    expect(usualScore('Heart 58–64 asleep · speech score 0.94')).toBe(0.94)
    expect(usualScore('Dry weight 61.0 kg · oxygen 95–97% · speech score 0.93')).toBe(0.93)
    expect(usualScore('النطق ٠٫٩٢')).toBe(0.92)
    expect(usualScore('Growing on the 50th centile')).toBeNull()
  })

  it('shows today, usual and the difference with one plain line', () => {
    const e = make('stroke')
    renderKind(e)
    act(() => { e.play(); while (e.S.phase === 'playing') e.playTick(); e.sampleSpeech('slurred'); e.drain() })
    expect(screen.getByRole('group', { name: /speech score against the usual/ })).toBeInTheDocument()
    const box = within(screen.getByRole('group', { name: /speech score against the usual/ }))
    expect(box.getByText('Usual').nextSibling).toHaveTextContent('0.94')
    expect(box.getByText('Difference').nextSibling).toHaveTextContent(/^−0\./)
    expect(box.getByText(/below Moza’s usual 0.94/)).toBeInTheDocument()
  })

  it('marks the score Calculated and the readings Observed', () => {
    const e = make('stroke')
    renderKind(e)
    expect(screen.getAllByText('Observed').length).toBeGreaterThan(0)
    const res = { said: 'x', secs: 4, match: 1, ratio: 1, score: 0.9, lvl: 'green' as const, mode: 'typed' as const, lang: 'en' as const, wpm: null, mask: [true], target: ['x'], matched: 1, total: 1 }
    const { container } = render(<SpeechResultView res={res} usual={0.9} who="Moza" />)
    expect(container.querySelector('[data-prov="calculated"]')).not.toBeNull()
    expect(container).toHaveTextContent('the same as Moza’s usual 0.90')
  })
})

describe('B3 input issues next to the fields', () => {
  const typeInto = (n: number, value: string) => {
    const box = screen.getAllByLabelText('Exact value')[n]
    fireEvent.change(box, { target: { value } })
    fireEvent.blur(box)
  }

  it('safety: an implausible heart rate is refused with a message, the button is blocked, a valid value clears it', () => {
    const e = make('stroke')
    renderKind(e)
    typeInto(0, '400')
    const alerts = screen.getAllByRole('alert')
    expect(alerts.some((a) => /400/.test(a.textContent ?? '') && /Required/.test(a.textContent ?? ''))).toBe(true)
    expect(screen.getByRole('button', { name: /Play/ })).toBeDisabled()
    expect((e.S.inp as { hr: number }).hr).not.toBe(400)
    typeInto(0, '130')
    expect((e.S.inp as { hr: number }).hr).toBe(130)
    expect(e.getSnapshot().inputIssues.required).toHaveLength(0)
    expect(screen.getByRole('button', { name: /Play/ })).toBeEnabled()
  })

  it('safety: no glucose sensor for a person with diabetes is a warning, not a block', () => {
    const e = make('hypo')
    renderKind(e)
    act(() => { e.setInputToggle('glus', false); e.drain() })
    const warn = screen.getAllByRole('status').find((x) => /Warning/.test(x.textContent ?? ''))
    expect(warn).toBeTruthy()
    expect(warn).toHaveTextContent(/glucose/i)
    expect(screen.getByRole('button', { name: /Play/ })).toBeEnabled()
  })

  it('prevention: an age out of range is required and blocks the passport check', () => {
    const { engine } = mount('ifhas' as CaseId, { kinds: preventionKinds, screens: preventionScreens })
    typeInto(0, '500')
    expect(screen.getAllByRole('alert')).toHaveLength(1) // one live announcement, at the field; the note by the button is plain text
    expect(screen.getAllByText(/Required/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Check the passport' })).toBeDisabled()
    expect(engine.getSnapshot().inputIssues.required.length).toBeGreaterThan(0)
  })
})
