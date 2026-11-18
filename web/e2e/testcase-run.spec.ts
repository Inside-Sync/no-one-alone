import { expect, test } from '@playwright/test'
import { CASE_KEYS, openTest, overlay, runToEnd, watchErrors } from './testcase-helpers'

test.use({ contextOptions: { reducedMotion: 'reduce' } })
test.setTimeout(120_000)

for (const key of CASE_KEYS) {
  test(`case ${key}: "Run it for me" plays to the last step without errors`, async ({ page }) => {
    const errs = watchErrors(page)
    await openTest(page, key)
    await runToEnd(page)
    // The last step of the stepper is the one on screen.
    const cur = await page.locator('ol.stepper li button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-current')))
    // Reached the last step: the current step is the last enabled one (the family run stops on step 9).
    const dis = await page.locator('ol.stepper li button').evaluateAll((els) => els.map((e) => (e as HTMLButtonElement).disabled))
    const lastEnabled = dis.lastIndexOf(false)
    expect(cur.lastIndexOf('step')).toBe(lastEnabled)
    // Every case except the one-step "own" (no action raised on the default readings) shows its restart button on the last step.
    if (key !== 'own') { expect(lastEnabled).toBeGreaterThanOrEqual(1); await expect(page.locator('#card [data-act="restart"]')).toBeVisible() }
    await expect(page.locator('#autoBtn')).toHaveAttribute('aria-pressed', 'false')
    expect(errs.list()).toEqual([])
  })
}

test('Judge path chains three cases and reaches its done state', async ({ page }) => {
  const errs = watchErrors(page)
  await openTest(page, 'ifhas')
  await page.locator('#judgeBtn').click()
  await expect(page.locator('.tc-judgecap')).toBeVisible()
  await expect(page.locator('.tc-judgecap .pill')).toHaveCount(0, { timeout: 180_000 }) // the beat pill is replaced by the done line
  await expect(page.locator('#judgeBtn')).toBeEnabled()
  expect(errs.list()).toEqual([])
})

test('For judges shows KPIs after a run', async ({ page }) => {
  const errs = watchErrors(page)
  await openTest(page, 'stroke')
  await runToEnd(page)
  await overlay(page).getByRole('tab', { name: 'For judges' }).click()
  await expect(page.locator('#v-judges')).toBeVisible()
  await expect(page.locator('#v-judges .tc-kpi').first()).toBeVisible()
  await expect(page.locator('#v-judges .tc-kpi-ready').first()).toBeVisible()
  expect(errs.list()).toEqual([])
})

test('Benchmark: run shows 998-now sensitivity, specificity and a match count', async ({ page }) => {
  const errs = watchErrors(page)
  await openTest(page, 'bench')
  await page.locator('#benchRun').click()
  const stats = page.locator('#v-bench .tc-bn-stats')
  await expect(stats).toBeVisible({ timeout: 120_000 })
  await expect(stats).toContainText('Sensitivity, 998 now')
  await expect(stats).toContainText('Specificity, 998 now')
  await expect(stats).toContainText(/\d+ of \d+/)
  await expect(stats).toContainText(/\d+(\.\d+)?%/)
  await expect(page.locator('.tc-bn-status')).toContainText(/\d+/)
  expect(errs.list()).toEqual([])
})
