import { expect, test, type Page } from '@playwright/test'
import { noHScroll, openTest, overlay, runToEnd, watchErrors } from './testcase-helpers'

test.setTimeout(120_000)

/** Distance between the bottom of the sticky bar and the top of an element (0..viewport means it is on screen, under the bar). */
const belowBar = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement
    const bar = document.querySelector('#tcHost .tc-bar') as HTMLElement
    return el.getBoundingClientRect().top - bar.getBoundingClientRect().bottom
  }, sel)

const scrollY = (page: Page) => page.evaluate(() => (document.getElementById('tcHost') as HTMLElement).scrollTop)
const scrollHost = (page: Page, top: number) => page.evaluate((t) => { (document.getElementById('tcHost') as HTMLElement).scrollTop = t }, top)

test('picking a case brings its header into view', async ({ page }) => {
  const errs = watchErrors(page)
  await openTest(page, 'family')
  await page.locator('#picker').scrollIntoViewIfNeeded()
  await scrollHost(page, await page.evaluate(() => (document.querySelector('#picker') as HTMLElement).offsetTop + 200))
  // The simple view keeps the other seven cases behind "More cases" (prototype).
  await page.locator('#picker .morecs').click()
  await page.locator('#picker .cs', { hasText: 'Bone' }).first().click()
  await expect.poll(() => belowBar(page, '#caseHeader'), { timeout: 5000 }).toBeGreaterThanOrEqual(-2)
  await expect.poll(() => belowBar(page, '#caseHeader')).toBeLessThan(60)
  expect(errs.list()).toEqual([])
})

test('Replay with the same readings goes to the first step card and says so', async ({ page }) => {
  await openTest(page, 'stroke')
  await runToEnd(page)
  await expect(page.locator('ol.stepper li button[aria-current="step"]')).not.toContainText('1 ·')
  await scrollHost(page, 1200)
  await page.getByRole('button', { name: 'Replay with the same readings' }).evaluate((b: HTMLElement) => b.click())
  await expect(overlay(page).locator('.tc-toast')).toHaveText('Running again with the same details')
  await expect(page.locator('ol.stepper li button[aria-current="step"]')).toContainText('1 ·')
  await expect.poll(() => belowBar(page, '#card'), { timeout: 5000 }).toBeGreaterThanOrEqual(-2)
  await expect.poll(() => belowBar(page, '#card')).toBeLessThan(60)
  // The toast hides itself.
  await expect(overlay(page).locator('.tc-toast')).toHaveCount(0, { timeout: 6000 })
})

test('scrolling by hand stops Run it for me from following', async ({ page }) => {
  await openTest(page, 'family')
  await scrollHost(page, 0)
  await page.locator('#autoBtn').click()
  await expect(page.locator('#autoBtn')).toHaveAttribute('aria-pressed', 'true')
  // Auto-follow brings the step card under the bar.
  await expect.poll(() => scrollY(page), { timeout: 8000 }).toBeGreaterThan(50)
  // The person takes over: a wheel turn back to the very top.
  await page.mouse.move(200, 400)
  await page.mouse.wheel(0, -4000)
  await page.waitForTimeout(800)
  await scrollHost(page, 0)
  const step = () => page.locator('ol.stepper li button[aria-current="step"]').textContent()
  const first = await step()
  await expect.poll(step, { timeout: 40_000 }).not.toBe(first)
  await page.waitForTimeout(800)
  expect(await scrollY(page)).toBe(0)
  await page.locator('#autoBtn').click() // stop the run
})

test('a stepper click goes to the step card and focuses its heading', async ({ page }) => {
  await openTest(page, 'stroke')
  await runToEnd(page)
  await scrollHost(page, 1500)
  await page.locator('ol.stepper li button').first().evaluate((b: HTMLElement) => b.click())
  await expect.poll(() => belowBar(page, '#card'), { timeout: 5000 }).toBeLessThan(60)
  await expect(page.locator('#card h3')).toBeFocused()
})

test('the language switch toasts without moving the screen', async ({ page }) => {
  await openTest(page, 'stroke')
  await scrollHost(page, 200)
  await page.locator('.langsw button[lang="ar"]').evaluate((b: HTMLElement) => b.click())
  await expect(overlay(page).locator('.tc-toast')).toHaveText('Noa will speak Arabic in the speech check and teach-back')
  expect(await scrollY(page)).toBe(200)
})

test('mobile 390: Restart goes back to the top without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await openTest(page, 'stroke')
  await scrollHost(page, 900)
  await page.getByRole('button', { name: 'Restart' }).evaluate((b: HTMLElement) => b.click())
  await expect.poll(() => scrollY(page), { timeout: 5000 }).toBe(0)
  await expect(overlay(page).locator('.tc-toast')).toHaveText('Case reset to its starting details')
  const over = await page.evaluate(() => { const h = document.getElementById('tcHost') as HTMLElement; return h.scrollWidth - h.clientWidth })
  expect(over).toBeLessThanOrEqual(0)
})

