import { allRoutes } from '@/domain/views'
import { PAGE_REGISTRY } from '@/features/registry'

test('every route App.tsx accepts has a registered page (no placeholder fallback)', () => {
  const missing = allRoutes().map((r) => `${r.view}/${r.page}`).filter((k) => !PAGE_REGISTRY[k])
  expect(missing).toEqual([])
})
