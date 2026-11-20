import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { contrastRgb, openPage } from './helpers'

/**
 * The "Noa · family health" panel on the Individual Family health tab (stream C): the auto-run, journeys, the emergency
 * night, Reset, the record drawer, phone width, Arabic, and axe plus measured text contrast in light, dark and emergency.
 */
const FH = { view: 'individual', page: 'lineage', who: 'self' } as const
const panel = (page: Page) => page.locator('#fh-panel')
const now = (page: Page) => page.locator('#fh-now')
const nextBtn = (page: Page) => panel(page).getByRole('button', { name: /^Next/ })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

/** Press Next until `done` holds (or the journey ends), waiting for the engine between presses. */
async function nextUntil(page: Page, done: () => Promise<boolean>, max = 25) {
  for (let i = 0; i < max && !(await done()); i++) {
    await expect(nextBtn(page)).toBeEnabled()
    await nextBtn(page).click()
  }
}

test('Family health is the landing tab and auto-runs Saeed’s case up to the alert (Noa stops at Detect)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page).toHaveURL(/\/individual\/lineage$/)
  await expect(page.getByRole('heading', { name: 'Noa · family health' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open Saeed’s record' })).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  await expect(now(page).getByText('Saeed Al Nuaimi')).toBeVisible()
  await expect(now(page).getByRole('button', { name: 'Start the check now' })).toBeVisible({ timeout: 20_000 })
  await expect(now(page).getByText(/Noa has sent Saeed a prompt/)).toBeVisible()
  await expect(panel(page).getByRole('list', { name: 'Journey' }).locator('li').nth(1)).not.toHaveClass(/cur|done/)
  await expect(nextBtn(page)).toBeEnabled()
  // Nothing past Detect runs by itself.
  await page.waitForTimeout(1500)
  await expect(now(page).getByText('Triggered check')).toHaveCount(0)
  await now(page).getByRole('button', { name: 'Start the check now' }).click()
  await expect(now(page).getByText('Triggered check')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('#fh-wi')).not.toHaveAttribute('open', '')
  await expect(panel(page).getByRole('button', { name: /^Show family tree/ })).toBeVisible()
})

test('Khalid’s journey reaches the referral', async ({ page }) => {
  await openPage(page, FH)
  await panel(page).getByRole('button', { name: 'Reset', exact: true }).click()
  await now(page).getByRole('button', { name: /Khalid, 38/ }).click()
  await now(page).getByRole('button', { name: 'Start home screening' }).click()
  await expect(now(page).getByText('What may Noa use, and who may see the pathway?')).toBeVisible()
  await nextUntil(page, async () => (await now(page).getByRole('button', { name: 'Choose someone else' }).count()) > 0)
  await expect(panel(page).getByRole('list', { name: 'Journey' }).locator('li').last()).toContainText('Referral')
  await expect(now(page).getByText(/Referred to the right pathway/)).toBeVisible()
  // The tree is the strip of chips once a check has started: the status is in the chip's name.
  await expect(page.getByRole('button', { name: /^Open Khalid’s record/ })).toHaveAccessibleName(/Booked/)
})

test('an emergency (s2) turns the app to night; Reset brings the day back', async ({ page }) => {
  await openPage(page, FH)
  await page.locator('[data-tc="s2"] button').click()
  await now(page).getByRole('button', { name: 'Start the check now' }).click()
  await expect(now(page).getByText('Triggered check')).toBeVisible()
  await nextBtn(page).click()
  await expect(now(page).getByRole('alert')).toContainText('Saeed should see a doctor now')
  await expect(page.locator('body')).toHaveClass(/night/)
  await panel(page).getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.locator('body')).not.toHaveClass(/night/)
})

test('after Reset another person’s journey runs (Hind)', async ({ page }) => {
  await openPage(page, FH)
  await panel(page).getByRole('button', { name: 'Reset', exact: true }).click()
  await page.getByRole('button', { name: 'Open Hind’s record' }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('#fh-drawer')).toHaveAttribute('aria-hidden', 'true')
  await nextUntil(page, async () => (await now(page).getByRole('button', { name: 'Choose someone else' }).count()) > 0)
  await expect(now(page).getByText(/Referred to the right pathway/)).toBeVisible()
  await expect(now(page).getByText('Hind Al Mansoori').first()).toBeVisible()
})

test('the record drawer: edit data and re-run', async ({ page }) => {
  await openPage(page, FH)
  await page.getByRole('button', { name: 'Open Khalid’s record' }).click()
  const drawer = page.locator('#fh-drawer')
  await expect(drawer).toHaveAttribute('aria-hidden', 'false')
  await expect(drawer.getByRole('button', { name: 'Close record' })).toBeFocused()
  const hr = drawer.getByRole('spinbutton', { name: /Resting heart/ })
  await hr.fill('130')
  await drawer.getByRole('button', { name: /Re-run Noa for Khalid/ }).click()
  await expect(drawer).toHaveAttribute('aria-hidden', 'true')
  await expect(now(page).locator('details').first()).toBeVisible()
  await expect(now(page).getByText(/Auto-prompt/).first()).toBeVisible()
})

test('390 px: no horizontal overflow; the composer sticks to the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openPage(page, FH)
  await expect(now(page).getByRole('button', { name: 'Start the check now' })).toBeVisible()
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(over).toBeLessThanOrEqual(0)
  const pos = await page.locator('#fh-ask').evaluate((e) => getComputedStyle(e.parentElement as Element).position)
  expect(pos).toBe('sticky')
})

