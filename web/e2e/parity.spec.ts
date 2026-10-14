import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { tabsFor } from '../src/domain/views'
import { caseName, openPage, routeCases, type RouteCase } from './helpers'

/**
 * Visual parity with the artifact (Ruling R34): every view x page, both individual roles,
 * at 1440x900 and 390x844. The prototype is opened from disk, driven by its own buttons,
 * and compared with the app (mock data, no Maps key) using pixelmatch.
 *
 * Excluded from the comparison on both sides (painted over in both images):
 * - `.c3d` canvases (animated 3D scenes, compared by their own unit tests);
 * - `.device` on live/device, the phone frame that Ruling R22 makes taller.
 * The `#flash` overlay (Ruling R25) is hidden; it is transparent unless a demo runs.
 * Animations and transitions are frozen and both sides use the same local font files.
 *
 * Image pairs and diffs are written to e2e/parity/ (gitignored) for review.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const PROTO_URL = 'file://' + resolve(HERE, '../docs/reference/prototype.html')
const OUT = join(HERE, 'parity')
const FONTS = resolve(HERE, '../node_modules/@fontsource')
const LIMIT = 3 // % of pixels

const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }]

/**
 * Pages whose remaining gap is not a fidelity bug. Key: `<case>-<width>`.
 * `max` is the highest % accepted; the reason is reported in the Task 14 report.
 */
const LOCKED = 'Review Focus 1: a card James may not see is not rendered (96 px placeholder), where the prototype keeps the blurred card at full height; at 390 px each such card is its own row, so the page is shorter'
const PHONE = "Ruling R22: Margaret's phone frame is 300:780 (28 pt text, 92 px targets) vs 300:600; the frame is masked but everything below it moves down"
const PRIVACY = 'Task 11 brief: the privacy page adds the audit list card ("Changes you made") and the clinician note in "In an emergency", which the prototype page lacks'
const ACCEPTED: Record<string, { max: number; reason: string }> = {
  'individual-home-390': { max: 20.5, reason: `${LOCKED} (Daily rhythm, Her home today); plus the Task 7 brief's Approve button on the "Needs approval" plan task, which wraps that row` },
  'individual-health-390': { max: 22.5, reason: `${LOCKED} (Mood, last 2 weeks)` },
  'individual-device-1440': { max: 13.5, reason: PHONE },
  'self-device-1440': { max: 13.5, reason: PHONE },
  'individual-device-390': { max: 15.5, reason: PHONE },
  'self-device-390': { max: 15.5, reason: PHONE },
  'self-privacy-1440': { max: 11, reason: PRIVACY },
  'self-privacy-390': { max: 8.5, reason: PRIVACY },
}

const FREEZE = `
*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}
#flash,.flash{visibility:hidden!important}
`

/** Serve the Google Fonts request of the prototype from the same @fontsource files the app bundles. */
async function localGoogleFonts(page: Page) {
  const css = ['be-vietnam-pro/300', 'be-vietnam-pro/400', 'be-vietnam-pro/500', 'be-vietnam-pro/600', 'be-vietnam-pro/700',
    'jetbrains-mono/400', 'jetbrains-mono/500', 'jetbrains-mono/600']
    .map((f) => {
      const pkg = f.split('/')[0]
      return readFileSync(join(FONTS, f + '.css'), 'utf8').replace(/url\(\.\/files\//g, `url(https://fonts.gstatic.com/local/${pkg}/`)
    })
    .join('\n')
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: css }))
  await page.route('https://fonts.gstatic.com/local/**', (r) => {
    const [pkg, file] = new URL(r.request().url()).pathname.replace('/local/', '').split('/')
    return r.fulfill({ contentType: 'font/woff2', body: readFileSync(join(FONTS, pkg, 'files', file)) })
  })
}

/** Click without scrolling the element into view (a scrolled tab bar would differ from the app's). */
async function press(page: Page, selector: string) {
  await page.locator(selector).first().evaluate((e: HTMLElement) => e.click())
}

