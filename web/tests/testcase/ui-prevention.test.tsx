import { fireEvent, screen, within } from '@testing-library/react'
import { preventionKinds, preventionScreens } from '@/features/testcase/ui/kinds/prevention'
import type { CaseId } from '@/features/testcase/engine'
import { advanceTo, mount } from './ui-helpers'

const kinds = preventionKinds
const screens = preventionScreens
const open = (id: CaseId) => mount(id, { kinds, screens })
const card = () => within(screen.getByTestId('card'))

describe('prevention step 0 to the decision', () => {
  it.each([
    ['wellchild', 'access', 'P4'],
    ['ifhas', 'value', 'P6'],
    ['expat', 'awareness', 'P3'],
    ['bone', 'access', 'P4'],
  ] as const)('%s: check the passport, answer %s, Noa decides %s', (id, barrier, rule) => {
    const { engine } = open(id)
    fireEvent.click(card().getByRole('button', { name: 'Check the passport' }))
    expect(engine.state.phase).toBe('ask')
    expect(card().getByRole('group', { name: 'What is making it hard?' })).toBeInTheDocument()
    expect(card().getByText(/Noa Voice: “.* is something making it hard|Is something making it hard\?/i)).toBeInTheDocument()
    const opts = card().getByRole('group', { name: 'What is making it hard?' }).querySelectorAll('button')
    expect(opts).toHaveLength(6)
    const idx = ['awareness', 'access', 'trust', 'value', 'forgot', 'decline'].indexOf(barrier)
    fireEvent.click(opts[idx])
    expect(engine.state.barrier).toBe(barrier)
    expect(card().getByText(new RegExp(`Noa’s decision · ${rule} ·`))).toBeInTheDocument()
    expect(card().getByText('Right action, right time?')).toBeInTheDocument()
    // the rule table highlights the rule that fired
    const hit = card().getAllByRole('row').find((row) => row.getAttribute('aria-current') === 'true')
    expect(hit?.textContent).toContain(rule)
    expect(card().getAllByRole('row')).toHaveLength(12) // header + P1 to P9 + F1, F2 (the prototype appends the two heart-risk family rules; was header + P1..P9
  })

  it.each([
    ['awareness', 'P3'], ['access', 'P4'], ['trust', 'P5'], ['value', 'P6'], ['forgot', 'P7'], ['decline', 'P8'],
  ] as const)('Hind: barrier %s gives rule %s and the decision is announced', (barrier, rule) => {
    const { engine } = open('wellchild')
    fireEvent.click(card().getByRole('button', { name: 'Check the passport' }))
    fireEvent.click(card().getAllByRole('button').find((b) => b.getAttribute('aria-pressed') === 'false' && b.textContent?.includes(rule))!)
    expect(engine.state.dec?.rule).toBe(rule)
    const box = card().getByText(new RegExp(`Noa’s decision · ${rule}`)).closest('[role="status"]')
    expect(box).not.toBeNull()
    if (rule === 'P8') {
      expect(engine.state.dec?.path).toBeNull()
      expect(card().getByText('Try another case, or change the details and check again.')).toBeInTheDocument()
      expect(card().getByText(/Choice recorded: no more nudges for 3 months/)).toBeInTheDocument()
    } else {
      expect(engine.state.path).toBe('prev')
      expect(barrier).toBe(engine.state.barrier)
    }
  })

  it('shows every barrier with the enabler that removes it, and the not eligible row', () => {
    open('wellchild')
    fireEvent.click(card().getByRole('button', { name: 'Check the passport' }))
    for (const rule of ['P3', 'P4', 'P5', 'P6', 'P7', 'P8']) expect(card().getAllByText(new RegExp(`^${rule} ·`)).length).toBeGreaterThan(0)
    expect(card().getByText(/Not eligible, or nothing due: P2/)).toBeInTheDocument()
  })

  it('eligibility first: an expatriate adult gets P2 and nothing to nudge', () => {
    const { engine } = open('ifhas')
    fireEvent.click(card().getByRole('button', { name: 'Expatriate' }))
    expect((engine.state.inp as { nat: string }).nat).toBe('Expatriate')
    fireEvent.click(card().getByRole('button', { name: 'Check the passport' }))
    expect(engine.state.dec?.rule).toBe('P2')
    expect(card().getByText(/Noa’s decision · P2 ·/)).toBeInTheDocument()
    expect(card().getByText('Checked eligibility before sending anything')).toBeInTheDocument()
    expect(card().queryByRole('group', { name: 'What is making it hard?' })).toBeNull()
  })

  it('the sliders change the inputs and are locked once Noa has checked', () => {
    const { engine } = open('wellchild')
    fireEvent.change(card().getByLabelText('Weeks overdue'), { target: { value: '9' } })
    fireEvent.change(card().getByLabelText('Reminders already sent'), { target: { value: '5' } })
    expect(engine.state.inp).toMatchObject({ overdue: 9, rem: 5 })
    fireEvent.click(card().getByRole('button', { name: 'Check the passport' }))
    expect(card().getByLabelText('Weeks overdue')).toBeDisabled()
    fireEvent.click(card().getByRole('button', { name: 'Change the details and check again' }))
    expect(engine.state.phase).toBe('setup')
  })
})

