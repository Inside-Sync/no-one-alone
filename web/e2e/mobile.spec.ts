import { expect, test } from '@playwright/test'
import { caseName, openPage, routeCases } from './helpers'

test.use({ viewport: { width: 360, height: 780 } })

for (const c of routeCases()) {
  test(`360px: no horizontal page scroll on ${caseName(c)}`, async ({ page }) => {
    await openPage(page, c)
    const { scrollWidth, wide } = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth
      // Name what pokes out, so a failure says where to look.
      const wide = Array.from(document.querySelectorAll<HTMLElement>('body *'))
        .filter((e) => {
          const r = e.getBoundingClientRect()
          if (r.width === 0 || r.right <= vw + 1) return false
          // Fixed layers (the parked drawer, the scene) do not widen the page.
          for (let p: HTMLElement | null = e; p; p = p.parentElement) if (getComputedStyle(p).position === 'fixed') return false
          // Content inside a horizontal scroller (tabs, tables) is allowed to overflow its scroller.
          for (let p = e.parentElement; p; p = p.parentElement) {
            const ox = getComputedStyle(p).overflowX
            if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return false
          }
          return true
        })
        .slice(0, 5)
        .map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} right=${Math.round(e.getBoundingClientRect().right)}`)
      return { scrollWidth: document.documentElement.scrollWidth, wide }
    })
    expect(scrollWidth, wide.join('\n')).toBeLessThanOrEqual(360)
  })
}

test('360px: the long family tab bar scrolls inside nav, not the page', async ({ page }) => {
  await openPage(page, { view: 'individual', page: 'home', who: 'family' })
  const tabs = page.locator('nav.tabs')
  const m = await tabs.evaluate((e) => ({ ox: getComputedStyle(e).overflowX, sw: e.scrollWidth, cw: e.clientWidth, right: e.getBoundingClientRect().right }))
  expect(m.ox).toBe('auto')
  expect(m.sw).toBeGreaterThan(m.cw)
  expect(m.right).toBeLessThanOrEqual(360)
  // The last tab can be scrolled into view and used.
  const last = page.getByRole('button', { name: /Her phone/ })
  await last.scrollIntoViewIfNeeded()
  await last.click()
  await expect(page).toHaveURL(/\/individual\/device$/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})

test('360px: the drawer takes the full width inside the 16px gutters', async ({ page }) => {
  await openPage(page, { view: 'individual', page: 'home', who: 'family' })
  await page.locator('.kpi[role="button"]').first().click()
  const drawer = page.locator('.drawer.on')
  await expect(drawer).toBeVisible()
  await page.waitForTimeout(400) // slide-in transition
  const box = (await drawer.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(15)
  expect(box.x + box.width).toBeLessThanOrEqual(345)
  expect(box.width).toBeGreaterThanOrEqual(360 - 32 - 1)
})

test('360px: cards span one column and canvases fit their card', async ({ page }) => {
  await openPage(page, { view: 'individual', page: 'home', who: 'family' })
  const widths = await page.locator('main > .card').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)))
  expect(widths.length).toBeGreaterThan(0)
  const main = await page.locator('main').evaluate((e) => Math.round(e.getBoundingClientRect().width))
  for (const w of widths) expect(w).toBe(main)
  const over = await page.locator('canvas').evaluateAll((els) => els.filter((c) => {
    const r = c.getBoundingClientRect()
    const card = (c.closest('.card') ?? c.parentElement)!.getBoundingClientRect()
    return r.width > 0 && (r.left < card.left - 1 || r.right > card.right + 1)
  }).length)
  expect(over).toBe(0)
})
