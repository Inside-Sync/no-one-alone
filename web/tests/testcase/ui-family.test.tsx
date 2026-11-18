import { act, fireEvent, screen, within } from '@testing-library/react'
import { FamilyDashboard, familyKinds, familyScreens } from '@/features/testcase/ui/kinds/family'
import { pct, type AdultProfile, type TestCaseEngine } from '@/features/testcase/engine'
import { advanceTo, mount } from './ui-helpers'

const open = () => mount('family', { kinds: familyKinds, screens: familyScreens, extra: FamilyDashboard })
const dash = () => within(screen.getByTestId('extra'))
const card = () => within(screen.getByTestId('card'))
const phone = () => within(screen.getByTestId('phone'))
const alertOf = (id: string) => within(document.querySelector(`[data-alert="${id}"]`) as HTMLElement)
const pick = (id: string) => fireEvent.click(document.querySelector(`.tn[data-member="${id}"]`) as HTMLElement)
const adult = (e: TestCaseEngine, k: string) => e.state.fm!.prof[k] as AdultProfile
const forecastPanel = () => within(document.querySelector('.fcpanel') as HTMLElement)
const editor = () => within(document.querySelector('.pfed') as HTMLElement)
/** Drag a slider and release it, as a person does. */
const slide = (label: RegExp, value: number) => {
  const el = editor().getByLabelText(label)
  fireEvent.change(el, { target: { value: String(value) } })
  fireEvent.pointerUp(el)
}

