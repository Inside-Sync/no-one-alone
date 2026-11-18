import { fireEvent, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { SearchBox } from '@/components/shell/SearchBox'
import { renderWithProviders } from '../helpers/renderWithProviders'

let path = '/hospital/overview'
const push = vi.fn()
vi.mock('@/app/navigation', () => ({ usePathname: () => path, useRouter: () => ({ push, replace: vi.fn() }) }))

beforeEach(() => { push.mockClear() })

async function pick(text: string, result: RegExp) {
  renderWithProviders(<SearchBox />)
  const box = screen.getByRole('combobox', { name: 'Search' })
  fireEvent.focus(box)
  fireEvent.change(box, { target: { value: text } })
  const [option] = await screen.findAllByText(result)
  fireEvent.mouseDown(option)
}

test('in the Hospital view a person opens their patient record', async () => {
  path = '/hospital/overview'
  await pick('moza', /Moza Al Hammadi/)
  expect(push).toHaveBeenCalledWith('/hospital/patients?patient=moza&step=sum')
  expect(screen.queryByText('Person')).not.toBeInTheDocument()
})

test('in the Hospital view other patients are found too', async () => {
  path = '/hospital/patients'
  await pick('khalid', /Khalid Al Mansoori/)
  expect(push).toHaveBeenCalledWith('/hospital/patients?patient=khalid&step=sum')
})

test('outside the Hospital view a person still opens her own app', async () => {
  path = '/individual/me'
  await pick('moza', /Moza Al Hammadi/)
  expect(push).toHaveBeenCalledWith('/individual/health')
})
