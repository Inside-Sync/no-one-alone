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
  await expect(page).toHaveURL(/\/individual\/live$/)
  await expect(page.locator('body')).toHaveClass(/night/)
  const phone = page.locator('#devLive')
  await expect(phone).toBeVisible()

  // Step 2 has the Yes / No buttons. Next also pauses the player.
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
  const flash = await page.locator('#devLive .dev-flash').evaluate((e) => getComputedStyle(e).animationName)
  expect(flash).toBe('none')
  expect(await page.locator('.em-tag i').evaluate((e) => getComputedStyle(e).animationName)).toBe('none')
  await page.getByRole('button', { name: 'Next step' }).click()
  await page.getByRole('button', { name: 'Next step' }).click()
  expect(await page.locator('#devLive .listen i').first().evaluate((e) => getComputedStyle(e).animationName)).toBe('none')
})
