import { textTone, toneVar } from '@/lib/tone'

test('textTone maps status colours to the R36 text variables and passes others through', () => {
  expect(textTone('var(--warn)')).toBe('var(--warn-text)')
  expect(textTone('#c88a05')).toBe('var(--warn-text)')
  expect(textTone('#B97F04')).toBe('var(--warn-text)')
  expect(textTone('#1f8f5f')).toBe('var(--good-text)')
  expect(textTone('var(--bad)')).toBe('var(--bad-text)')
  expect(textTone('#d9443f')).toBe('var(--bad-text)')
  expect(textTone('#2f6fb0')).toBe('#2f6fb0')
  expect(textTone(undefined)).toBeUndefined()
})

test('R40: muted, brand, teal and jac map to their text variables', () => {
  expect(textTone('var(--muted)')).toBe('var(--muted-text)')
  expect(textTone('#56706e')).toBe('var(--muted-text)')
  expect(textTone('var(--brand)')).toBe('var(--brand-text)')
  expect(textTone('#0b7f71')).toBe('var(--teal-text)')
  expect(textTone('#1fb39c')).toBe('var(--teal-text)')
  expect(textTone('var(--jac)')).toBe('var(--jac-text)')
  expect(textTone('#8F6FD0')).toBe('var(--jac-text)')
  expect(textTone(undefined)).toBeUndefined()
})

test('toneVar uses the text variable for status tones only', () => {
  expect(toneVar('warn')).toBe('var(--warn-text)')
  expect(toneVar('good')).toBe('var(--good-text)')
  expect(toneVar('bad')).toBe('var(--bad-text)')
  expect(toneVar('muted')).toBe('var(--muted-text)')
  expect(toneVar('brand')).toBe('var(--brand-text)')
  expect(toneVar('jac')).toBe('var(--jac-text)')
  expect(toneVar('ink')).toBe('var(--ink)')
})