describe('prevention result, routing and the doctor queue', () => {
  const toResult = (id: CaseId, barrier: string) => {
    const m = open(id)
    m.run(() => { m.engine.checkPassport(); m.engine.chooseBarrier(barrier); m.engine.settle() })
    advanceTo(m.engine, 'result')
    return m
  }

  it('ifhas result: Noa Forecast with today’s results, and diabetes added from HbA1c 6.5', () => {
    const m = toResult('ifhas', 'value')
    expect(screen.getByText(/Noa Forecast · with today’s results/)).toBeInTheDocument()
    expect(screen.getByText(/10-year heart risk \(high\) · heart age/)).toBeInTheDocument()
    expect(screen.getByText(/diabetes range\. .* in 5 years if trends continue; .* with the plan\. Set HbA1c below 6\.5/)).toBeInTheDocument()
    m.run(() => m.engine.setResVal(6.0))
    expect(screen.getByText(/Set HbA1c to 6\.5 or more and the score adds diabetes/)).toBeInTheDocument()
    expect(screen.getByText(/At 6% Noa would route it/)).toBeInTheDocument()
  })

  it.each([
    ['ifhas', 'value', '8.4', /diabetes range/i, 'refer'],
    ['ifhas', 'value', '6.0', /prediabetes/i, 'refer'],
    ['ifhas', 'value', '5.2', /healthy range/i, 'ok'],
    ['wellchild', 'access', '1', /Noa would route it to/, 'refer'],
    ['wellchild', 'access', '12', /add it to the passport/, 'ok'],
    ['expat', 'awareness', '1', /Noa would route it to/, 'refer'],
    ['expat', 'awareness', '50', /add it to the passport/, 'ok'],
    ['bone', 'access', '-3', /Noa would route it to/, 'refer'],
    ['bone', 'access', '-0.5', /add it to the passport/, 'ok'],
  ] as const)('%s result %s routes to %s (%s)', (id, barrier, value, _text, branch) => {
    const { engine, run } = toResult(id, barrier)
    // the thresholds are visible before sending, and the live preview follows the slider
    expect(card().getByText(/How the result is routed \(rule P9\)/)).toBeInTheDocument()
    fireEvent.change(card().getByRole('slider'), { target: { value } })
    expect(engine.state.resVal).toBe(Number(value))
    expect(card().getByText(/Noa would (route it to|add it to the passport)/)).toBeInTheDocument()
    fireEvent.click(card().getByRole('button', { name: 'Send the result' }))
    expect(engine.state.branch).toBe(branch)
    expect(card().queryByRole('button', { name: 'Send the result' })).toBeNull()
    if (branch === 'refer') {
      expect(card().getByText(/Noa Insight →/)).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'The doctor’s review queue' })).toBeInTheDocument()
    } else {
      expect(card().getByText('Healthy · to the passport')).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'The doctor’s review queue' })).toBeNull()
    }
    run(() => undefined)
  })

  it('refer step: the doctor approves, which is the engine referral; change and call are presentational', () => {
    const { engine, run } = toResult('ifhas', 'value')
    run(() => { engine.setResVal(7.4); engine.sendResult(); engine.next(); engine.settle() })
    expect(engine.cur().kind).toBe('refer')
    const queue = within(screen.getByRole('region', { name: 'The doctor’s review queue' }))
    expect(queue.getByText(/The agent only proposes/)).toBeInTheDocument()
    expect(queue.getByRole('button', { name: 'Change' })).toBeInTheDocument()
    expect(queue.getByRole('button', { name: 'Call the patient' })).toBeInTheDocument()
    expect(engine.state.done[engine.state.step]).toBeFalsy()
    fireEvent.click(queue.getByRole('button', { name: 'Approve and accept the referral' }))
    expect(engine.state.done[engine.state.step]).toBe(true)
    expect(engine.getSnapshot().db.tasks.length).toBeGreaterThan(0)
    expect(card().getByText('Accepted')).toBeInTheDocument()
    expect(queue.getByText(/Approved by the doctor/)).toBeInTheDocument()
  })

  it('refer step: Change and Call only confirm inside the overlay and leave the engine alone', () => {
    const { engine, run } = toResult('ifhas', 'value')
    run(() => { engine.setResVal(7.4); engine.sendResult(); engine.next(); engine.settle() })
    const before = engine.getSnapshot().version
    fireEvent.click(within(screen.getByRole('region', { name: 'The doctor’s review queue' })).getByRole('button', { name: 'Call the patient' }))
    expect(screen.getByText(/The doctor will call the patient first/)).toBeInTheDocument()
    expect(engine.getSnapshot().version).toBe(before)
    expect(engine.state.done[engine.state.step]).toBeFalsy()
  })

  it('a healthy result leaves nothing to refer', () => {
    const { engine, run } = toResult('ifhas', 'value')
    run(() => { engine.setResVal(5.2); engine.sendResult(); engine.next(); engine.settle() })
    expect(card().getByText('Nothing to refer')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'The doctor’s review queue' })).toBeNull()
  })
})