test('Judge path: pause holds the step, Back and Skip move one step, Resume carries on', async ({ page }) => {
  const errs = watchErrors(page)
  await page.setViewportSize({ width: 1536, height: 864 })
  await openTest(page, 'ifhas')
  await expect(page.locator('#tcPlayback')).toHaveCount(0)
  await page.locator('#judgeBtn').click()
  const bar = page.locator('#nextbar')
  await expect(page.locator('#tcPlayback')).toBeVisible()
  await expect(bar).toContainText('Case 1 of 3')
  await bar.locator('[data-speed="fast"]').click()
  const cur = () => page.locator('ol.stepper li button[aria-current="step"]').textContent()
  const stepNo = async () => Number(((await cur()) ?? '').match(/^(\d+) ·/)?.[1] ?? 0)
  await expect.poll(stepNo, { timeout: 60_000 }).toBeGreaterThanOrEqual(3)
  await page.locator('#pbPause').click()
  await expect(page.locator('#pbPause')).toHaveAttribute('aria-label', 'Play')
  const held = await stepNo()
  await page.waitForTimeout(2500)
  expect(await stepNo()).toBe(held)
  await page.locator('#pbBack').click()
  expect(await stepNo()).toBe(held - 1)
  await page.locator('#pbSkip').click()
  expect(await stepNo()).toBe(held)
  await page.locator('#pbSkip').click()
  expect(await stepNo()).toBe(held + 1)
  // The step card stays under the bar (the follow works for Back and Skip).
  await expect.poll(() => belowBar(page, '#card'), { timeout: 5000 }).toBeLessThan(80)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Space')
  await expect(page.locator('#pbPause')).toHaveAttribute('aria-label', 'Pause')
  await expect.poll(stepNo, { timeout: 30_000 }).toBeGreaterThan(held + 1)
  expect(errs.list()).toEqual([])
})

for (const [w, h] of [[1536, 864], [2048, 1150]] as const) {
  test(`Judge path ${w}x${h}: the step card comes into view on every step and after the case switch`, async ({ page }) => {
    const errs = watchErrors(page)
    await page.setViewportSize({ width: w, height: h })
    await openTest(page, 'family')
    await page.locator('#judgeBtn').click()
    const bar = page.locator('#nextbar')
    await expect(bar).toContainText('Case 1 of 3')
    await bar.locator('[data-speed="fast"]').click()
    const where = () => page.evaluate(() => {
      const cur = document.querySelector('ol.stepper li button[aria-current="step"]')?.textContent ?? ''
      return `${document.querySelector('#nextbar .nb-prog b')?.textContent ?? ''}|${cur.slice(0, 3)}`
    })
    const inView = async (label: string) => {
      await expect.poll(() => belowBar(page, '#card'), { timeout: 5000, message: `card under the bar at ${label}` }).toBeGreaterThanOrEqual(-2)
      await expect.poll(() => belowBar(page, '#card'), { timeout: 5000, message: `card under the bar at ${label}` }).toBeLessThan(80)
    }
    // The first step card, right after the start.
    await inView(await where())
    // The presenter zooms with Ctrl + wheel: the screen keeps following.
    await page.evaluate(() => document.getElementById('tcHost')!.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: 100, bubbles: true })))
    const seen = new Set<string>([await where()])
    let switched = false
    for (let n = 0; n < 400 && !(switched && seen.size >= 3 && (await where()).startsWith('Case 2 of 3|2')); n++) {
      const k = await where()
      if (!seen.has(k)) {
        seen.add(k)
        if (k.startsWith('Case 2 of 3')) switched = true
        await inView(k)
      }
      await page.waitForTimeout(150)
    }
    expect(switched).toBe(true)
    expect(seen.size).toBeGreaterThanOrEqual(5)
    await page.locator('#pbPause').click()
    expect(errs.list()).toEqual([])
  })
}

for (const [w, h] of [[2048, 1150], [1536, 864]] as const) {
  test(`first view ${w}x${h}: start cards by person, "What this means" in the card, the branch label in one stepper row`, async ({ page }) => {
    const errs = watchErrors(page)
    await page.setViewportSize({ width: w, height: h })
    await openTest(page, 'stroke')
    await expect(page.locator('#picker .tc-startcs b')).toHaveText(['Start with the family', 'Start with Moza', 'Start with Khalid'])
    const means = page.locator('#card .tc-means')
    await expect(means).toContainText('What this means')
    await expect(means).not.toContainText(/your turn/i)
    // Compact: at most three lines of text.
    expect((await means.boundingBox())!.height).toBeLessThan(80)
    await expect(page.locator('ol.stepper .tc-branch')).toHaveCount(0)
    await runToEnd(page)
    await expect(means).not.toContainText(/your turn/i)
    const branch = page.locator('ol.stepper .tc-branch')
    await expect(branch).toHaveText('After Noa decides')
    // The label sits in the same row as the steps, not on a row of its own.
    const tops = await page.locator('ol.stepper > li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
    expect(new Set(tops).size).toBe(1)
    await noHScroll(page)
    expect(errs.list()).toEqual([])
  })
}