test('Arabic: the panel chrome is translated and right to left', async ({ page }) => {
  await openPage(page, FH, 'ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'نوا · صحة العائلة' })).toBeVisible()
  await expect(panel(page).getByRole('button', { name: 'إعادة الضبط' })).toBeVisible()
  // The tree mirrors: Moza (left pair in English) is on the right.
  const moza = await page.locator('[data-person="moza"]').boundingBox()
  const saeed = await page.locator('[data-person="saeed"]').boundingBox()
  expect(moza!.x).toBeGreaterThan(saeed!.x)
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(over).toBeLessThanOrEqual(0)
})

/* ---------------------------------------------------------------- accessibility */

/** Every text in the panel (and open drawer) against the median pixel behind it: 4.5:1, or 3:1 for large text. */
async function lowContrast(page: Page, scope: string) {
  const { PNG } = await import('pngjs')
  await page.evaluate(() => scrollTo(0, 0))
  const found = await page.evaluate((sel) => {
    const out: { color: string; text: string; x: number; y: number; w: number; h: number; large: boolean }[] = []
    let i = 0
    for (const root of Array.from(document.querySelectorAll(sel))) {
      for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
        const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent!))
        if (!own) continue
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue
        if (el.closest('[aria-hidden="true"],details:not([open]) > :not(summary),[hidden],:disabled')) continue // disabled controls are exempt (WCAG 1.4.3)
        // Only the visible part: clip to every ancestor that hides overflow (the scrolling history list).
        const r0 = el.getBoundingClientRect()
        let l = r0.left, t = r0.top, rr = r0.right, bb = r0.bottom
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ps = getComputedStyle(p)
          if (ps.overflowX === 'visible' && ps.overflowY === 'visible') continue
          const pr = p.getBoundingClientRect()
          l = Math.max(l, pr.left); t = Math.max(t, pr.top); rr = Math.min(rr, pr.right); bb = Math.min(bb, pr.bottom)
        }
        const b = { left: l, top: t, width: rr - l, height: bb - t, bottom: bb }
        if (b.width < 2 || b.height < 2 || b.bottom < 0) continue
        const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700
        el.dataset.cprobe = String(i++)
        out.push({ color: cs.color, text: el.textContent!.trim().slice(0, 50), x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height, large: size >= 24 || (bold && size >= 18.66) })
      }
    }
    return out
  }, scope)
  const style = await page.addStyleTag({ content: '[data-cprobe]{color:transparent!important;text-shadow:none!important;caret-color:transparent!important}[data-cprobe]::placeholder{color:transparent!important}' })
  const png = PNG.sync.read(await page.screenshot({ fullPage: true, animations: 'disabled' }))
  await style.evaluate((s) => (s as Element).remove())
  const bad: string[] = []
  for (const f of found) {
    const px: number[][] = []
    for (let y = Math.max(0, Math.floor(f.y)); y < Math.min(png.height, Math.ceil(f.y + f.h)); y++) {
      for (let x = Math.max(0, Math.floor(f.x)); x < Math.min(png.width, Math.ceil(f.x + f.w)); x++) {
        const k = (y * png.width + x) * 4
        px.push([png.data[k], png.data[k + 1], png.data[k + 2]])
      }
    }
    if (!px.length) continue
    px.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
    const bg = px[Math.floor(px.length / 2)]
    const m = f.color.match(/[\d.]+/g)!.map(Number)
    const alpha = m[3] ?? 1
    const fg = m.slice(0, 3).map((v, j) => Math.round(v * alpha + bg[j] * (1 - alpha)))
    const r = contrastRgb(fg, bg)
    if (r < (f.large ? 3 : 4.5)) bad.push(`"${f.text}" ${f.color} on rgb(${bg.join(',')}) ${r.toFixed(2)}`)
  }
  return bad
}
const serious = async (page: Page, include: string) => (await new AxeBuilder({ page }).include(include).analyze()).violations
  .filter((v) => v.impact === 'serious' || v.impact === 'critical')
  .map((v) => `${v.id}: ${v.nodes.slice(0, 5).map((n) => n.target.join(' ')).join(' | ')}`)