describe('family dashboard', () => {
  it('shows the score, the goal, the badge, the six sources and the starting connections', () => {
    const { engine } = open()
    expect(dash().getByText('Al Mansoori family passport · 4 generations')).toBeInTheDocument()
    expect(dash().getByText(/of 8 up to date · goal: everyone by 30 November/)).toBeInTheDocument()
    expect(dash().getByRole('img', { name: /Family passport score: \d+%/ })).toBeInTheDocument()
    expect(dash().getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(engine.getSnapshot().famUp))
    expect(dash().getByRole('progressbar')).toHaveAttribute('aria-valuemax', '8')
    expect(dash().getByRole('img', { name: 'Lifelong journey from birth to 85' })).toBeInTheDocument()
    expect(document.querySelectorAll('.src1')).toHaveLength(6)
    expect(document.querySelectorAll('.conn')).toHaveLength(5) // C1, C7, C2, C3, C6
    expect(dash().getByText(/7 need you/)).toBeInTheDocument()
    expect(dash().getByText('Hamdan is up to date')).toBeInTheDocument()
  })

  it('the family tree has four generations and eight members, each a button that selects them', () => {
    const { engine } = open()
    const tree = within(document.querySelector('.tree') as HTMLElement)
    for (const g of ['Grandparents', 'Parents', 'Children', 'Grandchildren']) expect(tree.getByText(new RegExp(`^${g}`))).toBeInTheDocument()
    const nodes = document.querySelectorAll('.tn')
    expect(nodes).toHaveLength(8)
    expect([...nodes].map((n) => n.getAttribute('data-member'))).toEqual(['moza', 'saeed', 'khalid', 'amna', 'maitha', 'sultan', 'hind', 'hamdan'])
    expect(tree.getByText('Khalid, 47')).toBeInTheDocument()
    expect(tree.getByText('Hind, 18 months')).toBeInTheDocument()
    expect(tree.getByText('Hamdan, 5')).toBeInTheDocument()
    pick('amna')
    expect(engine.state.fm!.sel).toBe('amna')
    expect(document.querySelector('.tn[data-member="amna"]')).toHaveAttribute('aria-pressed', 'true')
    expect(editor().getByText('Edit Amna’s profile · try anything')).toBeInTheDocument()
    expect(phone().getByRole('heading', { name: 'Hello, Amna' })).toBeInTheDocument()
  })

  it('shows the heart risk beside every member the score applies to, and none for the others', () => {
    open()
    for (const id of ['khalid', 'amna', 'saeed']) expect(document.querySelector(`.tn[data-member="${id}"] em.fc`)).not.toBeNull()
    for (const id of ['moza', 'maitha', 'sultan', 'hind', 'hamdan']) expect(document.querySelector(`.tn[data-member="${id}"] em.fc`)).toBeNull()
  })

  it('book: Hind is booked, the score goes up and the Saturday slot appears', () => {
    const { engine } = open()
    const before = engine.getSnapshot().famScore
    fireEvent.click(alertOf('hind').getByRole('button', { name: /Book Saturday 09:00/ }))
    expect(engine.state.fm!.status.hind).toBe('booked')
    expect(engine.state.fm!.booked.hind).toBeTruthy()
    expect(engine.getSnapshot().famScore).toBeGreaterThan(before)
    expect(dash().getByText(new RegExp(`^${engine.getSnapshot().famScore}%$`))).toBeInTheDocument()
    expect(dash().getByText(/6 need you/)).toBeInTheDocument()
  })

  it('accept: Moza’s clinic alert is accepted and the blood-pressure badge appears', () => {
    const { engine } = open()
    expect(dash().queryByText('Moza’s blood pressure plan updated')).toBeNull()
    fireEvent.click(alertOf('moza').getByRole('button', { name: /Clinic accepted/ }))
    expect(engine.state.fm!.status.moza).toBe('care')
    expect(dash().getByText('Moza’s blood pressure plan updated')).toBeInTheDocument()
  })

  it('keep the date: Amna keeps her date and nothing is booked', () => {
    const { engine } = open()
    fireEvent.click(alertOf('amna').getByRole('button', { name: 'Keep the date' }))
    expect(engine.state.fm!.status.amna).toBe('due')
    expect(engine.state.fm!.booked.amna).toBeUndefined()
  })

  it('not now: respected for 3 months and kept in the passport', () => {
    const { engine } = open()
    const before = engine.getSnapshot().famScore
    fireEvent.click(alertOf('saeed').getByRole('button', { name: 'Not now' }))
    expect(engine.state.fm!.declined.saeed).toBe(true)
    expect(engine.state.fm!.status.saeed).toBe('declined')
    expect(engine.getSnapshot().famScore).toBeGreaterThan(before)
    expect(dash().getAllByText('Not now').length).toBeGreaterThan(0)
  })

  it('one trip, four checks: booking two of Hind, Maitha, Khalid and Amna earns the badge', () => {
    open()
    expect(dash().queryByText('One trip, four checks')).toBeNull()
    fireEvent.click(alertOf('hind').getByRole('button', { name: /Book Saturday 09:00/ }))
    fireEvent.click(alertOf('khalid').getByRole('button', { name: /Add to Saturday 09:30/ }))
    expect(dash().getByText('One trip, four checks')).toBeInTheDocument()
    expect(dash().getByText('Khalid’s first screening')).toBeInTheDocument()
  })

  it('the hub card shows the five tips and the checks, and the booked count', () => {
    const { run, engine } = open()
    expect(card().getByText(/Tap Khalid and turn off “Smokes or vapes”/)).toBeInTheDocument()
    expect(card().getAllByRole('listitem').length).toBeGreaterThanOrEqual(10)
    run(() => engine.famAct('book_hind'))
    expect(card().getByText(/1 booked · passport \d+%/)).toBeInTheDocument()
  })

  it('each person is reached their own way: the phone names the channel, and shows the heart risk where it applies', () => {
    const { run, engine } = open()
    run(() => engine.famSelect('hind'))
    expect(phone().getByRole('heading', { name: 'Hind’s passport' })).toBeInTheDocument()
    expect(phone().getByText('For Maitha: Hind’s visits, 7 of 14.')).toBeInTheDocument()
    run(() => engine.famSelect('khalid'))
    const f = engine.forecast('khalid')
    if (!f.ok) throw new Error('Khalid is scored')
    expect(phone().getByText(new RegExp(`Quitting medwakh brings your 5-year risk from ${pct(f.r5)} to about ${pct(f.p5)}`))).toBeInTheDocument()
    expect(phone().getByText('Heart risk')).toBeInTheDocument()
    run(() => engine.famSelect('moza'))
    expect(phone().queryByText('Heart risk')).toBeNull()
    expect(phone().getByText('Badges')).toBeInTheDocument()
  })

  it('the web screen lists all eight with the heart risk where it applies', () => {
    open()
    expect(within(screen.getByTestId('web')).getAllByText(/heart \d+%|heart <1%/).length).toBe(3)
    expect(within(screen.getByTestId('web')).getByText('Hamdan, 5')).toBeInTheDocument()
  })
})

