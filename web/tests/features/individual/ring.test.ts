import { callKeys, dialSequence, freshCallSound, ringPattern } from '@/features/individual/live/ring'

const total = (p: { ms: number }[]) => p.reduce((a, x) => a + x.ms, 0)

test('ringPattern(4000): 400 on, 200 off, 400 on, 2000 off, then the next ring, total 4000', () => {
  const p = ringPattern(4000)
  expect(p.slice(0, 4)).toEqual([{ on: true, ms: 400 }, { on: false, ms: 200 }, { on: true, ms: 400 }, { on: false, ms: 2000 }])
  expect(total(p)).toBe(4000)
})

test('the last segment is cut at totalMs', () => {
  const p = ringPattern(3500)
  expect(total(p)).toBe(3500)
  expect(p[p.length - 1]).toEqual({ on: false, ms: 100 })
})

test('callKeys: one key per call to a nearby member, other events ignored', () => {
  const tl = [
    { at: 'a', kind: 'NOTIFIED', text: 'Calling David: Margaret may be having a stroke.' },
    { at: 'a', kind: 'NOTIFIED', text: 'James notified' },
    { at: 'b', kind: 'EXPIRED', text: 'David did not answer in 3 s' },
    { at: 'b', kind: 'NOTIFIED', text: 'Calling Aisha: Margaret may be having a stroke.' },
  ]
  expect(callKeys(tl)).toEqual(['a Calling David: Margaret may be having a stroke.', 'b Calling Aisha: Margaret may be having a stroke.'])
})

test('callKeys: the automatic 000 call is a call key', () => {
  const tl = [{ at: 'c', kind: 'NO_NEARBY', text: 'No one nearby accepted' }, { at: 'c', kind: 'CALLED_115', text: 'Calling 000 automatically with the call script (demo call)' }]
  expect(callKeys(tl)).toEqual(['c Calling 000 automatically with the call script (demo call)'])
})

test('callKeys: a member pressing "called 000" does not ring', () => {
  expect(callKeys([{ at: 'd', kind: 'CALLED_115', text: 'David called 000' }])).toEqual([])
})

const call = (at: string, text: string) => ({ at, kind: 'NOTIFIED', text })
const auto000 = { at: 'c', kind: 'CALLED_115', text: 'Calling 000 automatically with the call script (demo call)' }

test('freshCallSound: silent for calls already there, ring for a new family call, dial for the automatic 000 call', () => {
  const seen = new Set(callKeys([call('a', 'Calling David: x')]))
  expect(freshCallSound([call('a', 'Calling David: x')], seen)).toBeNull()
  expect(freshCallSound([call('a', 'Calling David: x'), call('b', 'Calling Aisha: x')], seen)).toBe('ring')
  expect(freshCallSound([call('a', 'Calling David: x'), call('b', 'Calling Aisha: x'), auto000], seen)).toBe('dial')
  expect(freshCallSound([call('a', 'Calling David: x'), call('b', 'Calling Aisha: x'), auto000], seen)).toBeNull()
})

test('dialSequence: three DTMF zeros, a pause, then the Australian ring', () => {
  const s = dialSequence(6000)
  const zero = { freqs: [941, 1336], ms: 180 }
  const gap = { freqs: [], ms: 120 }
  expect(s.slice(0, 6)).toEqual([zero, gap, zero, gap, zero, { freqs: [], ms: 700 }])
  const ring = s.slice(s.findIndex((t) => t.freqs.join() === '400,450'))
  expect(total(ring)).toBe(6000)
})

test('freshCallSound: the same story-time call in a new incident dials again', () => {
  const seen = new Set(callKeys([auto000], 'run1'))
  expect(freshCallSound([auto000], seen, 'run1')).toBeNull()
  expect(freshCallSound([auto000], seen, 'run2')).toBe('dial')
})