for (const theme of ['light', 'dark'] as const) {
  test(`panel: axe and text contrast (${theme})`, async ({ page }) => {
    test.setTimeout(90_000)
    await openPage(page, FH, 'en', theme)
    await expect(now(page).getByRole('button', { name: 'Start the check now' })).toBeVisible()
    // Open the folded parts so they are checked too.
    await page.evaluate(() => document.querySelectorAll('#fh-panel details').forEach((d) => { (d as HTMLDetailsElement).open = true }))
    expect(await serious(page, '#fh-panel')).toEqual([])
    expect(await lowContrast(page, '#fh-panel')).toEqual([])
    await page.getByRole('button', { name: 'Open Moza’s record' }).click()
    await expect(page.locator('#fh-drawer')).toHaveAttribute('aria-hidden', 'false')
    expect(await serious(page, '#fh-drawer')).toEqual([])
    expect(await lowContrast(page, '#fh-drawer')).toEqual([])
  })
}

for (const theme of ['light', 'dark'] as const) {
  test(`panel at the referral (pathway, pills, flags): axe and text contrast (${theme})`, async ({ page }) => {
    test.setTimeout(120_000)
    await openPage(page, FH, 'en', theme)
    await nextUntil(page, async () => (await now(page).getByRole('button', { name: 'Choose someone else' }).count()) > 0)
    await page.evaluate(() => document.querySelectorAll('#fh-panel details').forEach((d) => { (d as HTMLDetailsElement).open = true }))
    expect(await serious(page, '#fh-panel')).toEqual([])
    expect(await lowContrast(page, '#fh-panel')).toEqual([])
  })
}

test('panel: axe and text contrast in an emergency (night)', async ({ page }) => {
  test.setTimeout(90_000)
  await openPage(page, FH)
  await page.locator('[data-tc="s2"] button').click()
  await nextBtn(page).click() // the go card
  await expect(now(page).getByText('Triggered check')).toBeVisible()
  await nextBtn(page).click()
  await expect(page.locator('body')).toHaveClass(/night/)
  expect(await serious(page, '#fh-panel')).toEqual([])
  expect(await lowContrast(page, '#fh-panel')).toEqual([])
})

