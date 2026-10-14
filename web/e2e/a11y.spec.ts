import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { caseName, measureToneText, openPage, routeCases, type ToneHit } from './helpers'

const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }]

for (const vp of VIEWPORTS) for (const c of routeCases()) {
  test(`axe: no serious or critical violations on ${caseName(c)} at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp)
    await openPage(page, c)
    const { violations } = await new AxeBuilder({ page }).analyze()
    const bad = violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.impact} ${v.id}: ${v.help}\n${v.nodes.slice(0, 6).map((n) => `   ${n.target.join(' ')} ${n.failureSummary?.split('\n')[1] ?? ''}`).join('\n')}`)
    expect(bad, bad.join('\n')).toEqual([])
  })
}

test('axe: the open drawer has no serious or critical violations', async ({ page }) => {
  await openPage(page, { view: 'individual', page: 'home', who: 'family' })
  await page.locator('.kpi[role="button"]').first().click()
  await expect(page.locator('.drawer.on')).toBeVisible()
  const { violations } = await new AxeBuilder({ page }).include('.drawer').analyze()
  expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([])
})

test('keyboard: the drawer closes with Esc and gives focus back to its opener', async ({ page }) => {
  await openPage(page, { view: 'individual', page: 'home', who: 'family' })
  const opener = page.locator('.kpi[role="button"]').first()
  await opener.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.drawer.on')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.drawer.on')).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test('keyboard: tabs are reachable and switch pages with Enter', async ({ page }) => {
  await openPage(page, { view: 'individual', page: 'home', who: 'family' })
  const tab = page.getByRole('button', { name: /Health Lineage/ })
  await tab.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/individual\/lineage$/)
})

test('every 3D canvas has an accessible name', async ({ page }) => {
  let total = 0
  for (const c of routeCases()) {
    await openPage(page, c)
    // Each canvas sits in a `.c3d` host with role="img" and a non-empty aria-label (the name belongs on the host).
    const unnamed = await page.locator('canvas').evaluateAll((els) => els.filter((e) => {
      if (e.getAttribute('aria-hidden') === 'true') return false
      const host = e.closest('.c3d[role="img"]')
      return !host?.getAttribute('aria-label')?.trim()
    }).length)
    total += await page.locator('canvas').count()
    expect(unnamed, caseName(c)).toBe(0)
  }
  // Guards against a vacuous pass: the route list includes pages with the city, district and orbit canvases.
  expect(total).toBeGreaterThan(0)
})

test('axe: the night demo (live page, then the hospital inbox with the new packet) has no serious or critical violations', async ({ page }) => {
  await openPage(page, { view: 'individual', page: 'live', who: 'family' })
  await page.getByRole('button', { name: 'Run the 02:03 night alert demo' }).click()
  // Pause the 2800 ms autoplay at once, so every assertion below sees the step it expects.
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.locator('body')).toHaveClass(/night/)
  // Step 8 (02:07): the packet has reached the hospital.
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Next step' }).click()
  const serious = async () => (await new AxeBuilder({ page }).analyze()).violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.slice(0, 6).map((n) => `${n.target.join(' ')} ${n.failureSummary?.split('\n')[1] ?? ''}`).join(' | ')}`)
  const live = await serious()
  expect(live, live.join('\n')).toEqual([])
  await page.getByRole('button', { name: 'Hospital' }).click()
  await expect(page.locator('.ch', { hasText: 'Pre-arrival inbox' }).getByText('1 new')).toBeVisible()
  const ed = await serious()
  expect(ed, ed.join('\n')).toEqual([])
})

/**
 * R36: axe leaves text on the translucent glass "incomplete", so status-tone text (warn/good/bad, old or new
 * variables) is measured against the rendered pixels behind it and must reach WCAG AA (4.5:1).
 */
const lowTone = (hits: ToneHit[]) => hits.filter((h) => h.ratio < 4.5).map((h) => `${h.ratio.toFixed(2)} ${h.tone} on ${h.bg}: "${h.text}"`)

for (const vp of VIEWPORTS) for (const c of routeCases()) {
  test(`status-tone text reaches 4.5:1 on ${caseName(c)} at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp)
    await openPage(page, c)
    const hits = await measureToneText(page)
    const low = lowTone(hits)
    expect(low, low.join('\n')).toEqual([])
  })
}

test('status-tone text reaches 4.5:1 in the night theme (live page and hospital inbox)', async ({ page }) => {
  await openPage(page, { view: 'individual', page: 'live', who: 'family' })
  await page.getByRole('button', { name: 'Run the 02:03 night alert demo' }).click()
  // Pause the 2800 ms autoplay at once, so every assertion below sees the step it expects.
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Next step' }).click()
  const live = lowTone(await measureToneText(page))
  expect(live, live.join('\n')).toEqual([])
  await page.getByRole('button', { name: 'Hospital' }).click()
  await expect(page.locator('body')).toHaveClass(/night/)
  await expect(page.locator('.ch', { hasText: 'Pre-arrival inbox' }).getByText('1 new')).toBeVisible()
  const hits = await measureToneText(page)
  expect(hits.length).toBeGreaterThan(0)
  const ed = lowTone(hits)
  expect(ed, ed.join('\n')).toEqual([])
})
