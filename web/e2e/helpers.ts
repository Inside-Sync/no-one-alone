import { expect, type Page } from '@playwright/test'
import { PAGE_TITLES, tabsFor, VIEW_IDS, type ViewId, type Who } from '../src/domain/views'

export type RouteCase = { view: ViewId; page: string; who: Who }

/** Every page each role can open: the family sees all three views, Margaret (self) her own individual tabs. */
export function routeCases(): RouteCase[] {
  const out: RouteCase[] = []
  for (const view of VIEW_IDS) for (const t of tabsFor(view, 'family')) out.push({ view, page: t.id, who: 'family' })
  for (const t of tabsFor('individual', 'self')) out.push({ view: 'individual', page: t.id, who: 'self' })
  return out
}

export const caseName = (c: RouteCase) => `${c.who === 'self' ? 'self' : c.view}-${c.page}`

/** Seed the role before any app script runs (AppState reads sessionStorage `noa-app-state`). */
export async function seedWho(page: Page, who: Who) {
  await page.addInitScript((w) => {
    try { sessionStorage.setItem('noa-app-state', JSON.stringify({ who: w, viewer: 'james' })) } catch { /* ignore */ }
  }, who)
}

/** Open a page as a role and wait until its title and data have rendered. */
export async function openPage(page: Page, c: RouteCase) {
  await seedWho(page, c.who)
  await page.goto(`/${c.view}/${c.page}`)
  await expect(page).toHaveURL(new RegExp(`/${c.view}/${c.page}$`))
  await expect(page.locator('#pgTitle')).toHaveText(PAGE_TITLES[c.page])
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

/** WCAG contrast of two sRGB triples. */
export function contrastRgb(a: number[], b: number[]): number {
  const lum = (c: number[]) => {
    const [r, g, bl] = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const x = lum(a), y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/**
 * Tones that colour text: the prototype's --warn/--good/--bad (and the amber #c88a05 used as text), plus the R36 text
 * tones; and (R40) --muted, --brand, teal #1fb39c and --jac with their text tones.
 */
export const TONE_TEXT_COLOURS: Record<string, string> = {
  'rgb(185, 127, 4)': '--warn', 'rgb(31, 143, 95)': '--good', 'rgb(217, 68, 63)': '--bad', 'rgb(200, 138, 5)': 'amber #c88a05',
  'rgb(89, 61, 2)': '--warn-text', 'rgb(16, 74, 49)': '--good-text', 'rgb(119, 37, 35)': '--bad-text',
  'rgb(232, 172, 46)': '--warn-text (night)', 'rgb(79, 195, 140)': '--good-text (night)', 'rgb(255, 123, 116)': '--bad-text (night)',
  // R40: the prototype's muted, brand (per view), teal and jac tones, and their text variables (day and night).
  'rgb(86, 112, 110)': '--muted', 'rgb(11, 127, 113)': '--brand', 'rgb(37, 99, 168)': '--brand (hospital)',
  'rgb(109, 79, 192)': '--brand (community)', 'rgb(31, 179, 156)': 'teal #1fb39c', 'rgb(143, 111, 208)': '--jac',
  'rgb(53, 69, 68)': '--muted-text', 'rgb(6, 74, 66)': '--brand-text', 'rgb(25, 67, 114)': '--brand-text (hospital)',
  'rgb(73, 49, 138)': '--brand-text (community)', 'rgb(13, 74, 64)': '--teal-text', 'rgb(77, 46, 141)': '--jac-text',
  'rgb(168, 162, 182)': '--muted (night)', 'rgb(218, 216, 224)': '--muted-text (night)', 'rgb(14, 165, 146)': '--brand-text (night)', 'rgb(160, 133, 215)': '--jac-text (night)',
  'rgb(88, 150, 218)': '--brand-text (hospital, night)', 'rgb(155, 135, 212)': '--brand-text (community, night)',
}

export type ToneHit = { text: string; tone: string; color: string; bg: string; ratio: number }

/**
 * Axe leaves text on the translucent glass "incomplete". Measure it instead: hide every status-tone text,
 * take one full-page screenshot, and compare each text colour with the median rendered pixel behind it.
 */
export async function measureToneText(page: Page, extraColours: Record<string, string> = {}): Promise<ToneHit[]> {
  const { PNG } = await import('pngjs')
  const tones = { ...TONE_TEXT_COLOURS, ...extraColours }
  // A sticky bar would be painted over the content of a scrolled page in the full-page screenshot.
  await page.evaluate(() => scrollTo(0, 0))
  const found = await page.evaluate((colours) => {
    const out: { i: number; tone: string; color: string; text: string; x: number; y: number; w: number; h: number }[] = []
    let i = 0
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      // Own text with a letter or digit: an emoji-only glyph keeps its own colours whatever CSS `color` says.
      const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent!))
      if (!own) continue
      const cs = getComputedStyle(el)
      const tone = colours[cs.color]
      if (!tone || cs.visibility === 'hidden') continue
      // Only the part that is visible: clip to every ancestor that hides overflow (e.g. a table scrolled sideways
      // at 390 px, whose off-screen headers would otherwise be measured against the page behind the card).
      const b = el.getBoundingClientRect()
      let l = b.left, t = b.top, rr = b.right, bb = b.bottom
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ps = getComputedStyle(p)
        if (ps.overflowX === 'visible' && ps.overflowY === 'visible') continue
        const pr = p.getBoundingClientRect()
        l = Math.max(l, pr.left); t = Math.max(t, pr.top); rr = Math.min(rr, pr.right); bb = Math.min(bb, pr.bottom)
      }
      const r = { left: l, top: t, width: rr - l, height: bb - t }
      if (r.width < 2 || r.height < 2) continue
      el.dataset.toneProbe = String(i)
      out.push({ i: i++, tone, color: cs.color, text: el.textContent!.trim().slice(0, 40), x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height })
    }
    return out
  }, tones)
  if (!found.length) return []
  const style = await page.addStyleTag({ content: '[data-tone-probe]{color:transparent!important;text-shadow:none!important}[data-tone-probe]::before{background:transparent!important}' })
  const png = PNG.sync.read(await page.screenshot({ fullPage: true, animations: 'disabled' }))
  await style.evaluate((s) => (s as Element).remove())
  const hits: ToneHit[] = []
  for (const f of found) {
    const px: number[][] = []
    for (let y = Math.floor(f.y); y < Math.min(png.height, Math.ceil(f.y + f.h)); y++) {
      for (let x = Math.floor(f.x); x < Math.min(png.width, Math.ceil(f.x + f.w)); x++) {
        const k = (y * png.width + x) * 4
        px.push([png.data[k], png.data[k + 1], png.data[k + 2]])
      }
    }
    if (!px.length) continue
    px.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
    const bg = px[Math.floor(px.length / 2)]
    const fg = f.color.match(/\d+/g)!.slice(0, 3).map(Number)
    hits.push({ text: f.text, tone: f.tone, color: f.color, bg: `rgb(${bg.join(',')})`, ratio: contrastRgb(fg, bg) })
  }
  return hits
}
