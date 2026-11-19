import { LEGACY_UI_KEY } from '@/config/legacy'

/**
 * Turns the parts the redesign hides back on for the tests of a file (the old Test case banner, button and `?test=`
 * links, "Moza's case" and the "Night alert demo" switch; see `src/config/legacy.ts`). Call it at the top level of the
 * file, after any `beforeEach` that clears localStorage, so it runs after them.
 */
export function withLegacyUi(): void {
  beforeEach(() => localStorage.setItem(LEGACY_UI_KEY, 'on'))
}