describe('profile editor', () => {
  it('has the engine’s sliders and switches for an adult, and two sliders for a child', () => {
    open()
    pick('amna')
    expect(editor().getAllByRole('slider')).toHaveLength(7) // age sbp bmi tc hdl sbpTrend bmiTrend
    expect(editor().getByRole('button', { name: 'Female' })).toHaveAttribute('aria-pressed', 'true')
    for (const n of ['Smokes or vapes', 'Diabetes', 'On BP tablets', 'Had a heart attack or stroke', 'Emirati', 'Cholesterol measured']) expect(editor().getByRole('button', { name: n })).toBeInTheDocument()
    pick('hind')
    expect(editor().getAllByRole('slider')).toHaveLength(2)
    expect(editor().getByLabelText('Weeks overdue')).toHaveValue('3')
  })

  it('a slider follows the engine range and step', () => {
    open()
    pick('khalid')
    const sbp = editor().getByLabelText('Blood pressure (top number)')
    expect(sbp).toHaveAttribute('min', '90')
    expect(sbp).toHaveAttribute('max', '200')
    expect(editor().getByLabelText('BMI')).toHaveAttribute('step', '0.5')
  })

  it('editing a profile changes the forecast: raising Khalid’s blood pressure raises his risk, and release logs the edit', () => {
    const { engine } = open()
    pick('khalid')
    const before = engine.forecast('khalid')
    if (!before.ok) throw new Error('scored')
    expect(forecastPanel().getByText(pct(before.r))).toBeInTheDocument()
    const logs = engine.logs.length
    const el = editor().getByLabelText('Blood pressure (top number)')
    fireEvent.change(el, { target: { value: '170' } })
    expect(adult(engine, 'khalid').sbp).toBe(170)
    expect(engine.logs.length).toBe(logs) // dragging does not log
    const after = engine.forecast('khalid')
    if (!after.ok) throw new Error('scored')
    expect(after.r).toBeGreaterThan(before.r)
    expect(forecastPanel().getByText(pct(after.r))).toBeInTheDocument()
    expect(document.querySelector('.tn[data-member="khalid"] em.fc')).toHaveTextContent(pct(after.r))
    fireEvent.pointerUp(el)
    expect(engine.logs.length).toBe(logs + 1)
  })

  it('turning off smoking lowers the risk, and the switches show their state', () => {
    const { engine } = open()
    pick('khalid')
    const before = engine.forecast('khalid')
    fireEvent.click(editor().getByRole('button', { name: 'Smokes or vapes' }))
    expect(adult(engine, 'khalid').smoker).toBe(false)
    expect(editor().getByRole('button', { name: 'Smokes or vapes' })).toHaveAttribute('aria-pressed', 'false')
    const after = engine.forecast('khalid')
    if (!before.ok || !after.ok) throw new Error('scored')
    expect(after.r).toBeLessThan(before.r)
  })

  it('sex changes the score, and Reset family brings every profile back', () => {
    const { engine } = open()
    pick('amna')
    const start = engine.forecast('amna')
    fireEvent.click(editor().getByRole('button', { name: 'Male' }))
    expect(adult(engine, 'amna').sex).toBe('M')
    expect(engine.forecast('amna')).not.toEqual(start)
    slide(/^Age$/, 60)
    expect(adult(engine, 'amna').age).toBe(60)
    fireEvent.click(editor().getByRole('button', { name: 'Reset family' }))
    expect(adult(engine, 'amna').sex).toBe('F')
    expect(adult(engine, 'amna').age).toBe(45)
    expect(engine.forecast('amna')).toEqual(start)
  })

  it('"Cholesterol measured" adds the cholesterol sliders and switches the score to the lab variant', () => {
    const { engine } = open()
    pick('khalid')
    expect(editor().queryByLabelText('Total cholesterol')).toBeNull()
    fireEvent.click(editor().getByRole('button', { name: 'Cholesterol measured' }))
    expect(adult(engine, 'khalid').tc).toBe(5.2)
    expect(editor().getByLabelText('Total cholesterol')).toBeInTheDocument()
    expect(editor().getByLabelText('HDL cholesterol')).toBeInTheDocument()
    expect(forecastPanel().getByText('Total and HDL cholesterol used')).toBeInTheDocument()
  })

  it('says whether the person is eligible for IFHAS', () => {
    open()
    pick('khalid')
    expect(editor().getByText(/IFHAS: eligible \(Emirati, 18–75\)\./)).toBeInTheDocument()
    fireEvent.click(editor().getByRole('button', { name: 'Emirati' }))
    expect(editor().getByText(/IFHAS: not eligible \(not Emirati\)/)).toBeInTheDocument()
    expect(forecastPanel().getByText('No IFHAS')).toBeInTheDocument()
  })

  it('a heart-risk alert is raised when risk reaches 20%, offers the doctor review, and is withdrawn when it falls', () => {
    const { engine, run } = open()
    run(() => engine.famAct('keep_amna'))
    pick('amna')
    slide(/Blood pressure \(top number\)/, 200)
    slide(/^Age$/, 70)
    fireEvent.click(editor().getByRole('button', { name: 'Smokes or vapes' }))
    fireEvent.click(editor().getByRole('button', { name: 'Diabetes' }))
    const f = engine.forecast('amna')
    expect(f.ok && f.cat.id).toBe('high')
    const fc = engine.state.fm!.alerts.find((a) => a.id === 'fc_amna')
    expect(fc?.state).toBe('open')
    expect(alertOf('fc_amna').getByText(/High heart risk: \d+% in 10 years/)).toBeInTheDocument()
    fireEvent.click(alertOf('fc_amna').getByRole('button', { name: /doctor review/i }))
    expect(engine.state.fm!.alerts.find((a) => a.id === 'fc_amna')?.state).toBe('done')
    expect(engine.state.fm!.status.amna).toBe('care')
  })

  it('"not now" on a heart-risk alert is respected: no second alert', () => {
    const { engine, run } = open()
    run(() => engine.famAct('keep_amna'))
    pick('amna')
    slide(/Blood pressure \(top number\)/, 200)
    slide(/^Age$/, 70)
    fireEvent.click(editor().getByRole('button', { name: 'Smokes or vapes' }))
    fireEvent.click(editor().getByRole('button', { name: 'Diabetes' }))
    const notNow = alertOf('fc_amna').getAllByRole('button').find((b) => /not now/i.test(b.textContent ?? ''))!
    fireEvent.click(notNow)
    expect(engine.state.fm!.fcNo.amna).toBe(true)
    expect(engine.state.fm!.alerts.find((a) => a.id === 'fc_amna')?.state).toBe('done')
    slide(/Blood pressure \(top number\)/, 190)
    expect(engine.state.fm!.alerts.filter((a) => a.id === 'fc_amna')).toHaveLength(1)
  })

  it('shows the engine’s warning next to a field: cholesterol not measured, and a value clamped to its range', () => {
    const { engine, run } = open()
    pick('khalid')
    expect(editor().getByText(/Cholesterol is not measured yet, so Noa uses BMI for the heart score\./)).toBeInTheDocument()
    run(() => { engine.setProfile('khalid', 'sbp', 500) })
    const sbp = editor().getByLabelText('Blood pressure (top number)')
    expect(sbp).toHaveAttribute('aria-describedby')
    expect(editor().getByText(/Blood pressure \(top number\): 500 is outside 90 to 200, so 200 is used\./)).toBeInTheDocument()
    run(() => { engine.setProfile('khalid', 'sbp', 140) })
    expect(editor().queryByText(/500 is outside/)).toBeNull()
  })

  it('warns when only one of total and HDL cholesterol is entered', () => {
    const { engine, run } = open()
    run(() => { const p = adult(engine, 'amna'); p.hdl = null; engine.famSelect('amna') })
    expect(editor().getByText(/Only one of total and HDL cholesterol is entered/)).toBeInTheDocument()
  })
})