test('messages: toast, panel and Ask Noa (axe clean when open)', async ({ page }) => {
  await openPage(page, FH)
  const fab = page.locator('#fh-fab')
  await expect(fab).toHaveAccessibleName(/Noa messages, \d+ new/)
  await fab.click()
  const chat = page.locator('#fh-chat')
  await expect(chat).toHaveAttribute('aria-hidden', 'false')
  await expect(chat.getByRole('textbox', { name: 'Ask Noa' })).toBeFocused()
  await chat.getByRole('textbox', { name: 'Ask Noa' }).fill('What is happening now?')
  await page.keyboard.press('Enter')
  await expect(chat.getByText(/I’m working on|Tap anyone in the family tree/)).toBeVisible()
  expect(await serious(page, '#fh-chat')).toEqual([])
  await page.keyboard.press('Escape')
  await expect(chat).toHaveAttribute('aria-hidden', 'true')
  await expect(fab).toBeFocused()
})

test('Try it: a slider drag and a scenario change Noa’s answer live; Run re-runs with them', async ({ page }) => {
  await openPage(page, FH)
  const wi = page.locator('#fh-wi')
  await expect(wi).toHaveAttribute('open', '')
  await expect(wi.getByText('Noa checks on Saeed now: speech test, then a doctor today')).toBeVisible()
  const hr = wi.getByRole('slider', { name: 'Resting heart' })
  await hr.focus()
  for (let i = 0; i < 56; i++) await page.keyboard.press('ArrowLeft')
  await expect(hr).toHaveValue('72')
  await expect(wi.getByText('All calm: routine screening only')).toBeVisible()
  await wi.getByRole('button', { name: 'BP crisis' }).click()
  await expect(wi.getByText('Noa asks for a doctor today, before any screening')).toBeVisible()
  await wi.getByRole('button', { name: 'Run Noa with these readings' }).click()
  await expect(now(page).getByRole('button', { name: 'Start the check now' })).toBeVisible()
  await wi.locator('summary').click()
  await expect(wi).not.toHaveAttribute('open', '')
  await expect(wi.getByText('BP 184/112')).toBeVisible()
})

test('quick test cases: every “Run this case” sits at the bottom of its card, in a row they line up', async ({ page }) => {
  for (const [w, lang] of [[1440, 'en'], [390, 'en'], [1440, 'ar']] as const) { // ar last: openPage's locale init script stays on the page
    await page.setViewportSize({ width: w, height: 900 })
    await openPage(page, FH, lang)
    const cards = page.locator('#fh-tcs [data-tc]')
    const n = await cards.count()
    for (let i = 0; i < n; i++) {
      const c = await cards.nth(i).boundingBox(), b = await cards.nth(i).locator('button').boundingBox()
      expect(Math.abs(c!.y + c!.height - (b!.y + b!.height))).toBeLessThanOrEqual(12)
    }
  }
})

test('the Noa logo is centred in its circles (top nav, messages button, messages header)', async ({ page }) => {
  await openPage(page, FH)
  await page.locator('#fh-fab').click()
  const off = await page.evaluate(() => {
    const centre = (e: Element) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] }
    const pairs: [Element | null, Element | null | undefined][] = [
      [document.querySelector('.topnav .logo'), document.querySelector('.topnav .logo svg')],
      [document.getElementById('fh-fab'), document.querySelector('#fh-fab svg')],
      [document.querySelector('#fh-chat svg')?.closest('span[class*="orb2"]') ?? null, document.querySelector('#fh-chat svg')],
    ]
    return pairs.map(([box, svg]) => { const a = centre(box!), b = centre(svg!); return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) })
  })
  for (const d of off) expect(d).toBeLessThanOrEqual(1)
})
