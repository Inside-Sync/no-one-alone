import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { App } from '@/app/App'
import { LEGACY_HEADER_DEMOS, LEGACY_TEST_CASE } from '@/config/legacy'
import { readDeepLink } from '@/features/testcase/entry/TestCaseProvider'

/** The shell of the "Noa · family health" redesign: what is hidden, what moved, and the Family health tab. */
const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)

beforeEach(() => { sessionStorage.clear(); localStorage.clear() })

test('the old Test case and header demos are off by default', () => {
  expect(LEGACY_TEST_CASE).toBe(false)
  expect(LEGACY_HEADER_DEMOS).toBe(false)
})

test('no Test case banner or button, no Moza\'s case, no Night alert demo, no Ask Noa button', async () => {
  at('/hospital/overview')
  expect(await screen.findByText('Overview · Corniche Stroke Centre', { selector: '#pgTitle' })).toBeInTheDocument()
  for (const id of ['#tcBanner', '#runTest', '#runCase', '#runDemo']) expect(document.querySelector(id), id).toBeNull()
  expect(screen.queryByRole('switch', { name: /Night alert demo/ })).toBeNull()
  expect(document.querySelector('.chat-fab')).toBeNull()
  // The chat panel itself is still mounted, so the in-page Ask Noa buttons can open it.
  expect(document.querySelector('aside.chat')).not.toBeNull()
})

test('a ?test= link no longer opens the overlay', async () => {
  window.history.replaceState(null, '', '/hospital/overview?test=family')
  at('/hospital/overview')
  expect(await screen.findByText('Overview · Corniche Stroke Centre', { selector: '#pgTitle' })).toBeInTheDocument()
  expect(document.querySelector('#tcHost')).toBeNull()
  // The parser itself is kept for the overlay's own tests.
  expect(readDeepLink('?test=family')).toEqual({ caseKey: 'family' })
  window.history.replaceState(null, '', '/')
})

test('the language switch is the first item of the right group, before the theme button', async () => {
  at('/hospital/overview')
  const right = (await screen.findByRole('group', { name: 'Language' })).closest('.tn-right')!
  expect(right).not.toBeNull()
  const kids = Array.from(right.children)
  expect(kids[0]).toHaveAttribute('id', 'localeSwitch')
  expect(kids[1]).toHaveAttribute('id', 'themeBtn')
})

test('Moza\'s tabs: Family health first, then My day, My health, My care record', async () => {
  at('/individual/me')
  const nav = await screen.findByRole('navigation', { name: 'Sections' })
  await waitFor(() => expect(Array.from(nav.querySelectorAll('button')).map((b) => b.textContent)).toEqual(
    ['Family health', 'My day', 'My health', 'My care record'],
  ))
})

test('the Family health tab has no context bar, tip or pause banner', async () => {
  at('/individual/lineage')
  expect(await screen.findByRole('button', { name: /^Family health$/ })).toHaveAttribute('aria-current', 'page')
  for (const id of ['#pgTitle', '#guide', '#guideShow', '#pauseBanner']) expect(document.querySelector(id), id).toBeNull()
  expect(document.querySelector('section.ctx')).toBeNull()
})

test('treatment is still reachable and lights the care record tab', async () => {
  at('/individual/treatment')
  expect(await screen.findByText('My treatment', { selector: '#pgTitle' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /My care record/ })).toHaveAttribute('aria-current', 'page')
})