describe('Noa Forecast panel', () => {
  it('shows the risk, category, heart age, the chart and the evidence, with BMI used while cholesterol is missing', () => {
    const { engine } = open()
    const f = engine.forecast('khalid')
    if (!f.ok) throw new Error('scored')
    expect(forecastPanel().getByText('Noa Forecast · Khalid')).toBeInTheDocument()
    expect(forecastPanel().getByText(pct(f.r))).toBeInTheDocument()
    expect(forecastPanel().getByText(new RegExp(`10-year heart and stroke risk · ${f.cat.id === 'mid' ? 'Moderate' : f.cat.id === 'high' ? 'High' : 'Low'}`))).toBeInTheDocument()
    expect(forecastPanel().getByText(/Heart age \d+ \(real age 47\) · Framingham 2008, without cholesterol/)).toBeInTheDocument()
    expect(forecastPanel().getByText('BMI used because cholesterol is not measured yet')).toBeInTheDocument()
    expect(forecastPanel().getByRole('list', { name: 'Missing' })).toHaveTextContent('Total cholesterol')
    expect(forecastPanel().getByRole('list', { name: 'Used' })).toHaveTextContent('BMI: 29')
    expect(forecastPanel().getByText(/A signal to act on, not a diagnosis/)).toBeInTheDocument()
    expect(forecastPanel().getByText(/not a validated forecast/)).toBeInTheDocument()
  })

  it('draws the 5-year chart as an image with a text alternative and the three lines', () => {
    const { engine } = open()
    const f = engine.forecast('khalid')
    if (!f.ok) throw new Error('scored')
    const img = forecastPanel().getByRole('img', { name: `Heart risk over the next 5 years: ${pct(f.r)} now, ${pct(f.r5)} if trends continue, ${pct(f.p5)} with the plan` })
    expect(img.querySelectorAll('polyline')).toHaveLength(2) // if trends continue, with the plan; the dot is today
    expect(img.querySelectorAll('circle')).toHaveLength(1)
    expect(img.querySelectorAll('rect').length).toBeGreaterThanOrEqual(2) // the bands
    expect(forecastPanel().getByText(`If today’s trends continue: ${pct(f.r5)}`)).toBeInTheDocument()
    expect(forecastPanel().getByText(`With the plan: ${pct(f.p5)}`)).toBeInTheDocument()
    expect(document.querySelectorAll('.fcpanel .tcp-sr li')).toHaveLength(6) // a row per year for a screen reader
    expect(forecastPanel().getByText('now', { selector: 'text' })).toBeInTheDocument()
    expect(forecastPanel().getByText('+5y', { selector: 'text' })).toBeInTheDocument()
  })

  it('uses the lab variant once cholesterol is measured', () => {
    open()
    pick('amna')
    expect(forecastPanel().getByText('Total and HDL cholesterol used')).toBeInTheDocument()
    expect(forecastPanel().getByText(/with cholesterol/)).toBeInTheDocument()
    expect(forecastPanel().queryByRole('list', { name: 'Missing' })).toBeNull()
  })

  it.each([
    ['hind', /Children are followed by well-child visits/],
    ['moza', /Has had a heart attack or stroke, so a risk score does not apply/],
    ['maitha', /valid from 30/],
    ['sultan', /valid from 30/],
  ])('%s is not scored, and says why', (id, why) => {
    open()
    pick(id)
    expect(forecastPanel().getByText('Not scored')).toBeInTheDocument()
    expect(within(document.querySelector('.fc-na') as HTMLElement).getByText(why)).toBeInTheDocument()
    expect(forecastPanel().queryByRole('img')).toBeNull()
  })

  it('a member over 74 is not scored: Saeed at 80 (the doctor decides)', () => {
    const { engine } = open()
    pick('saeed')
    expect(engine.forecast('saeed').ok).toBe(true)
    slide(/^Age$/, 80)
    expect(within(document.querySelector('.fc-na') as HTMLElement).getByText(/valid up to 74\. Their doctor decides/)).toBeInTheDocument()
    expect(document.querySelector('.tn[data-member="saeed"] em.fc')).toBeNull()
  })

  it('"had a heart attack or stroke" switches the score off for an adult', () => {
    open()
    pick('khalid')
    fireEvent.click(editor().getByRole('button', { name: 'Had a heart attack or stroke' }))
    expect(within(document.querySelector('.fc-na') as HTMLElement).getByText(/Has had a heart attack or stroke/)).toBeInTheDocument()
  })

  it('a child shows the visits done of 14 and the next one; weeks overdue to 0 calms the alert', () => {
    const { engine } = open()
    pick('hind')
    expect(forecastPanel().getByText(/7 of 14 well-child visits done/)).toBeInTheDocument()
    expect(forecastPanel().getByText(/Next: 18-month visit/)).toBeInTheDocument()
    slide(/Weeks overdue/, 0)
    expect(engine.state.fm!.status.hind).toBe('due')
  })

  it('lists what each agent collected, and the one next action', () => {
    open()
    pick('khalid')
    const sigs = within(document.querySelector('.sigs') as HTMLElement)
    expect(sigs.getAllByRole('listitem')).toHaveLength(7)
    expect(sigs.getByText('BP cuff via the InsideSync app')).toBeInTheDocument()
    expect(sigs.getByText('Cholesterol not measured yet: BMI used instead')).toBeInTheDocument()
    expect(sigs.getByText('Next action')).toBeInTheDocument()
    expect(sigs.getByText('Measure cholesterol at the next check')).toBeInTheDocument()
    pick('hind')
    const kid = within(document.querySelector('.sigs') as HTMLElement)
    expect(kid.getAllByRole('listitem')).toHaveLength(3)
    expect(kid.getByText('Visits done: 7 of 14')).toBeInTheDocument()
  })

  it('a heart line appears on an open alert of someone above low risk, and says when cholesterol is missing', () => {
    const { engine } = open()
    const f = engine.forecast('khalid')
    if (!f.ok || f.cat.id === 'low') return
    expect(alertOf('khalid').getByText(new RegExp(`heart risk ${pct(f.r)} now → ${pct(f.r5)} in 5 years if trends continue \\(estimate before cholesterol is measured\\)`))).toBeInTheDocument()
  })
})

