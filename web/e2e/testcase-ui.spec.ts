import { expect, test, type Page } from '@playwright/test'
import { measureToneText } from './helpers'
import { noHScroll, openTest, overlay, runToEnd, seriousAxe } from './testcase-helpers'
import { enableLegacyUi } from './helpers'

test.use({ contextOptions: { reducedMotion: 'reduce' } })
test.setTimeout(120_000)

const VIEWS = ['family', 'stroke', 'judges', 'bench'] as const

async function settle(page: Page, v: string) {
  if (v === 'bench') { await page.locator('#benchRun').click(); await expect(page.locator('.tc-bn-stats')).toBeVisible({ timeout: 120_000 }) }
  else if (v !== 'judges') await runToEnd(page)
}

for (const theme of ['light', 'dark'] as const) for (const v of VIEWS) {
  test(`axe: overlay ${v} (${theme}) has no serious or critical violations`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openTest(page, v, { theme })
    if (theme === 'dark') await expect(overlay(page)).toHaveClass(/dark/)
    await settle(page, v)
    const bad = await seriousAxe(page)
    expect(bad, bad.join('\n')).toEqual([])
  })
}

test('overlay status-tone text keeps 4.5:1 contrast (family, light and dark)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  for (const theme of ['light', 'dark'] as const) {
    await openTest(page, 'family', { theme })
    await runToEnd(page)
    // The run now follows the step card; measure from the top of the overlay, as the screenshot probe expects (the sticky bar would cover scrolled content).
    await page.evaluate(() => { (document.getElementById('tcHost') as HTMLElement).scrollTop = 0 })
    const hits = (await measureToneText(page)).filter((h) => h.ratio < 4.5)
    expect(hits.map((h) => `${theme} ${h.tone} "${h.text}" ${h.ratio.toFixed(2)}`), 'low-contrast tones').toEqual([])
  }
})

for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const v of VIEWS) {
    test(`Arabic ${vp.width}px: overlay ${v} is right-to-left with no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize(vp)
      await openTest(page, v, { lng: 'ar' })
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      await expect(overlay(page)).toHaveAttribute('dir', 'rtl')
      if (v === 'bench') await settle(page, v)
      await noHScroll(page)
    })
  }
}

for (const v of VIEWS) {
  test(`mobile 390px: overlay ${v} has no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openTest(page, v)
    await settle(page, v)
    await noHScroll(page)
  })
}

test('Arabic switch from the header (#locale-ar) then opening the overlay is rtl', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await enableLegacyUi(page)
  await page.goto('/individual/health')
  await page.locator('#locale-ar').click()
  await page.locator('#runTest').click()
  await expect(overlay(page)).toHaveAttribute('dir', 'rtl')
  await noHScroll(page)
})
