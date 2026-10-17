import { resolvePage, tabsFor, allRoutes, VIEW_USERS } from '@/domain/views'

test('family tabs', () =>
  expect(tabsFor('individual', 'family').map((t) => t.id)).toEqual(
    ['home', 'health', 'around', 'forecast', 'lineage', 'record', 'live', 'recovery', 'device'],
  ))
test('family tab labels are verbatim', () =>
  expect(tabsFor('individual', 'family').map((t) => t.label)).toEqual(
    ['🏠 Home', '❤️ Health', '🌤️ Around her', "🔮 What's ahead", '🌳 Health Lineage', '📋 Care record', '🚨 Emergency', '🌱 Recovery', '📱 Her phone'],
  ))
test('self tabs', () => {
  expect(tabsFor('individual', 'self')[0].id).toBe('me')
  expect(tabsFor('individual', 'self').map((t) => t.label)).toEqual(
    ['🌞 My day', '🌱 My recovery', '❤️ My health', '🔐 Who sees what', '🌤️ Around me', '🌳 My family health', '📱 My phone'],
  )
})
test('hospital and community tabs ignore who', () => {
  expect(tabsFor('hospital', 'self').map((t) => t.label)).toEqual(
    ['Pre-arrivals', 'Patient panel', 'Demand & beds', 'Discharge follow-up'],
  )
  expect(tabsFor('community', 'family').map((t) => t.id)).toEqual(['community', 'watch'])
})
test('signed-in user per view', () => {
  expect(VIEW_USERS.hospital.initials).toBe('AT')
  expect(VIEW_USERS.community.color).toBe('#6d4fc0')
})
test('self-only page as family redirects', () =>
  expect(resolvePage('individual', 'privacy', 'family')).toEqual({ kind: 'redirect', to: '/individual/home' }))
test('family-only page as self redirects', () =>
  expect(resolvePage('individual', 'forecast', 'self')).toEqual({ kind: 'redirect', to: '/individual/me' }))
test('shared page is ok for both roles', () => {
  expect(resolvePage('individual', 'health', 'self')).toEqual({ kind: 'ok' })
  expect(resolvePage('individual', 'health', 'family')).toEqual({ kind: 'ok' })
})
test('recovery page is ok for both roles', () => {
  expect(resolvePage('individual', 'recovery', 'self')).toEqual({ kind: 'ok' })
  expect(resolvePage('individual', 'recovery', 'family')).toEqual({ kind: 'ok' })
})
test('hospital page ok regardless of role', () =>
  expect(resolvePage('hospital', 'ed', 'self')).toEqual({ kind: 'ok' }))
test('unknown page is 404', () => expect(resolvePage('hospital', 'xyz', 'family').kind).toBe('notFound'))
test('unknown view is 404', () => expect(resolvePage('foo', 'home', 'family').kind).toBe('notFound'))
test('allRoutes covers me, privacy and every other view x page pair', () => {
  const r = allRoutes().map((p) => `${p.view}/${p.page}`)
  expect(r).toContain('individual/me')
  expect(r).toContain('individual/privacy')
  expect(r).toContain('hospital/discharge')
  expect(r).toContain('community/watch')
  expect(new Set(r).size).toBe(r.length)
  expect(r).toHaveLength(11 + 4 + 2)
})
