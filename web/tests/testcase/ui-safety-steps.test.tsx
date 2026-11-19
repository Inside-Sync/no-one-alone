import { act, fireEvent, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import i18n from '@/i18n'
import { REPORT } from '@/features/testcase/data'
import { make, text } from './helpers'
import { advanceTo, drive, renderHarness, renderKind } from './uiSafetyHelpers'

afterEach(() => { vi.unstubAllGlobals(); void i18n.changeLanguage('en') })

const options = () => screen.getAllByRole('button').filter((b) => b.className.includes('opt'))

describe('tl and btn', () => {
  test('the timeline reveals one update per press and ends with the done strip', () => {
    const e = make('stroke')
    advanceTo(e, 'tl')
    renderKind(e)
    const n = e.items(e.cur()).length
    expect(document.querySelectorAll('.tl li.future')).toHaveLength(n)
    fireEvent.click(screen.getByRole('button', { name: /Start/ }))
    expect(e.S.prog[e.S.step]).toBe(1)
    expect(document.querySelectorAll('.tl li.future')).toHaveLength(n - 1)
    for (let i = 1; i < n; i++) fireEvent.click(screen.getByRole('button', { name: /Next update/ }))
    expect(e.S.done[e.S.step]).toBe(true)
    expect(screen.queryByRole('button', { name: /Next update/ })).toBeNull()
    expect(screen.getByText(text(e, { k: e.cur().done! }))).toBeInTheDocument()
  })

  test('the care-team button records the action once', () => {
    const e = make('stroke')
    advanceTo(e, 'btn')
    renderKind(e)
    const btn = screen.getByRole('button', { name: text(e, { k: e.cur().btn! }) })
    fireEvent.click(btn)
    expect(e.S.done[e.S.step]).toBe(true)
    expect(screen.queryByRole('button', { name: text(e, { k: e.cur().btn! }) })).toBeNull()
    expect(screen.getByText(text(e, { k: e.cur().done! }))).toBeInTheDocument()
  })
})

describe('teach-back', () => {
  test('a live explanation swaps the Prepared text pill for AI-written, in English and Arabic', async () => {
    const e = make('stroke')
    advanceTo(e, 'teach')
    renderKind(e)
    expect(screen.getByText('Prepared text')).toBeInTheDocument()
    expect(screen.queryByText('AI-written')).toBeNull()
    act(() => { e.applyLiveExplain({ explain: 'Live', simpler: 's' }, { tkey: e.teachKey()!, lang: e.S.lang }) })
    expect(screen.queryByText('Prepared text')).toBeNull()
    expect(screen.getByText('AI-written')).toBeInTheDocument()
    await act(async () => { await i18n.changeLanguage('ar') })
    expect(screen.getByText('كتبه الذكاء الاصطناعي')).toBeInTheDocument()
  })

  test('wrong answer: gentle feedback and simpler words; right answer passes; language switch; plan', () => {
    const e = make('stroke')
    advanceTo(e, 'teach')
    const run = drive(e)
    renderKind(e)
    const ex = e.curExplain()!
    expect(screen.getByText(text(e, ex.explain))).toBeInTheDocument()
    expect(screen.getByText('Prepared text')).toBeInTheDocument()
    fireEvent.click(options()[0])
    expect(e.S.tbWrong).toBe(0)
    expect(options()[0].className).toContain('wrong')
    expect(screen.getByText(new RegExp(text(e, (ex.wrong as never[])[0]).slice(0, 20)))).toBeInTheDocument()
    expect(screen.queryByText('Teach-back passed: Noa checks the person understood')).toBeNull()
    fireEvent.click(options()[1])
    expect(e.S.tb).toBe('ok')
    expect(options()[1].className).toContain('right')
    expect(screen.getByText('Teach-back passed: Noa checks the person understood')).toBeInTheDocument()
    expect(options().every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
    // simpler words on request
    expect(screen.queryByText(text(e, ex.simpler))).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Simpler words' }))
    expect(screen.getByText(text(e, ex.simpler))).toBeInTheDocument()
    // who sees the plan, then send it
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(2)
    fireEvent.click(boxes[1])
    expect(e.S.fam.f2).toBe(false)
    run(() => undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Send the plan home' }))
    expect(e.S.planSent).toBe(true)
    expect(e.S.done[e.S.step]).toBe(true)
    expect(screen.getByText('Plan sent to the phone app')).toBeInTheDocument()
    expect(boxes.every((b) => (b as HTMLInputElement).disabled)).toBe(true)
  })

  test('the EN/AR switch changes the engine language: right-to-left text, the Arabic set, a fresh question', () => {
    const e = make('stroke')
    advanceTo(e, 'teach')
    renderKind(e)
    const group = screen.getByRole('group', { name: 'Language' })
    expect(within(group).getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(group).getByRole('button', { name: 'العربية' }))
    expect(e.S.lang).toBe('ar')
    const ex = e.curExplain()!
    expect(ex.lang).toBe('ar')
    const box = screen.getAllByText(text(e, ex.explain))[0].closest('.noamsg')!
    expect(box).toHaveAttribute('dir', 'rtl')
    expect(options()[0]).toHaveAttribute('lang', 'ar')
    fireEvent.click(within(group).getByRole('button', { name: 'English' }))
    expect(e.S.lang).toBe('en')
  })

  test('read aloud uses speechSynthesis in the teach language, and stops on unmount', () => {
    const spoken: { text: string; lang: string }[] = []
    const cancel = vi.fn()
    class Utter { lang = ''; rate = 1; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(public text: string) {} }
    vi.stubGlobal('SpeechSynthesisUtterance', Utter)
    vi.stubGlobal('speechSynthesis', { cancel, speak: (u: Utter) => spoken.push({ text: u.text, lang: u.lang }) })
    const e = make('stroke')
    advanceTo(e, 'teach')
    const { unmount } = renderKind(e)
    fireEvent.click(screen.getByRole('button', { name: 'Listen' }))
    expect(spoken).toHaveLength(1)
    expect(spoken[0].lang).toBe('en-GB')
    expect(spoken[0].text).toBe(text(e, e.curExplain()!.explain))
    expect(screen.getByRole('button', { name: /Stop/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'العربية' }))
    fireEvent.click(screen.getByRole('button', { name: 'Listen' }))
    expect(spoken[1].lang).toBe('ar-AE')
    cancel.mockClear()
    unmount()
    expect(cancel).toHaveBeenCalled()
  })

  test('without speechSynthesis there is no Listen button', () => {
    const e = make('fall')
    advanceTo(e, 'teach')
    renderKind(e)
    expect(screen.queryByRole('button', { name: 'Listen' })).toBeNull()
  })
})

describe('recheck, daily, accept', () => {
  test('recheck: a low value asks again, a second low value escalates to 998, a recovered value finishes', () => {
    const e = make('hypo')
    advanceTo(e, 'recheck')
    const { unmount } = renderKind(e)
    const slider = screen.getByLabelText(/Glucose at/)
    fireEvent.change(slider, { target: { value: '3.2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }))
    expect(screen.getByText('Still low')).toBeInTheDocument()
    expect(screen.getByText(/3.2 mmol\/L/, { selector: 'span' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Glucose at/), { target: { value: '5.1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }))
    expect(e.S.done[e.S.step]).toBe(true)
    expect(screen.getByText('Recovered: 5.1 mmol/L')).toBeInTheDocument()
    unmount()

    const e2 = make('hypo')
    advanceTo(e2, 'recheck')
    act(() => { e2.setRecheckVal(3.1); e2.recheck(); e2.recheck() })
    expect(e2.S.dec?.rule).toBe('R6')
    expect(e2.S.path).toBe('hypo_em')
  })

  test('daily: usual speech, then an off-target reading alerts the clinician; accept acts on it', () => {
    const e = make('stroke')
    advanceTo(e, 'daily')
    const run = drive(e)
    renderKind(e)
    expect(screen.getByText(/Good morning, Moza/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /usual speech/ }))
    expect(e.S.speech.daily?.lvl).not.toBe('red')
    fireEvent.change(screen.getByLabelText(/Morning blood pressure/), { target: { value: '150' } })
    expect(screen.getByText(/^Target: /)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Send today’s reading' }))
    expect(e.S.daily.alert).toBe(true)
    expect(screen.getByText(/Noa Navigator: send to /)).toBeInTheDocument()
    expect(e.S.done[e.S.step]).toBe(true)
    run(() => e.next())
    expect(e.cur().kind).toBe('accept')
    fireEvent.click(screen.getByRole('button', { name: 'Accept and act' }))
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(e.S.done[e.S.step]).toBe(true)
  })

  test('daily: slurred speech shows the emergency note; an on-target reading raises no alert', () => {
    const e = make('stroke')
    advanceTo(e, 'daily')
    renderKind(e)
    fireEvent.click(screen.getByRole('button', { name: 'Use slurred speech' }))
    expect(screen.getByText(/failed speech check here would start the emergency path again/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Morning blood pressure/), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send today’s reading' }))
    expect(screen.getByText('On target · no alert')).toBeInTheDocument()
    expect(e.S.daily.alert).toBe(false)
  })

  test('accept with nothing to act on says so', () => {
    const e = make('stroke')
    advanceTo(e, 'daily')
    const run = drive(e)
    run(() => { e.sampleSpeech('usual'); e.setDailyVal(120); e.sendDaily() })
    run(() => e.next())
    renderKind(e)
    expect(e.cur().kind).toBe('accept')
    expect(screen.getByText('Nothing to act on')).toBeInTheDocument()
  })
})

describe('report (every case)', () => {
  test.each(['stroke', 'fall', 'hypo', 'hf', 'ifhas', 'wellchild', 'family'] as const)('%s: send the report, then its figures show', (id) => {
    const e = make(id)
    advanceTo(e, 'report')
    renderKind(e)
    const rep = REPORT[e.meta().report]
    expect(screen.queryByText(/Fictional figures/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Send the monthly report' }))
    expect(e.S.done[e.S.step]).toBe(true)
    expect(e.db.reports).toHaveLength(1)
    expect(screen.getByText('Report received by the Department')).toBeInTheDocument()
    const kpis = screen.getByRole('region', { name: 'Report figures' })
    expect(within(kpis).getAllByText(/.+/, { selector: '.kpi .v' })).toHaveLength(rep.kpi.length)
    expect(within(kpis).getByText(text(e, { k: rep.kpi[0].label }))).toBeInTheDocument()
    expect(within(kpis).getByText(text(e, { k: rep.kpi[0].value }))).toBeInTheDocument()
    expect(screen.getByText(/Fictional figures for the demo/)).toBeInTheDocument()
  })
})

describe('phone and family web app', () => {
  test('stroke: quiet at first, rings with the question, then help is coming and the family hears', () => {
    const e = make('stroke')
    const run = drive(e)
    renderHarness(e)
    const phone = () => within(document.getElementById('phone')!)
    expect(phone().getByText(/Night · asleep/)).toBeInTheDocument()
    expect(phone().getByRole('heading', { name: 'Moza' })).toBeInTheDocument()
    expect(within(document.getElementById('web')!).getByText(/hear from Noa only if something happens/)).toBeInTheDocument()
    run(() => e.play())
    expect(phone().getByText(/Noa Voice · phone rings/)).toBeInTheDocument()
    expect(phone().getByText('Speech').closest('.tile')).toHaveTextContent('…')
    run(() => e.sampleSpeech('slurred'))
    run(() => e.answer('none'))
    expect(phone().getByText('Help is coming')).toBeInTheDocument()
    expect(phone().getByRole('button', { name: /Call 998/ })).toHaveAttribute('aria-disabled', 'true')
    expect(phone().getByText('Speech').closest('.tile')).toHaveTextContent('Changed')
    expect(phone().getByText('Heart rate').closest('.tile')).toHaveTextContent('bpm')
    const web = within(document.getElementById('web')!)
    expect(web.getByText('Family circle · updates')).toBeInTheDocument()
    expect(web.getByText('emergencies')).toBeInTheDocument()
    expect(web.getByText('family circle')).toBeInTheDocument()
  })

  test('the phone follows the step: teach shows Noa Coach, the report step shows "in care"', () => {
    const e = make('stroke')
    advanceTo(e, 'teach')
    const run = drive(e)
    renderHarness(e)
    expect(within(document.getElementById('phone')!).getByText('Noa Coach')).toBeInTheDocument()
    run(() => advanceTo(e, 'report'))
    expect(within(document.getElementById('phone')!).getByText('You’re in care')).toBeInTheDocument()
  })

  test('fall at home gets a gentle phone message', () => {
    const e = make('fall')
    const run = drive(e)
    renderHarness(e)
    run(() => e.play())
    run(() => e.sampleSpeech('usual'))
    run(() => e.answer('ok'))
    expect(e.S.dec?.path).toBe('fall_minor')
    expect(within(document.getElementById('phone')!).getByText(/get you up slowly/)).toBeInTheDocument()
  })
})

describe('Arabic chrome', () => {
  test('labels, buttons and units come from tcSafety in Arabic', async () => {
    await act(async () => { await i18n.changeLanguage('ar') })
    const e = make('stroke')
    renderKind(e)
    expect(screen.getByRole('button', { name: /تشغيل/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/نبض القلب من/)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'الحركة' })).toBeInTheDocument()
  })
})
