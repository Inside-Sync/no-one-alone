import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { App } from '@/app/App'

const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
const title = (text: string) => screen.findByText(text, { selector: '#pgTitle' })

beforeEach(() => { sessionStorage.clear(); localStorage.clear() })

/** Moza's Family health tab: the tab is current and the shell has no context bar (so no page title) there. */
const onFamilyHealth = async () => {
  expect(await screen.findByRole('button', { name: /^Family health$/ })).toHaveAttribute('aria-current', 'page')
  expect(document.querySelector('#pgTitle')).toBeNull()
  expect(document.querySelector('#guide')).toBeNull()
}

test("the root opens Moza's own app on Family health", async () => {
  at('/')
  await onFamilyHealth()
})

test.each(['/individual/home', '/individual/forecast', '/individual/recovery', '/individual/privacy', '/individual'])(
  '%s redirects to the first tab, Family health',
  async (from) => {
    at(from)
    await onFamilyHealth()
  },
)

test.each([
  ['/individual/around', 'Hello, Moza'],
  ['/individual/device', 'Hello, Moza'],
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