describe('Y1: Khalid before Noa and with Noa', () => {
  const moment = () => within(screen.getByRole('region', { name: 'Khalid’s moment, told twice' }))

  it('is only on the adult screening case, labelled illustrative', () => {
    open('ifhas')
    expect(moment().getByText('Illustrative story, not a prediction')).toBeInTheDocument()
  })
  it('is not on the other prevention cases', () => {
    open('bone')
    expect(screen.queryByRole('region', { name: 'Khalid’s moment, told twice' })).toBeNull()
  })

  it('tells the Before story: generic reminder, swiped away, three weeks, a first heart or stroke problem years later', () => {
    open('ifhas')
    fireEvent.click(moment().getByRole('button', { name: 'Before Noa' }))
    expect(moment().getByRole('button', { name: 'Before Noa' })).toHaveAttribute('aria-pressed', 'true')
    expect(moment().getByText(/Dear patient, you are due a health screening/)).toBeInTheDocument()
    expect(moment().getByText(/swipes it away/)).toBeInTheDocument()
    expect(moment().getByText(/Three weeks pass/)).toBeInTheDocument()
    expect(moment().getByText(/Years later: a first heart or stroke problem, found because of symptoms/)).toBeInTheDocument()
    expect(moment().queryByRole('button', { name: /Book it/ })).toBeNull()
  })

  it('With Noa: a message about him, a Saturday slot, booked in ONE tap through the engine', () => {
    const { engine } = open('ifhas')
    expect(moment().getByRole('button', { name: 'With Noa' })).toHaveAttribute('aria-pressed', 'true')
    expect(moment().getByText(/father \(late Abdullah\): heart attack at 62/)).toBeInTheDocument()
    expect(moment().queryByText(/type 2 diabetes/)).toBeNull()
    expect(moment().getByText(/Saturday 09:30/)).toBeInTheDocument()
    expect(engine.state.phase).toBe('setup')
    fireEvent.click(moment().getByRole('button', { name: 'Book it · one tap' }))
    // one tap: the passport was checked and the personal reason (P6) answered, so Noa booked
    expect(engine.state.dec).toMatchObject({ rule: 'P6', path: 'prev' })
    expect(engine.state.barrier).toBe('value')
    expect(engine.getSnapshot().db.alerts.some((a) => (a.status as { k: string }).k === 'status.bookingOffered')).toBe(true)
    expect(moment().getByText(/^Booked: Saturday 09:30/)).toBeInTheDocument()
    expect(moment().getByText(/still decides everything clinical/)).toBeInTheDocument()
    expect(moment().queryByRole('button', { name: 'Book it · one tap' })).toBeNull()
  })

  it('does not book when Noa finds nothing to nudge (not eligible)', () => {
    const { engine } = open('ifhas')
    fireEvent.click(screen.getByRole('button', { name: 'Expatriate' }))
    fireEvent.click(moment().getByRole('button', { name: 'Book it · one tap' }))
    expect(engine.state.dec?.rule).toBe('P2')
    expect(engine.state.path).toBeNull()
    expect(moment().getByText(/not eligible/)).toBeInTheDocument()
  })
})

describe('prevention phone and web', () => {
  it('the phone and the passport window follow the engine', () => {
    const { engine, run } = open('wellchild')
    const phone = () => within(screen.getByTestId('phone'))
    const web = () => within(screen.getByTestId('web'))
    expect(phone().getByText(/Hello, /)).toBeInTheDocument()
    expect(phone().getByText('Reminders')).toBeInTheDocument()
    expect(web().getByText('Screenings, upcoming tests and care gaps')).toBeInTheDocument()
    run(() => engine.checkPassport())
    expect(phone().getByText('Is something making it hard to go?')).toBeInTheDocument()
    run(() => engine.chooseBarrier('decline'))
    expect(phone().getByText('Saved. No more reminders for 3 months.')).toBeInTheDocument()
  })
})
