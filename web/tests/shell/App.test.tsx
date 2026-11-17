import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { App } from '@/app/App'

const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
const title = (text: string) => screen.findByText(text, { selector: '#pgTitle' })

beforeEach(() => { sessionStorage.clear(); localStorage.clear() })

test("the root opens Moza's own app on My day", async () => {
  at('/')
  await title('Hello, Moza')
})

test.each([
  ['/individual/home', 'Hello, Moza'],
  ['/individual/forecast', 'Hello, Moza'],
  ['/individual/recovery', 'Hello, Moza'],
  ['/individual/privacy', 'Hello, Moza'],
  ['/individual', 'Hello, Moza'],
  ['/hospital/panel', 'Patient records'],
  ['/hospital/patient', 'Patient records'],
  ['/hospital/demand', 'Overview · Corniche Stroke Centre'],
  ['/hospital/discharge', 'Overview · Corniche Stroke Centre'],
  ['/hospital/loop', 'Overview · Corniche Stroke Centre'],
  ['/hospital', 'Overview · Corniche Stroke Centre'],
  ['/community/community', 'Population health · Abu Dhabi'],
  ['/community/watch', 'Programme signals · Abu Dhabi'],
  ['/community/anything', 'Population health · Abu Dhabi'],
  ['/government', 'Population health · Abu Dhabi'],
])('%s redirects to the page it became', async (from, to) => {
  at(from)
  await title(to)
})

test('a deep link to a routed page without a tab opens it', async () => {
  at('/hospital/review')
  await title('Results to review · Dr Aisha Al Hosani')
})

test('an unknown page is a 404', async () => {
  at('/hospital/nothing')
  expect(await screen.findByText('Page not found')).toBeInTheDocument()
})
