import { act, fireEvent, render, screen } from '@testing-library/react'
import { LocaleSwitch } from '@/components/shell/LocaleSwitch'
import i18n, { intlLocale, LANGUAGES } from '@/i18n'

afterEach(async () => {
  await act(() => i18n.changeLanguage('en'))
})

test('two languages: English and Arabic', () => {
  expect(LANGUAGES).toEqual(['en', 'ar'])
})

test('the switch is a two-state group, EN and the Arabic letter, with the language in use pressed', () => {
  render(<LocaleSwitch />)
  const group = screen.getByRole('group', { name: i18n.t('nav.language') })
  const buttons = Array.from(group.querySelectorAll('button'))
  expect(buttons.map((b) => b.textContent)).toEqual(['EN', 'ع'])
  expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false'])
})

test('choosing Arabic sets lang and dir on the document and uses Latin digits; choosing EN restores them', async () => {
  render(<LocaleSwitch />)
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')
  await act(async () => { fireEvent.click(document.getElementById('locale-ar')!) })
  expect(document.documentElement).toHaveAttribute('lang', 'ar')
  expect(document.documentElement).toHaveAttribute('dir', 'rtl')
  expect(document.getElementById('locale-ar')).toHaveAttribute('aria-pressed', 'true')
  expect(intlLocale()).toBe('ar-AE-u-nu-latn')
  expect(new Intl.NumberFormat(intlLocale()).format(1234)).toMatch(/^1.234$/)
  await act(async () => { fireEvent.click(document.getElementById('locale-en')!) })
  expect(document.documentElement).toHaveAttribute('lang', 'en')
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')
})
