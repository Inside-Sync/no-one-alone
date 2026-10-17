import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/** Colour emoji (pictographs, dingbats, misc technical, ℹ). `✓ ✕ ☾` are monochrome text glyphs and stay allowed. */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2139}]/u
const TEXT_GLYPHS = new Set(['✓', '✕', '☾'])
const hasEmoji = (s: string) => [...s].some((c) => EMOJI.test(c) && !TEXT_GLYPHS.has(c))

/** Speech and chat lines in Noa's or Margaret's own voice, where an emoji is part of the message. */
const VOICE = new Set([
  'chat.json:greet.self', 'chat.json:greet.fam', 'live.json:agent.phone.sleep', 'me.json:hello',
  'me.json:recovery.noa.welcome', 'data/margaret.json:margaret.ownView.greeting',
])

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p, ext) : ext.test(n) ? [p] : []
  })
}

/** Source without comments (line numbers kept), so a doc comment quoting the prototype's emoji is not a use. */
const code = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

function strings(node: unknown, path: string, out: [string, string][]): [string, string][] {
  if (typeof node === 'string') out.push([path, node])
  else if (Array.isArray(node)) node.forEach((v, i) => strings(v, `${path}[${i}]`, out))
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) strings(v, path ? `${path}.${k}` : k, out)
  return out
}

test('UI code draws icons, not emoji', () => {
  const offenders = files('src', /\.tsx?$/).flatMap((f) =>
    code(f).split('\n').flatMap((line, i) => (hasEmoji(line) ? [`${f}:${i + 1}`] : [])))
  expect(offenders).toEqual([])
})

test('locale strings carry no emoji outside spoken lines', () => {
  const offenders = files('src/locales', /\.json$/).flatMap((f) => {
    const rel = relative('src/locales', f).split('/').slice(1).join('/')
    return strings(JSON.parse(readFileSync(f, 'utf8')), '', [])
      .filter(([path, s]) => hasEmoji(s) && !VOICE.has(`${rel}:${path}`))
      .map(([path]) => `${f}:${path}`)
  })
  expect(offenders).toEqual([])
})
