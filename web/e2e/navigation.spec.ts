import { expect, test } from '@playwright/test'
import { PAGE_TITLES } from '../src/domain/views'
import { seedWho } from './helpers'

test("root forwards to Moza's own app on My day", async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/individual\/me$/)
  await expect(page.locator('#pgTitle')).toHaveText(PAGE_TITLES.me)
})

test('a deep link loads its page directly', async ({ page }) => {
  await page.goto('/hospital/ed')
  await expect(page.getByRole('button', { name: 'Emergency arrivals' })).toHaveAttribute('aria-current', 'page')
})

test('tabs navigate on the client', async ({ page }) => {
  await page.goto('/individual/me')
  await page.getByRole('button', { name: /My family health/ }).click()
  await expect(page).toHaveURL(/\/individual\/lineage$/)
  await expect(page.locator('#pgTitle')).toHaveText(PAGE_TITLES.lineage)
})

test('unknown routes show not found', async ({ page }) => {
  await page.goto('/hospital/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.getByRole('link', { name: 'Go to Home' }).click()
  await expect(page).toHaveURL(/\/individual\/me$/)
})

test('fonts load from the bundle', async ({ page }) => {
  await page.goto('/individual/me')
  // Subsets load on demand by unicode-range, so ask for the glyphs explicitly: Latin, then Arabic.
  const latin = await page.evaluate(async () => (await document.fonts.load('16px "Be Vietnam Pro"', 'Moza')).length)
  expect(latin).toBeGreaterThan(0)
  const arabic = await page.evaluate(async () => (await document.fonts.load('16px "IBM Plex Sans Arabic"', 'موزة')).length)
  expect(arabic).toBeGreaterThan(0)
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/^"Be Vietnam Pro", "IBM Plex Sans Arabic"/)
})

// A link to a page that only one role has (My day, Around me, My family health, My phone are Moza's) opens it as that role (AppState, whoForPage).
test('deep link /individual/around opens it as Moza, whatever role was stored', async ({ page }) => {
  await seedWho(page, 'family')
  await page.goto('/individual/around')
  await expect(page).toHaveURL(/\/individual\/around$/)
  await expect(page.locator('#pgTitle')).toHaveText(PAGE_TITLES.around)
  await expect(page.getByRole('button', { name: /Moza \(her own app\)/ })).toHaveAttribute('aria-pressed', 'true')
})

test('the removed individual pages open the first tab of the stored role', async ({ page }) => {
  for (const [who, first] of [['self', 'me'], ['family', 'health']] as const) {
    for (const old of ['home', 'forecast', 'recovery', 'privacy']) {
      await seedWho(page, who)
      await page.goto(`/individual/${old}`)
      await expect(page).toHaveURL(new RegExp(`/individual/${first}$`))
    }
  }
})

test('the removed hospital pages and the old community routes redirect', async ({ page }) => {
  const to: Record<string, string> = {
    '/hospital/panel': '/hospital/patients', '/hospital/patient': '/hospital/patients',
    '/hospital/demand': '/hospital/overview', '/hospital/discharge': '/hospital/overview', '/hospital/loop': '/hospital/overview',
    '/community/community': '/government/population', '/community/watch': '/government/signals',
  }
  for (const [from, target] of Object.entries(to)) {
    await page.goto(from)
    await expect(page).toHaveURL(new RegExp(`${target}$`))
  }
})

test('/hospital/xyz returns the 404 page', async ({ page }) => {
  await page.goto('/hospital/xyz')
  await expect(page).toHaveURL(/\/hospital\/xyz$/)
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('the who switch moves between Moza and the family tabs', async ({ page }) => {
  await page.goto('/individual/me')
  await page.getByRole('button', { name: /Family & carers/ }).click()
  await expect(page).toHaveURL(/\/individual\/health$/)
  await expect(page.getByRole('button', { name: /^.*Treatment$/ })).toBeVisible()
  await page.getByRole('button', { name: /Moza \(her own app\)/ }).click()
  await expect(page).toHaveURL(/\/individual\/me$/)
})

test('the view switcher opens each view at its first tab', async ({ page }) => {
  await page.goto('/individual/me')
  await page.getByRole('button', { name: 'Hospital' }).click()
  await expect(page).toHaveURL(/\/hospital\/overview$/)
  await page.getByRole('button', { name: 'Government' }).click()
  await expect(page).toHaveURL(/\/government\/population$/)
  await page.getByRole('button', { name: 'Individual' }).click()
  await expect(page).toHaveURL(/\/individual\/me$/)
})

test('tips: Hide is remembered across a reload, Show brings them back', async ({ page }) => {
  await page.goto('/individual/me')
  await expect(page.locator('#guide')).toBeVisible()
  await page.getByRole('button', { name: 'Hide tips' }).click()
  await page.reload()
  await expect(page.locator('#guide')).toHaveCount(0)
  await page.getByRole('button', { name: 'Show tips' }).click()
  await expect(page.locator('#guide')).toBeVisible()
})

test('theme: dark is remembered under noa-theme', async ({ page }) => {
  await page.goto('/individual/me')
  await page.getByRole('button', { name: 'Dark mode' }).click()
  await expect(page.locator('body')).toHaveClass(/night/)
  await page.reload()
  await expect(page.locator('body')).toHaveClass(/night/)
  expect(await page.evaluate(() => localStorage.getItem('noa-theme'))).toBe('dark')
})

test("Moza's case walks the three views and closes", async ({ page }) => {
  await page.goto('/individual/me')
  await page.getByRole('button', { name: "Moza's case" }).click()
  await expect(page.locator('#tourBar')).toContainText('1 / 21')
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/\/individual\/health$/)
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/\/hospital\/ed$/)
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/\/hospital\/overview$/)
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Next$/ }).click()
  await expect(page).toHaveURL(/\/government\/population$/)
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.locator('#tourBar')).toHaveCount(0)
})