describe('Y1 on Khalid’s family alert', () => {
  const region = () => within(screen.getByRole('region', { name: 'Khalid’s moment, told twice' }))

  it('tells the moment twice with his REAL family history, and books with one tap through the engine', () => {
    const { engine } = open()
    fireEvent.click(alertOf('khalid').getByRole('button', { name: 'Show Khalid’s moment: before and with Noa' }))
    const m = region()
    expect(m.getByText('Illustrative story, not a prediction')).toBeInTheDocument()
    fireEvent.click(m.getByRole('button', { name: 'Before Noa' }))
    expect(m.getByText(/Years later: a first heart or stroke problem/)).toBeInTheDocument()
    fireEvent.click(m.getByRole('button', { name: 'With Noa' }))
    // the history in the message is the engine's own text for Khalid
    expect(m.getByText(/Mother: stroke and atrial fibrillation at 77 · father \(late Abdullah\): heart attack at 62/)).toBeInTheDocument()
    expect(m.queryByText(/type 2 diabetes/i)).toBeNull()
    expect(engine.state.fm!.booked.khalid).toBeUndefined()
    fireEvent.click(m.getByRole('button', { name: 'Book it · one tap' }))
    expect(engine.state.fm!.booked.khalid).toBeTruthy()
    expect(engine.state.fm!.status.khalid).toBe('booked')
    expect(engine.state.fm!.badges).toContain('first')
    expect(m.getByText(/^Booked: Saturday 09:30/)).toBeInTheDocument()
  })

  it('says so when Khalid chose not now', () => {
    open()
    fireEvent.click(alertOf('khalid').getByRole('button', { name: 'Not now' }))
    fireEvent.click(alertOf('khalid').getByRole('button', { name: /Show Khalid’s moment/ }))
    expect(region().queryByRole('button', { name: 'Book it · one tap' })).toBeNull()
    expect(region().getByText(/Khalid said not now/)).toBeInTheDocument()
  })
})

