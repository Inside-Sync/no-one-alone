import { expect, test } from '@playwright/test'
import { seedWho } from './helpers'

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

test('deep link /individual/privacy as family redirects to the first family tab', async ({ page }) => {
  await seedWho(page, 'family')
  await page.goto('/individual/privacy')
  await expect(page).toHaveURL(/\/individual\/home$/)
  await expect(page.locator('#pgTitle')).toHaveText('Margaret Collins, 78')
})

test('deep link /individual/forecast as Margaret redirects to her first tab', async ({ page }) => {
  await seedWho(page, 'self')
  await page.goto('/individual/forecast')
  await expect(page).toHaveURL(/\/individual\/me$/)
  await expect(page.locator('#pgTitle')).toHaveText('Hello, Margaret')
})

test('/hospital/xyz returns the 404 page', async ({ page }) => {
  await page.goto('/hospital/xyz')
  await expect(page).toHaveURL(/\/hospital\/xyz$/)
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('the who switch moves between Margaret and the family tabs', async ({ page }) => {
  await page.goto('/individual/home')
  await page.getByRole('button', { name: /Margaret \(her own app\)/ }).click()
  await expect(page).toHaveURL(/\/individual\/me$/)
  await expect(page.getByRole('button', { name: /Who sees what/ })).toBeVisible()
  await page.getByRole('button', { name: /Family & carers/ }).click()
  await expect(page).toHaveURL(/\/individual\/home$/)
})

test('the view switcher opens each view at its first tab', async ({ page }) => {
  await page.goto('/individual/home')
  await page.getByRole('button', { name: 'Hospital' }).click()
  await expect(page).toHaveURL(/\/hospital\/ed$/)
  await page.getByRole('button', { name: 'Community' }).click()
  await expect(page).toHaveURL(/\/community\/community$/)
  await page.getByRole('button', { name: 'Individual' }).click()
  await expect(page).toHaveURL(/\/individual\/home$/)
})
