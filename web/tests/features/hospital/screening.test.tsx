import { fireEvent, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import i18n from '@/i18n'
import ar from '@/locales/ar/data/screening.json'
import en from '@/locales/en/data/screening.json'
import { ReferralsPage } from '@/features/hospital/referrals/ReferralsPage'
import { ReviewPage } from '@/features/hospital/review/ReviewPage'
import { mockCanvas, mockLayout, mockRaf } from '../../canvas/fakeCtx'
import { renderWithProviders } from '../../helpers/renderWithProviders'

const push = vi.fn()
vi.mock('@/app/navigation', () => ({ usePathname: () => '/hospital/review/', useRouter: () => ({ push, replace: vi.fn() }) }))

const opts = { who: 'family' as const }
const spans = () => Array.from(document.querySelector('main')!.children).map((c) => c.className.match(/c\d+/)?.[0])
const headings = () => Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)

beforeEach(() => {
  mockCanvas()
  mockLayout()
  mockRaf()
  push.mockClear()
})

test('English and Arabic screening data have the same shape and the same non-text values', () => {
  const shape = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(shape) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v === 'string' ? 's' : v
  const keepIds = (j: typeof en) => [j.screening.cases.map((c) => [c.id, c.code, c.stepTone, c.due]), j.screening.referrals.items.map((r) => r.id), j.screening.review.items.map((r) => [r.id, r.tone, r.color])]
  expect(shape(ar)).toEqual(shape(en))
  expect(keepIds(ar)).toEqual(keepIds(en))
})

describe('review', () => {
  const ready = () => screen.findByText('Waiting for doctor review')

  test('lists three results beside the summary and the reasons, in span order', async () => {
    renderWithProviders(<ReviewPage />, opts)
    await ready()
    expect(headings()).toEqual(['Waiting for doctor review', 'Summary Noa prepared', 'Noa suggests · the doctor decides', 'Why this is faster'])
    expect(spans()).toEqual(['c4', 'c5', 'c3'])
    expect(document.querySelectorAll('#revList .msg')).toHaveLength(3)
    expect(document.querySelectorAll('.why li')).toHaveLength(5)
    expect(screen.getByText('3 results')).toBeInTheDocument()
    expect(screen.getByText('Deadline to confirm: 7 days from the result. Overdue cases move to the coordinator.')).toBeInTheDocument()
    expect(document.querySelectorAll('#revCard .packet > div')).toHaveLength(7)
    expect(document.querySelectorAll('#revCard .check li')).toHaveLength(4)
    expect(screen.getByText('Can he fast in Ramadan?')).toBeInTheDocument()
  })

  test('"Back to Overview" returns to the Overview page', async () => {
    renderWithProviders(<ReviewPage />, opts)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Overview' }))
    expect(push).toHaveBeenCalledWith('/hospital/overview')
  })

  test('selecting another result swaps the summary for the hint; selecting Khalid brings it back', async () => {
    renderWithProviders(<ReviewPage />, opts)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: /Layla Hassan/ }))
    expect(screen.getByRole('button', { name: /Layla Hassan/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText("Open Khalid's case to see the full summary used in the demo.")).toBeInTheDocument()
    expect(document.querySelector('#revCard .packet')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Khalid Al Mansoori/ }))
    expect(document.querySelector('#revCard .packet')).not.toBeNull()
  })

  test('"Confirm and send plan" toasts once, then shows the sent note and a Confirmed pill', async () => {
    renderWithProviders(<ReviewPage />, opts)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(screen.getByRole('status')).toHaveTextContent('Saved as a draft. Nothing sent.')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and send plan' }))
    expect(screen.getByRole('status')).toHaveTextContent('Plan sent. Referrals are with the clinics and Khalid has been told in Arabic.')
    expect(screen.queryByRole('button', { name: 'Confirm and send plan' })).toBeNull()
    expect(screen.getByText(/Plan sent 12 Nov/)).toBeInTheDocument()
    expect(within(document.querySelector('#revList')!).getByText('Confirmed')).toBeInTheDocument()
  })
})

describe('referrals', () => {
  const ready = () => screen.findByText('Referral inbox')

  test('shows the inbox of four referrals and the first one in detail', async () => {
    renderWithProviders(<ReferralsPage />, opts)
    await ready()
    expect(spans()).toEqual(['c5', 'c7'])
    expect(document.querySelectorAll('#refList .msg')).toHaveLength(4)
    expect(Array.from(document.querySelectorAll('#refList .pill')).map((p) => p.textContent)).toEqual(['New', 'Re-referral', 'New', 'Handover'])
    expect(screen.getByText('A referral not accepted within 2 working days goes back to the coordinator with the reason.')).toBeInTheDocument()
    expect(within(document.querySelector('#refCard')!).getByRole('heading', { name: 'Khalid Al Mansoori, 46' })).toBeInTheDocument()
    const labels = Array.from(document.querySelectorAll('#refCard .packet > div > span')).map((s) => s.textContent)
    expect(labels).toEqual(['To', 'From', 'Why', 'Understood', 'Preferences', 'Consent'])
    expect(screen.getByText('Tue 18:30 with an Arabic-speaking educator')).toBeInTheDocument()
  })

  test('selecting a referral shows its detail', async () => {
    renderWithProviders(<ReferralsPage />, opts)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: /Ravi Menon/ }))
    expect(within(document.querySelector('#refCard')!).getByRole('heading', { name: 'Ravi Menon, 57' })).toBeInTheDocument()
    expect(screen.getByText('Dr Fatima Al Ali, Sat 10:00')).toBeInTheDocument()
  })

  test('Accept and book decides once: toast, note and an Accepted pill; each referral keeps its own outcome', async () => {
    renderWithProviders(<ReferralsPage />, opts)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Accept and book' }))
    expect(screen.getByRole('status')).toHaveTextContent('Accepted · booking deadline started')
    expect(screen.getByText('Accepted. You own the next step. Noa tells the patient and books the slot.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept and book' })).toBeNull()
    expect(within(document.querySelectorAll<HTMLElement>('#refList .msg')[0]).getByText('Accepted')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Ahmed Rashid/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Decline with a reason' }))
    expect(screen.getByRole('status')).toHaveTextContent('Declined · the coordinator has it today')
    expect(screen.getByText('Declined with a reason. Back to the coordinator today.')).toBeInTheDocument()
    expect(within(document.querySelectorAll<HTMLElement>('#refList .msg')[1]).getByText('Declined')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Priya Nair/ }))
    expect(screen.getByRole('button', { name: 'Accept and book' })).toBeInTheDocument()
  })
})

describe('Arabic', () => {
  afterEach(async () => { await i18n.changeLanguage('en') })

  test('the review and the referral inbox render in Arabic with the same structure', async () => {
    await i18n.changeLanguage('ar')
    const review = renderWithProviders(<ReviewPage />, opts)
    await screen.findByText('بانتظار مراجعة الطبيب')
    expect(document.querySelectorAll('#revList .msg')).toHaveLength(3)
    expect(screen.getByText('3 نتائج')).toBeInTheDocument()
    review.unmount()
    renderWithProviders(<ReferralsPage />, opts)
    await screen.findByText('صندوق الإحالات')
    expect(document.querySelectorAll('#refList .msg')).toHaveLength(4)
  })
})