describe('family results and the doctor queue', () => {
  const ALL = ['moza_ok', 'book_hind', 'book_maitha', 'book_khalid', 'book_amna', 'book_saeed', 'book_sultan']
  const toResults = (ids = ALL) => {
    const m = open()
    m.run(() => { for (const id of ids) m.engine.famAct(id) })
    advanceTo(m.engine, 'famresult')
    return m
  }
  const setRes = (label: RegExp, v: number) => fireEvent.change(card().getByLabelText(label), { target: { value: String(v) } })

  it('has nine result inputs when everyone is booked, each routed by its threshold when sent', () => {
    const { engine } = toResults()
    expect(card().getAllByRole('slider')).toHaveLength(9)
    setRes(/Khalid: HbA1c/, 7.4)
    setRes(/Amna: HbA1c/, 5.2)
    setRes(/Maitha: HbA1c/, 5.4)
    setRes(/Saeed: urine albumin/, 4.2)
    setRes(/Sultan: blood pressure/, 126)
    fireEvent.click(card().getByRole('button', { name: 'Send the results' }))
    const R = engine.state.fm!.routes
    expect(R.khalid_a1c.b).toBe('refer')
    expect(R.amna_a1c.b).toBe('ok')
    expect(R.maitha_a1c.b).toBe('ok')
    expect(R.hind.b).toBe('refer') // 2 words at 18 months is below 3
    expect(R.saeed_acr.b).toBe('refer')
    expect(R.sultan_sbp.b).toBe('ok')
    expect(R.khalid_tc.used).toBe(true)
    expect(engine.state.fm!.conn).toEqual(expect.arrayContaining(['C5']))
    expect(card().getAllByText(/→ /).length).toBeGreaterThanOrEqual(3)
    // a result that only feeds a heart risk is not shown as a finding
    expect(card().queryByText(/Khalid: HDL/)).toBeInTheDocument() // the slider label stays
    expect(card().queryAllByText(/Khalid: HDL.* → /)).toHaveLength(0)
    const q = within(screen.getByRole('region', { name: 'The doctor’s review queue' }))
    expect(q.getAllByRole('button', { name: 'Approve' }).length).toBeGreaterThanOrEqual(3)
    fireEvent.click(q.getAllByRole('button', { name: 'Change' })[0])
    expect(q.getByText(/The doctor is changing the plan/)).toBeInTheDocument()
  })

  it('Khalid’s real cholesterol and blood pressure feed Noa Forecast, and 7.5 or more adds the family cholesterol connection', () => {
    const { engine } = toResults()
    const before = engine.forecast('khalid')
    setRes(/Khalid: total cholesterol/, 8)
    setRes(/Khalid: HDL/, 0.8)
    fireEvent.click(card().getByRole('button', { name: 'Send the results' }))
    expect(adult(engine, 'khalid').tc).toBe(8)
    expect(engine.state.fm!.conn).toContain('C4')
    const after = engine.forecast('khalid')
    if (!before.ok || !after.ok) throw new Error('scored')
    expect(after.lab).toBe(true)
    expect(card().getByText('Noa Forecast · Khalid, with his real cholesterol')).toBeInTheDocument()
    expect(card().getByText(new RegExp(`10-year heart risk ${pct(after.r)}`))).toBeInTheDocument()
    expect(document.querySelectorAll('.conn.new').length).toBeGreaterThanOrEqual(1)
  })

  it('healthy results go to the passport and nothing is queued', () => {
    const { engine } = toResults()
    act(() => {
      engine.setFamResult('hind', 12); engine.setFamResult('maitha_a1c', 5.2); engine.setFamResult('khalid_a1c', 5.2); engine.setFamResult('khalid_tc', 5.2)
      engine.setFamResult('khalid_hdl', 1.4); engine.setFamResult('khalid_sbp', 130); engine.setFamResult('amna_a1c', 5.2); engine.setFamResult('saeed_acr', 1); engine.setFamResult('sultan_sbp', 120)
    })
    fireEvent.click(card().getByRole('button', { name: 'Send the results' }))
    expect(Object.values(engine.state.fm!.routes).every((x) => x.b === 'ok')).toBe(true)
    expect(screen.queryByRole('region', { name: 'The doctor’s review queue' })).toBeNull()
    expect(engine.state.fm!.conn).not.toContain('C4')
  })

  it('a result outside its range is clamped and the engine’s warning shows under the slider', () => {
    const { run, engine } = toResults(['book_khalid'])
    expect(card().getAllByRole('slider')).toHaveLength(4)
    run(() => { engine.setFamResult('khalid_tc', 99) })
    expect(card().getByText(/Khalid: total cholesterol: 99 is outside 3 to 10, so 10 is used\./)).toBeInTheDocument()
  })

  it('with no visits booked there are no results to enter', () => {
    const { run, engine } = open()
    run(() => { for (const id of ['no_hind', 'no_maitha', 'no_khalid', 'keep_amna', 'no_saeed', 'no_sultan', 'moza_ok']) engine.famAct(id) })
    run(() => { engine.S.done[0] = true; engine.famSelect('moza') })
    advanceTo(engine, 'famresult')
    expect(card().getByText('No results')).toBeInTheDocument()
  })
})
