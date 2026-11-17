import { act, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { PatientsPage } from '@/features/hospital/patients/PatientsPage'
import { PAGE_REGISTRY } from '@/features/registry'
import i18n from '@/i18n'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/hospital/patients/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock('@/state/LiveIncident', () => ({
  useLiveIncident: () => ({
    live: false, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
    start: async () => {}, reset: async () => {}, checkin: async () => {}, act: async () => {}, recover: async () => {}, recovery: undefined,
  }),
}))

window.scrollTo = vi.fn()
const at = (query = '') => renderWithProviders(<MemoryRouter initialEntries={[`/hospital/patients${query}`]}><PatientsPage /></MemoryRouter>, { who: 'family' })
const steps = () => within(screen.getByRole('list', { name: 'Steps of the patient record' }))

test('hospital/patients is a routed page', () => {
  expect(PAGE_REGISTRY['hospital/patients']).toBe(PatientsPage)
})

describe('list', () => {
  test('shows four KPIs and eight patients, Moza first', async () => {
    at()
    expect(await screen.findByText('Moza Al Hammadi, 78')).toBeInTheDocument()
    expect(document.querySelectorAll('#ptKpis .kpi')).toHaveLength(4)
    const rows = Array.from(document.querySelectorAll('#ptRows [data-pt]')).map((b) => (b as HTMLElement).dataset.pt)
    expect(rows).toEqual(['moza', 'joseph', 'khalid', 'khamis', 'noura', 'robert', 'ahmed', 'layla'])
    expect(screen.getByText('8 of 8')).toBeInTheDocument()
  })

  test('the filters narrow the list and the count follows', async () => {
    at()
    await screen.findByText('Moza Al Hammadi, 78')
    fireEvent.click(screen.getByRole('button', { name: 'Needs action' }))
    expect(screen.getByText('4 of 8')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Discharged' }))
    expect(screen.getByText('3 of 8')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Outpatient' }))
    expect(screen.getByText('5 of 8')).toBeInTheDocument()
  })

  test('search matches name, condition or area', async () => {
    at()
    await screen.findByText('Moza Al Hammadi, 78')
    fireEvent.change(screen.getByLabelText('Search patients'), { target: { value: 'baniyas' } })
    expect(screen.getByText('Ahmed Rashid, 52')).toBeInTheDocument()
    expect(screen.queryByText('Moza Al Hammadi, 78')).toBeNull()
  })
})

describe('record', () => {
  test('?patient=moza opens her clinical summary and the six steps; the query decides the step', async () => {
    at('?patient=moza&step=sum')
    expect(await screen.findByText('Clinical summary')).toBeInTheDocument()
    expect(steps().getAllByRole('button').map((b) => b.textContent)).toEqual(['1Summary', '2History', '3Screening', '4Results', '5Treatment', '6Follow-up'])
    expect(screen.getByText('Possible complications')).toBeInTheDocument()
    expect(screen.getByText('Her record')).toBeInTheDocument()
  })

  test('stepping through the record shows each step of the case', async () => {
    at('?patient=moza&step=sum')
    await screen.findByText('Clinical summary')
    fireEvent.click(steps().getByRole('button', { name: /History/ }))
    expect(await screen.findByText('Her care across Abu Dhabi')).toBeInTheDocument()
    fireEvent.click(steps().getByRole('button', { name: /Screening/ }))
    expect(await screen.findByText('Was the loop closed?')).toBeInTheDocument()
    fireEvent.click(steps().getByRole('button', { name: /Results/ }))
    expect(await screen.findByText('Her tests and results')).toBeInTheDocument()
    fireEvent.click(steps().getByRole('button', { name: /Follow-up/ }))
    expect(await screen.findByText('What needs attention')).toBeInTheDocument()
  })

  test('a summary item opens its chart entry, with related entries', async () => {
    at('?patient=moza&step=sum')
    await screen.findByText('Clinical summary')
    fireEvent.click(screen.getAllByRole('button', { name: 'Tenecteplase · 15 Oct 02:52' })[0])
    const sheet = await screen.findByRole('dialog', { hidden: true })
    expect(sheet).toHaveTextContent('Tenecteplase 0.25 mg/kg')
    expect(sheet).toHaveTextContent('Door to needle')
    expect(sheet).toHaveTextContent('For the patient')
  })

  test('Whole case, start to finish walks all 23 entries from the first', async () => {
    at('?patient=moza&step=sum')
    await screen.findByText('Clinical summary')
    fireEvent.click(screen.getAllByRole('button', { name: 'Whole case, start to finish' })[0])
    const sheet = await screen.findByRole('dialog', { hidden: true })
    expect(sheet).toHaveTextContent('1 / 23')
    expect(sheet).toHaveTextContent('Corniche Eye Clinic')
  })

  test('notes that are not shared can be requested, and the request shows as waiting', async () => {
    at('?patient=moza&step=his')
    await screen.findByText('Her care across Abu Dhabi')
    fireEvent.click(screen.getByText('Dehydration during a heatwave'))
    fireEvent.click(screen.getByRole('button', { name: 'Request full notes from Capital General Hospital' }))
    expect(await screen.findByText('Requested · waiting for a reply')).toBeInTheDocument()
  })

  test('Malaffi is always labelled as a planned link', async () => {
    at('?patient=moza&step=his')
    expect(await screen.findByText(/Malaffi is a planned link/)).toBeInTheDocument()
  })

  test('another patient has the short record, in his wording', async () => {
    at('?patient=khalid&step=his')
    expect(await screen.findByText('His care across Abu Dhabi')).toBeInTheDocument()
    expect(screen.getByText('His record')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Whole case, start to finish' })).toBeNull()
  })

  test('Khalid\'s results step holds the results waiting for review', async () => {
    at('?patient=khalid&step=res')
    expect(await screen.findByText('Waiting for doctor review')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and send plan' }))
    expect(await screen.findByText(/Plan sent 12 Nov/)).toBeInTheDocument()
  })

  test('a follow-up task can be ticked and added; Mark reviewed clears the flag in the list', async () => {
    at('?patient=moza&step=fu')
    await screen.findByText('What needs attention')
    const tick = screen.getByRole('checkbox', { name: 'Done: Review perindopril dose' })
    fireEvent.click(tick)
    expect(tick).toBeChecked()
    fireEvent.change(screen.getByLabelText('Add a follow-up task'), { target: { value: 'Check ankles' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText('Check ankles')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }))
    fireEvent.click(screen.getByRole('button', { name: /All patient records/ }))
    await screen.findByText('Patient records', { selector: 'h2' })
    expect(document.querySelectorAll('#ptKpis .v')[1]).toHaveTextContent('3')
  })

  test('in Arabic the record reads right to left with her wording', async () => {
    await act(() => i18n.changeLanguage('ar'))
    try {
      at('?patient=moza&step=sum')
      expect(await screen.findByText('الملخص السريري')).toBeInTheDocument()
    } finally {
      await act(() => i18n.changeLanguage('en'))
    }
  })
})