test('the top bar does not overflow at 390px in English or Arabic', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const lng of ['en', 'ar']) {
    await page.addInitScript((l) => { try { localStorage.setItem('noa-locale', l) } catch { /* ignore */ } }, lng)
    await page.goto('/individual/me')
    const { scrollWidth, clientWidth, right } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      right: Math.max(...Array.from(document.querySelectorAll('.topnav > *, .tn-right > *')).map((e) => e.getBoundingClientRect().right)),
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    expect(right).toBeLessThanOrEqual(clientWidth)
  }
})

test('the care-record stepper follows ?step= and writes it back', async ({ page }) => {
  await seedWho(page, 'self')
  await page.goto('/individual/record?step=res')
  const steps = page.getByRole('list', { name: 'Care record steps' }).getByRole('button')
  await expect(steps).toHaveCount(6)
  await expect(steps.nth(3)).toHaveAttribute('aria-current', 'step')
  await steps.nth(1).click()
  await expect(page).toHaveURL(/\/individual\/record\?step=his$/)
  await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step')
  // An unknown step falls back to the summary.
  await page.goto('/individual/record?step=nope')
  await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step')
})

test('Treatment is step 5 of the six-step record, and the self view says so', async ({ page }) => {
  await seedWho(page, 'self')
  await page.goto('/individual/treatment')
  await expect(page.locator('#pgTitle')).toHaveText('My treatment')
  await expect(page.locator('[data-tour="record-steps"] button[aria-current="step"]')).toContainText('5')
  await expect(page.locator('#guide')).toContainText('Step 5')
})

test('opening a patient shows the clinical record, and the list button takes it back', async ({ page }) => {
  await page.goto('/hospital/patients')
  await page.getByRole('button', { name: /^Open .*Moza/ }).click()
  await expect(page).toHaveURL(/\/hospital\/patients\?patient=moza/)
  await expect(page.locator('[data-tour="chart-steps"] ol button')).toHaveCount(6)
  await page.getByRole('button', { name: /All patient records/ }).click()
  await expect(page).toHaveURL(/\/hospital\/patients$/)
  await expect(page.locator('[data-tour="patient-list"]')).toBeVisible()
})

test("Moza's case: all 21 steps land on their page, role and target, and each target is outlined", async ({ page }) => {
  test.setTimeout(120_000)
  const { TOUR_STEPS, tourPath } = await import('../src/domain/tour')
  await page.goto('/individual/me')
  await page.getByRole('button', { name: "Moza's case" }).click()
  for (const [i, s] of TOUR_STEPS.entries()) {
    await expect(page.locator('#tourBar')).toContainText(`${i + 1} / 21`)
    await expect(page).toHaveURL((u) => u.pathname + u.search === tourPath(s))
    if (s.who) await expect(page.getByRole('button', { name: s.who === 'self' ? /Moza \(her own app\)/ : /Family & carers/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator(`[data-tour="${s.target}"].tour-hl`)).toHaveCount(1)
    if (i < TOUR_STEPS.length - 1) await page.getByRole('button', { name: 'Next', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Finish' }).click()
  await expect(page.locator('#tourBar')).toHaveCount(0)
})

test("Moza's case: Back returns to the previous step, and the night alert step has a Play button", async ({ page }) => {
  await page.goto('/individual/me')
  await page.getByRole('button', { name: "Moza's case" }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/\/individual\/health$/)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/individual\/me$/)
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/\/individual\/live$/)
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
})
