/**
 * Switches for parts of the app that the "Noa · family health" redesign hides but keeps in the code.
 *
 * - `LEGACY_TEST_CASE`: the old Test case overlay entry points (the banner under the header, the header button and the
 *   `?test=` deep links). The overlay code stays; the AI team owns it.
 * - `LEGACY_HEADER_DEMOS`: the "Moza's case" walkthrough button and the "Night alert demo" switch in the header.
 * - `LEGACY_HIDDEN_PAGES`: Around me and My phone as pages. Off, their links open My day (no tab either way).
 *
 * Tests and local development can turn them all back on without a rebuild: `localStorage['noa-legacy-ui'] = 'on'`. The
 * override is read only in development and test builds (`import.meta.env.DEV`), never in production.
 */
export const LEGACY_TEST_CASE = false
export const LEGACY_HEADER_DEMOS = false
export const LEGACY_HIDDEN_PAGES = false

/** localStorage key of the development and test override. */
export const LEGACY_UI_KEY = 'noa-legacy-ui'

function overrideOn(): boolean {
  if (!import.meta.env?.DEV) return false
  try {
    return localStorage.getItem(LEGACY_UI_KEY) === 'on'
  } catch {
    return false
  }
}

/** True when the old Test case banner, button and `?test=` links are mounted. */
export const legacyTestCaseOn = (): boolean => LEGACY_TEST_CASE || overrideOn()

/** True when the "Moza's case" and "Night alert demo" header controls are shown. */
export const legacyHeaderDemosOn = (): boolean => LEGACY_HEADER_DEMOS || overrideOn()

/** True when Around me and My phone open as pages instead of redirecting to My day. */
export const legacyPagesOn = (): boolean => LEGACY_HIDDEN_PAGES || overrideOn()
