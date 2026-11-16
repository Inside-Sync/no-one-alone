import { callKeys, freshCallSound } from '@/features/individual/live/ring'

describe('callKeys and freshCallSound read memberId and params, not the wording', () => {
  test('a NOTIFIED with a memberId rings whatever its text says', () => {
    expect(callKeys([{ at: 'a', kind: 'NOTIFIED', text: 'الاتصال بحمد', memberId: 'david' }])).toEqual(['a الاتصال بحمد'])
  })

  test('a CALLED_115 with params and no memberId dials; one a member reported does not', () => {
    const auto = { at: 'c', kind: 'CALLED_115', text: 'x', params: { number: '998' } }
    expect(callKeys([auto])).toEqual(['c x'])
    expect(freshCallSound([auto], new Set())).toBe('dial')
    expect(callKeys([{ at: 'd', kind: 'CALLED_115', text: 'Calling by hand', actor: 'david', memberId: 'david', params: { number: '998' } }])).toEqual([])
  })

  test('without the codes the "Calling " wording is the fallback', () => {
    expect(callKeys([{ at: 'a', kind: 'NOTIFIED', text: 'x' }])).toEqual([])
    expect(callKeys([{ at: 'a', kind: 'NOTIFIED', text: 'Calling David: x' }])).toEqual(['a Calling David: x'])
  })
})
