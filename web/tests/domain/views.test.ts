import {
  allRoutes, firstPage, LEGACY_ROUTES, pageContext, pageTitle, PAGE_TITLES, resolvePage, ROLE_REDIRECT_PAGES, tabsFor, VIEW_USERS, whoForPage,
} from '@/domain/views'
import { TOUR_STEPS, tourPath } from '@/domain/tour'

const ids = (view: 'individual' | 'hospital' | 'government', who: 'self' | 'family', page?: string) =>
  tabsFor(view, who, page).map((t) => t.id)

test("family and carers tabs: health, care record, treatment", () => {
  expect(ids('individual', 'family')).toEqual(['health', 'record', 'treatment'])
  expect(tabsFor('individual', 'family').map((t) => t.label)).toEqual(['Health', 'Care record', 'Treatment'])
})
test('the night alert replay is a family tab only while its page is open', () => {
  expect(ids('individual', 'family', 'health')).toEqual(['health', 'record', 'treatment'])
  expect(ids('individual', 'family', 'live')).toEqual(['health', 'record', 'treatment', 'live'])
  expect(tabsFor('individual', 'family', 'live').at(-1)?.label).toBe('Night alert (replay)')
})
test("Moza's own app tabs", () => {
  expect(ids('individual', 'self')).toEqual(['me', 'health', 'record', 'treatment', 'around', 'lineage', 'device'])
  expect(tabsFor('individual', 'self').map((t) => t.label)).toEqual(
    ['My day', 'My health', 'My care record', 'My treatment', 'Around me', 'My family health', 'My phone'],
  )
})
test('the default role starts on My day, family on Health', () => {
  expect(firstPage('individual', 'self')).toBe('me')
  expect(firstPage('individual', 'family')).toBe('health')
})
test('hospital has four tabs and government two, whoever asks', () => {
  expect(tabsFor('hospital', 'self').map((t) => t.label)).toEqual(['Overview', 'Patient records', 'Referrals', 'Emergency arrivals'])
  expect(ids('hospital', 'family')).toEqual(['overview', 'patients', 'referrals', 'ed'])
  expect(firstPage('hospital', 'self')).toBe('overview')
  expect(tabsFor('government', 'family').map((t) => t.label)).toEqual(['Population health', 'Programme signals'])
  expect(ids('government', 'family')).toEqual(['population', 'signals'])
})
test('signed-in user per view', () => {
  expect(VIEW_USERS.hospital.initials).toBe('OH')
  expect(VIEW_USERS.hospital.name).toBe('Dr Omar Haddad')
  expect(VIEW_USERS.government.color).toBe('#6d4fc0')
})
test('a page of the other role redirects to the first tab of this one', () => {
  expect(resolvePage('individual', 'around', 'family')).toEqual({ kind: 'redirect', to: '/individual/health' })
  expect(resolvePage('individual', 'lineage', 'family')).toEqual({ kind: 'redirect', to: '/individual/health' })
})
test('shared pages are ok for both roles', () => {
  for (const p of ['health', 'record', 'treatment', 'live']) {
    expect(resolvePage('individual', p, 'self')).toEqual({ kind: 'ok' })
    expect(resolvePage('individual', p, 'family')).toEqual({ kind: 'ok' })
  }
})
test('review is a routed hospital page without a tab', () => {
  expect(ids('hospital', 'self')).not.toContain('review')
  expect(resolvePage('hospital', 'review', 'self')).toEqual({ kind: 'ok' })
  expect(PAGE_TITLES.review).toBe('Results to review · Dr Aisha Al Hosani')
})
test('the removed pages are 404 as routes (App.tsx redirects them)', () => {
  for (const p of ['home', 'forecast', 'recovery', 'privacy']) expect(resolvePage('individual', p, 'self').kind).toBe('notFound')
  for (const p of ['panel', 'patient', 'demand', 'discharge', 'loop']) expect(resolvePage('hospital', p, 'self').kind).toBe('notFound')
})
test('unknown page and view are 404', () => {
  expect(resolvePage('hospital', 'xyz', 'family').kind).toBe('notFound')
  expect(resolvePage('foo', 'health', 'family').kind).toBe('notFound')
})
test('allRoutes lists every tab of both roles plus the routed-only pages, once each', () => {
  const r = allRoutes().map((p) => `${p.view}/${p.page}`)
  expect(new Set(r).size).toBe(r.length)
  expect([...r].sort()).toEqual([
    'government/population', 'government/signals',
    'hospital/ed', 'hospital/overview', 'hospital/patients', 'hospital/referrals', 'hospital/review',
    'individual/around', 'individual/device', 'individual/health', 'individual/lineage', 'individual/live', 'individual/me',
    'individual/record', 'individual/treatment',
  ])
})
test('one-role individual pages imply the role; shared and other views do not', () => {
  expect(whoForPage('individual', 'me')).toBe('self')
  expect(whoForPage('individual', 'device')).toBe('self')
  expect(whoForPage('individual', 'health')).toBeUndefined()
  expect(whoForPage('individual', 'live')).toBeUndefined()
  expect(whoForPage('hospital', 'ed')).toBeUndefined()
})
test('old routes: community and the removed hospital pages have fixed targets', () => {
  expect(LEGACY_ROUTES).toMatchObject({
    '/community/community': '/government/population',
    '/community/watch': '/government/signals',
    '/hospital/panel': '/hospital/patients',
    '/hospital/patient': '/hospital/patients',
    '/hospital/demand': '/hospital/overview',
    '/hospital/discharge': '/hospital/overview',
    '/hospital/loop': '/hospital/overview',
  })
  expect(ROLE_REDIRECT_PAGES).toEqual(['home', 'forecast', 'recovery', 'privacy'])
  expect(resolvePage('community', 'watch', 'family').kind).toBe('notFound')
})
test('page titles come from the dumps; family reads "Care record" where Moza reads "My care record"', () => {
  expect(PAGE_TITLES.me).toBe('Hello, Moza')
  expect(PAGE_TITLES.ed).toBe('Emergency arrivals · Corniche Stroke Centre')
  expect(pageTitle('individual', 'record', 'self')).toBe('My care record')
  expect(pageTitle('individual', 'treatment', 'self')).toBe('My treatment')
  expect(pageTitle('individual', 'record', 'family')).toBe('Care record · Moza Al Hammadi')
  expect(pageTitle('individual', 'health', 'family')).toBe('Health · Moza Al Hammadi')
})
test('every page has a context bar with a live first fact', () => {
  for (const { view, page } of allRoutes()) {
    for (const who of ['self', 'family'] as const) {
      if (resolvePage(view, page, who).kind !== 'ok') continue
      const c = pageContext(view, who, page)
      expect(c, `${view}/${page} as ${who}`).toBeDefined()
      expect(c!.facts[0].live).toBe(true)
      expect(c!.facts.length).toBeGreaterThanOrEqual(3)
    }
  }
  expect(pageContext('individual', 'self', 'me')?.facts.map((f) => f.label)).toEqual(["You're sharing with", 'Cameras', 'Location'])
  expect(pageContext('hospital', 'self', 'overview')?.facts[0]).toEqual({ live: true, label: 'Beds', value: '156 of 180' })
})
test("Moza's case has 21 steps, each on a real route", () => {
  expect(TOUR_STEPS).toHaveLength(21)
  const routes = new Set(allRoutes().map((r) => `${r.view}/${r.page}`))
  for (const s of TOUR_STEPS) expect(routes.has(`${s.view}/${s.page}`), `${s.view}/${s.page}`).toBe(true)
  expect(tourPath(TOUR_STEPS[10])).toBe('/hospital/patients?patient=moza&step=sum')
  expect(TOUR_STEPS.filter((s) => s.night)).toHaveLength(1)
})
