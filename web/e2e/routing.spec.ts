import { expect, test } from '@playwright/test'

test('root forwards to the individual home', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/individual\/home$/)
  await expect(page.locator('#pgTitle')).toHaveText('Margaret Collins, 78')
})

test('a deep link loads its page directly', async ({ page }) => {
  await page.goto('/hospital/ed')
  await expect(page.getByRole('button', { name: 'Pre-arrivals' })).toHaveAttribute('aria-current', 'page')
})

test('tabs navigate on the client', async ({ page }) => {
  await page.goto('/individual/home')
  await page.getByRole('button', { name: /Health Lineage/ }).click()
  await expect(page).toHaveURL(/\/individual\/lineage$/)
  await expect(page.locator('#pgTitle')).toHaveText('Health Lineage · Collins and Hughes families')
})

test('unknown routes show not found', async ({ page }) => {
  await page.goto('/hospital/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.getByRole('link', { name: 'Go to Home' }).click()
  await expect(page).toHaveURL(/\/individual\/home$/)
})

test('fonts load from the bundle', async ({ page }) => {
  await page.goto('/individual/home')
  // Subsets load on demand by unicode-range, so ask for the Vietnamese glyphs explicitly.
  const loaded = await page.evaluate(async () => (await document.fonts.load('16px "Be Vietnam Pro"', 'Mạ ơi')).length)
  expect(loaded).toBeGreaterThan(0)
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/^"Be Vietnam Pro"/)
})
