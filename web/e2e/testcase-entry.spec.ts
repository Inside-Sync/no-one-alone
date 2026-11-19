import { expect, test } from '@playwright/test'
import { openApp, overlay, watchErrors } from './testcase-helpers'

test('button #runTest opens the overlay; Esc closes it and focus returns to the button', async ({ page }) => {
  const errs = watchErrors(page)
  await openApp(page)
  await expect(overlay(page)).toHaveCount(0)
  await page.locator('#runTest').click()
  await expect(overlay(page)).toBeVisible()
  await expect(overlay(page)).toHaveAttribute('role', 'dialog')
  await expect(page.locator('#picker')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(overlay(page)).toHaveCount(0)
  await expect(page.locator('#runTest')).toBeFocused()
  expect(errs.list()).toEqual([])
})

test('the banner opens the overlay; Esc closes it and focus returns to the banner button', async ({ page }) => {
  await openApp(page)
  await page.locator('#tcBannerBtn').click()
  await expect(overlay(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(overlay(page)).toHaveCount(0)
  await expect(page.locator('#tcBannerBtn')).toBeFocused()
})

test('the close button closes the overlay', async ({ page }) => {
  await openApp(page)
  await page.locator('#runTest').click()
  await page.locator('#tcClose').click()
  await expect(overlay(page)).toHaveCount(0)
})

for (const [q, check] of [
  ['family', '#famdash'],
  ['stroke', '#card'],
  ['', '#picker'],
  ['judges', '#v-judges'],
  ['bench', '#v-bench'],
] as const) {
  test(`deep link ?test${q ? '=' + q : ''} opens the overlay and removes the param`, async ({ page }) => {
    const errs = watchErrors(page)
    await openApp(page, q ? `?test=${q}` : '?test')
    await expect(overlay(page)).toBeVisible()
    await expect(page.locator(check)).toBeVisible()
    await expect.poll(() => new URL(page.url()).searchParams.has('test')).toBe(false)
    if (q === 'judges' || q === 'bench') await expect(overlay(page).getByRole('tab', { selected: true })).toHaveText(q === 'judges' ? 'For judges' : 'Benchmark')
    await page.keyboard.press('Escape')
    await expect(overlay(page)).toHaveCount(0)
    expect(errs.list()).toEqual([])
  })
}

test('"Start the 3-minute tour" opens the overlay and starts the Judge path', async ({ page }) => {
  await openApp(page)
  await page.locator('#tcBannerBtn').click()
  await expect(overlay(page)).toBeVisible()
  await expect(page.locator('.tc-judgecap')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('#judgeBtn')).toBeDisabled()
})
