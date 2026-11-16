import { expect, test } from '@playwright/test'
import { caseName, openPage, routeCases } from './helpers'

test.use({ viewport: { width: 390, height: 844 } })

for (const c of routeCases()) {
  test(`Arabic 390px: right-to-left, no horizontal page scroll on ${caseName(c)}`, async ({ page }) => {
    await openPage(page, c, 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
}

test('Arabic mirrors the top bar: the brand sits at the right edge, the language switch at the left', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openPage(page, { view: 'individual', page: 'health', who: 'family' }, 'ar')
  const brand = await page.locator('.topnav .brand').boundingBox()
  const sw = await page.locator('#locale-ar').boundingBox()
  expect(brand!.x).toBeGreaterThan(720)
  expect(sw!.x).toBeLessThan(720)
})

test('Arabic keeps the drawer and chat panel on the leading (right-hand) side mirrored to the left', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openPage(page, { view: 'individual', page: 'around', who: 'self' }, 'ar')
  await page.locator('main li[role="button"]').first().click()
  const box = await page.locator('#drawer, .drawer.on').first().boundingBox()
  expect(box!.x).toBeLessThan(100)
})
