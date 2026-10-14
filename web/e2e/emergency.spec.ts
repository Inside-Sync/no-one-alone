import { expect, test } from '@playwright/test'

/**
 * Ruling R21: jsdom cannot measure CSS Module styles, so the 28 pt / 92 px rule for
 * Margaret's screen is checked here against the real dev server.
 */
const MIN_TEXT_PX = 37.33 // 28 pt
const MIN_TARGET_PX = 92

test('Margaret\'s screen: text is at least 28 pt and buttons at least 92 px tall', async ({ page }) => {
  await page.goto('/individual/home')
  await page.getByRole('button', { name: /Night alert demo/ }).click()
  // Pause the 2800 ms autoplay at once, so every assertion below sees the step it expects.
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page).toHaveURL(/\/individual\/live$/)
  await expect(page.locator('body')).toHaveClass(/night/)
  const phone = page.locator('#devLive')
  await expect(phone).toBeVisible()

  // Step 2 has the Yes / No buttons.
  await page.getByRole('button', { name: 'Next step' }).click()
  await expect(phone.getByText("Margaret, it's your check-in. Can you hear me?")).toBeVisible()

  const sizes = await phone.locator('.dev-h, .dev-q, .dev-b').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)))
  expect(sizes.length).toBeGreaterThanOrEqual(4)
  for (const px of sizes) expect(px).toBeGreaterThanOrEqual(MIN_TEXT_PX)

  const yesNo = phone.locator('.dev-b')
  await expect(yesNo).toHaveCount(2)
  for (let i = 0; i < 2; i++) {
    const box = await yesNo.nth(i).boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TARGET_PX)
    expect(box!.width).toBeGreaterThanOrEqual(MIN_TARGET_PX)
  }

  // The help line (step 6) is text too.
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next step' }).click()
  await expect(phone.getByText('David · 6 min away')).toBeVisible()
  const help = await phone.locator('.dev-help').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))
  expect(help).toBeGreaterThanOrEqual(MIN_TEXT_PX)
})

test('the demo is operable by keyboard and End removes the night theme', async ({ page }) => {
  await page.goto('/individual/live')
  await page.getByRole('button', { name: 'Run the 02:03 night alert demo' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('body')).toHaveClass(/night/)
  await page.getByRole('button', { name: 'Next step' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Calls Margaret by voice/)).toBeVisible()
  await page.getByRole('button', { name: 'End demo' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('body')).not.toHaveClass(/night/)
  await expect(page.getByRole('heading', { name: 'No active alert' })).toBeVisible()
})

test('the screen does not overflow its frame at any step and the page does not scroll sideways at 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/individual/live')
  await page.getByRole('button', { name: 'Run the 02:03 night alert demo' }).click()
  // Pause the 2800 ms autoplay at once, so every assertion below sees the step it expects.
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  for (let i = 0; i < 9; i++) {
    await page.getByRole('button', { name: 'Next step' }).click()
    const clipped = await page.locator('#devLive').evaluate((e) => {
      const r = e.getBoundingClientRect()
      return Array.from(e.children).some((c) => c.getBoundingClientRect().bottom > r.bottom + 1)
    })
    expect(clipped, `step ${i + 1}`).toBe(false)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('reduced motion turns off the flash, the pulse and the listening bars', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/individual/live')
  await page.getByRole('button', { name: 'Run the 02:03 night alert demo' }).click()
  // Pause the 2800 ms autoplay at once, so every assertion below sees the step it expects.
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const flash = await page.locator('#devLive .dev-flash').evaluate((e) => getComputedStyle(e).animationName)
  expect(flash).toBe('none')
  expect(await page.locator('.em-tag i').evaluate((e) => getComputedStyle(e).animationName)).toBe('none')
  await page.getByRole('button', { name: 'Next step' }).click()
  await page.getByRole('button', { name: 'Next step' }).click()
  expect(await page.locator('#devLive .listen i').first().evaluate((e) => getComputedStyle(e).animationName)).toBe('none')
})

test('full night demo plays to "Help arrived" and the hospital inbox shows 1 new', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/individual/home')
  await page.getByRole('button', { name: /Night alert demo/ }).click()
  await expect(page).toHaveURL(/\/individual\/live$/)
  await expect(page.locator('#emTag')).toHaveText('Checking')
  // Autoplay: 10 steps, one every 2.8 s.
  await expect(page.locator('#emTag')).toHaveText('Help arrived', { timeout: 60_000 })
  await expect(page.locator('#devLive').getByText("The ambulance is here. You're in good hands.")).toBeVisible()

  await page.getByRole('button', { name: 'Hospital' }).click()
  await expect(page).toHaveURL(/\/hospital\/ed$/)
  await expect(page.locator('.ch', { hasText: 'Pre-arrival inbox' }).getByText('1 new')).toBeVisible()
  await expect(page.getByRole('button', { name: /Pre-arrivals/ }).locator('.badge')).toHaveText('1')
})

/** Hash of the canvas backing store, to tell a still frame from a moving one. */
async function canvasFrames(page: import('@playwright/test').Page, sel: string, gapMs: number) {
  const grab = () => page.locator(sel).first().evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let lit = 0
    let h = 0
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 0) lit++; h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) | 0 }
    return { lit, h }
  })
  const a = await grab()
  await page.waitForTimeout(gapMs)
  const b = await grab()
  return { a, b }
}

test('reduced motion: canvases still draw a frame but do not rotate on their own', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const path of ['/individual/home', '/community/community']) {
    await page.goto(path)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    await expect(page.locator('.c3d[role="img"]').first()).toHaveAttribute('aria-label', /.+/)
    await page.waitForTimeout(500)
    const { a, b } = await canvasFrames(page, 'canvas', 1200)
    expect(a.lit, `${path} draws`).toBeGreaterThan(1000)
    expect(b.h, `${path} is still`).toBe(a.h)
  }
})

test('without reduced motion the city canvas animates (control for the test above)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/individual/home')
  await expect(page.locator('canvas').first()).toBeVisible()
  await page.waitForTimeout(500)
  const { a, b } = await canvasFrames(page, 'canvas', 1200)
  expect(b.h).not.toBe(a.h)
})