async function openPrototype(page: Page, c: RouteCase) {
  await localGoogleFonts(page)
  await page.goto(PROTO_URL)
  if (c.who === 'self') await press(page, '#whoSeg button[data-who="self"]')
  await press(page, `.views button[data-view="${c.view}"]`)
  if (tabsFor(c.view, c.who)[0].id !== c.page) await press(page, `#tabs button[data-go="${c.page}"]`)
  await expect(page.locator(`main[data-page="${c.page}"]`)).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
}

type Rect = { x: number; y: number; w: number; h: number }

async function settle(page: Page, c: RouteCase): Promise<Rect[]> {
  // The fixed backdrop scene stretches over the whole full-page capture, so a page that is a few
  // pixels taller would shift every background pixel. Pin it to the first viewport on both sides.
  const vh = page.viewportSize()!.height
  await page.addStyleTag({ content: FREEZE + `.scene{position:absolute!important;inset:0 0 auto 0!important;height:${vh}px!important}` })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
  const sel = ['.c3d', ...(c.page === 'live' || c.page === 'device' ? ['.device'] : [])].join(',')
  return page.evaluate((s) => Array.from(document.querySelectorAll(s))
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({ x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height })), sel)
}

function paintRects(png: PNG, rects: Rect[]) {
  for (const r of rects) {
    const x0 = Math.max(0, Math.floor(r.x))
    const y0 = Math.max(0, Math.floor(r.y))
    const x1 = Math.min(png.width, Math.ceil(r.x + r.w))
    const y1 = Math.min(png.height, Math.ceil(r.y + r.h))
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * png.width + x) * 4
      png.data[i] = 255; png.data[i + 1] = 0; png.data[i + 2] = 255; png.data[i + 3] = 255
    }
  }
}

/** Copy into a w x h canvas (cropping wider sources); the area outside the source stays transparent black, so a height gap counts as difference. */
function padTo(png: PNG, w: number, h: number): PNG {
  const out = new PNG({ width: w, height: h })
  PNG.bitblt(png, out, 0, 0, Math.min(png.width, w), Math.min(png.height, h), 0, 0)
  return out
}

mkdirSync(OUT, { recursive: true })

for (const vp of VIEWPORTS) {
  test.describe(`parity ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp })
    for (const c of routeCases()) {
      const key = `${caseName(c)}-${vp.width}`
      test(`parity: ${key}`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 })
        const proto = await ctx.newPage()
        await openPrototype(proto, c)
        const protoRects = await settle(proto, c)
        const protoPng = PNG.sync.read(await proto.screenshot({ fullPage: true }))

        const appCtx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, baseURL: 'http://localhost:5173' })
        const app = await appCtx.newPage()
        await openPage(app, c)
        const appRects = await settle(app, c)
        const appPng = PNG.sync.read(await app.screenshot({ fullPage: true }))

        // Compare the viewport width. The prototype's own overflow at 390 px (Around her news filter, 449 px) is the
        // horizontal-scroll bug the 360 px rule fixes in the app; it is reported via the width in the result line.
        const w = vp.width
        const h = Math.max(protoPng.height, appPng.height)
        const a = padTo(protoPng, w, h)
        const b = padTo(appPng, w, h)
        for (const img of [a, b]) paintRects(img, [...protoRects, ...appRects])
        const diff = new PNG({ width: w, height: h })
        const n = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1 })
        const pct = (n / (w * h)) * 100

        writeFileSync(join(OUT, `${key}-proto.png`), PNG.sync.write(a))
        writeFileSync(join(OUT, `${key}-app.png`), PNG.sync.write(b))
        writeFileSync(join(OUT, `${key}-diff.png`), PNG.sync.write(diff))
        const line = `${key}\t${pct.toFixed(2)}%\tproto ${protoPng.width}x${protoPng.height}\tapp ${appPng.width}x${appPng.height}`
        writeFileSync(join(OUT, `${key}.txt`), line + '\n')
        test.info().annotations.push({ type: 'parity', description: line })
        await ctx.close()
        await appCtx.close()

        const max = ACCEPTED[key]?.max ?? LIMIT
        expect(pct, `${line}${ACCEPTED[key] ? ` (accepted: ${ACCEPTED[key].reason})` : ''}`).toBeLessThanOrEqual(max)
      })
    }
  })
}
