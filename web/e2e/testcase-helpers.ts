import { expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { seedWho } from './helpers'

export const CASE_KEYS = ['family', 'wellchild', 'ifhas', 'expat', 'bone', 'stroke', 'fall', 'hypo', 'hf', 'own'] as const

/** Collect page errors and console errors; call `.list()` at the end of the test. */
export function watchErrors(page: Page) {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text()}`) })
  return { list: () => errs }
}

type Opts = { lng?: 'en' | 'ar'; theme?: 'light' | 'dark' }

/** Open the app at a page with an optional `?test` query (the overlay reads and strips it on mount). */
export async function openApp(page: Page, query = '', opts: Opts = {}) {
  await seedWho(page, 'family')
  if (opts.theme === 'dark') await page.addInitScript(() => { try { localStorage.setItem('noa-theme', 'dark') } catch { /* ignore */ } })
  if (opts.lng === 'ar') await page.addInitScript(() => { try { localStorage.setItem('noa-locale', 'ar') } catch { /* ignore */ } })
  await page.goto(`/individual/health${query}`)
  await page.waitForLoadState('networkidle')
}

export const overlay = (page: Page) => page.locator('#tcHost')

/** Open the overlay on a case or tab through the deep link (null = picker), and wait for its body to render. */
export async function openTest(page: Page, what: string | null, opts: Opts = {}) {
  await openApp(page, what === null ? '?test' : `?test=${what}`, opts)
  await expect(overlay(page)).toBeVisible()
  if (what === 'judges') await expect(page.locator('#v-judges')).toBeVisible({ timeout: 15_000 })
  else if (what === 'bench') await expect(page.locator('#v-bench')).toBeVisible({ timeout: 15_000 })
  else if (what) await expect(page.locator('#card')).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
}

/** Press "Run it for me" and wait until the run ends (the button leaves its "Stop" state). */
export async function runToEnd(page: Page) {
  const auto = page.locator('#autoBtn')
  await auto.click()
  // (A short run may already be over by the time we look, so there is no wait for the Stop state.) The run ends when the autopilot switches itself off (a one-step case such as "own" has no restart button).
  await expect(auto).toHaveAttribute('aria-pressed', 'false', { timeout: 90_000 })
}

export async function seriousAxe(page: Page, include = '#tcHost') {
  const { violations } = await new AxeBuilder({ page }).include(include).analyze()
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.impact} ${v.id}: ${v.help}\n${v.nodes.slice(0, 6).map((n) => `   ${n.target.join(' ')} ${n.failureSummary?.split('\n')[1] ?? ''}`).join('\n')}`)
}

export async function noHScroll(page: Page) {
  const r = await page.evaluate(() => {
    const h = document.querySelector('#tcHost') as HTMLElement
    return { host: h.scrollWidth - h.clientWidth, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth }
  })
  expect(r.host, 'overlay horizontal overflow').toBeLessThanOrEqual(0)
  expect(r.doc, 'page horizontal overflow').toBeLessThanOrEqual(0)
}
