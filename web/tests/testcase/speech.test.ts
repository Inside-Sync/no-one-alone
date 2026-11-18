import { BASE_SECS, lcsMask, lev, samples, scoreSpeech, sentenceTxt, words, type Lang, type PersonId } from '@/features/testcase/engine'
import oracle from './fixtures/prototype-oracle.json'
import { make, t, text } from './helpers'

/** Fixtures in `fixtures/prototype-oracle.json` come from the prototype's own `scoreSpeech`, `lev`, `lcsMask`, `words`. */
describe('speech scoring is the prototype\'s', () => {
  test('the usual time to say the sentence is 4.5 seconds', () => expect(BASE_SECS).toBe(4.5))

  test.each(oracle.speech.map((o) => [`${o.pk} ${o.lang} "${o.said}" ${o.secs ?? 'typed'}`, o] as const))('%s', (_n, o) => {
    const e = make('own')
    e.setPerson(o.pk as PersonId)
    const target = text(e, sentenceTxt(o.lang as Lang, o.pk as PersonId))
    const r = scoreSpeech(o.said, o.secs, target, o.lang as Lang, 'typed')
    expect(r.score).toBe(o.r.score)
    expect(r.lvl).toBe(o.r.lvl)
    expect(r.matched).toBe(o.r.matched)
    expect(r.total).toBe(o.r.total)
    expect(r.wpm).toBe(o.r.wpm)
    expect(r.ratio).toBe(o.r.ratio)
    expect(r.match).toBeCloseTo(o.r.match, 10)
    expect(r.mask).toEqual(o.r.mask)
    expect(r.target).toEqual(o.r.target)
  })

  test.each(oracle.lev.map((o) => [`${o.a}/${o.b}`, o] as const))('lev %s', (_n, o) => expect(lev(o.a, o.b)).toBe(o.d))
  test.each(oracle.lcs.map((o, i) => [String(i), o] as const))('lcsMask %s', (_n, o) => expect(lcsMask(o.a, o.b)).toEqual(o.m))
  test.each(oracle.words.map((o) => [o.l, o] as const))('words (%s) drops punctuation and Arabic marks', (_n, o) => expect(words(o.s, o.l as Lang)).toEqual(o.w))

  test('levels: 0.8 and over green, 0.6 to 0.8 amber, under 0.6 red; no words is 0', () => {
    const target = 'My name is Moza and I live in Abu Dhabi'
    expect(scoreSpeech(target, 4.3, target, 'en', 'sample')).toMatchObject({ score: 1, lvl: 'green', matched: 10, total: 10, wpm: 140 })
    expect(scoreSpeech(target, 11.2, target, 'en', 'sample')).toMatchObject({ lvl: 'green' }) // right words, slow: 0.75 + 0.1 = 0.85
    expect(scoreSpeech('my name is moza and i live', null, target, 'en', 'typed')).toMatchObject({ lvl: 'amber', score: 0.7 })
    expect(scoreSpeech('my … nay … mo … abu', 11.2, target, 'en', 'sample')).toMatchObject({ lvl: 'red' })
    expect(scoreSpeech('', null, target, 'en', 'typed')).toMatchObject({ score: 0, lvl: 'red', wpm: null, matched: 0 })
  })
  test('typed text has no timing: no ratio, no words per minute, the score is the match', () => {
    const r = scoreSpeech('my name is moza and i live in abu dhabi', null, 'My name is Moza and I live in Abu Dhabi', 'en', 'typed')
    expect(r).toMatchObject({ secs: null, ratio: null, wpm: null, score: 1, mode: 'typed' })
  })
  test('one typo is allowed on words over 3 letters, none on short words', () => {
    expect(lcsMask(['moza', 'live'], ['moze', 'lime'])).toEqual([true, true])
    expect(lcsMask(['is', 'in'], ['it', 'on'])).toEqual([false, false])
  })
})

describe('the ready-made answers', () => {
  test.each([['en'], ['ar']] as const)('usual speech scores green, slurred red, none is no answer (%s)', (lang) => {
    const e = make('own')
    e.setLang(lang)
    e.sampleSpeech('usual')
    expect(e.S.speech.home).toMatchObject({ lvl: 'green', score: 1, mode: 'sample', lang })
    const e2 = make('own')
    e2.setLang(lang)
    e2.sampleSpeech('slurred')
    expect(e2.S.speech.home?.lvl).toBe('red')
    const e3 = make('own')
    e3.setLang(lang)
    e3.sampleSpeech('none')
    expect(e3.S.speech.home).toMatchObject({ said: '', lvl: 'red', score: 0 })
    expect(e3.S.ans).toBe('none')
  })
  test('the samples are the prototype\'s, with the person\'s name', () => {
    const s = samples(t, 'moza')
    expect(s.usual.en).toEqual(['My name is Moza and I live in Abu Dhabi', 4.3])
    expect(s.usual.ar).toEqual([oracle.samples.moza.usual.ar[0], 4.4])
    expect(s.slurred.en).toEqual(oracle.samples.moza.slurred.en)
    expect(s.slurred.ar).toEqual(oracle.samples.moza.slurred.ar)
    expect(s.none.en).toEqual(['', null])
    expect(text(make('own'), s.usual.label)).toBe('Use Moza’s usual speech')
  })
  test('the English sentence keeps the English name when the app language is Arabic', () => {
    const e = make('own')
    expect(text(e, sentenceTxt('en', 'moza'))).toBe('My name is Moza and I live in Abu Dhabi')
    expect(text(e, sentenceTxt('ar', 'moza'))).toBe('اسمي موزة وأعيش في أبوظبي')
  })
  test('speaking and typing score the same way and submit', () => {
    const e = make('own')
    e.setInputToggle('still', true)
    e.setInput('hr', 138); e.setInput('dur', 12)
    e.play(); e.drain()
    e.spokenSpeech('My name is Moza and I live in Abu Dhabi', 4.4)
    expect(e.S.speech.home).toMatchObject({ mode: 'spoken', lvl: 'green' })
    expect(e.db.checkins.at(-1)).toMatchObject({ checkin_id: 'C-01' })
    expect(text(e, e.db.checkins.at(-1)!.detail)).toBe('score 1.00 · 10/10 words · 4.4 s')
    e.typedSpeech('   ')
    expect(e.db.checkins).toHaveLength(1)
    e.typedSpeech('my name is moza')
    expect(text(e, e.db.checkins.at(-1)!.detail)).toMatch(/^score 0\.\d\d · 4\/10 words · typed$/)
  })
})
