import { APP_PROGRESS, emergencyReducer, orbitTargets, PACKET_STEP, resolveStepView, SLA, STEPS, TICK_MS, type EmState } from '@/domain/emergency'

const init: EmState = { active: false, step: 0, playing: false }

test('ten steps, verbatim ends, 2800 ms tick', () => {
  expect(STEPS).toHaveLength(10)
  expect(STEPS[0]).toMatchObject({ t: '02:03', ph: 'Verify', m: 0, lv: 'Checking' })
  expect(STEPS[9]).toMatchObject({ t: '02:21', ph: 'Hand off', d: 'Ambulance arrives · stroke team ready', lv: 'Help arrived' })
  expect(STEPS.map((s) => s.m)).toEqual([0, 1, 1, 1, 1, 2, 3, 4, 8, 18])
  expect(TICK_MS).toBe(2800)
  expect(APP_PROGRESS).toEqual([0, 0, 0, 0, 0, 0.12, 0.32, 0.58, 1, 1])
  expect(SLA).toHaveLength(5)
  expect(PACKET_STEP).toBe(7)
  expect(STEPS[PACKET_STEP].t).toBe('02:07')
})

test('start begins playing at step 0', () => {
  expect(emergencyReducer({ active: false, step: 6, playing: false }, { type: 'start' })).toEqual({ active: true, step: 0, playing: true })
})

test('tick advances, then stops at the last step', () => {
  let s = emergencyReducer(init, { type: 'start' })
  s = emergencyReducer(s, { type: 'tick' })
  expect(s).toEqual({ active: true, step: 1, playing: true })
  for (let i = 0; i < 20; i++) s = emergencyReducer(s, { type: 'tick' })
  expect(s).toMatchObject({ step: 9, playing: false })
})

test('play at the end restarts from step 0', () => {
  expect(emergencyReducer({ active: true, step: 9, playing: false }, { type: 'play' })).toMatchObject({ step: 0, playing: true })
  expect(emergencyReducer({ active: true, step: 4, playing: false }, { type: 'play' })).toMatchObject({ step: 4, playing: true })
})

test('next, prev and goto pause the player and clamp', () => {
  const playing: EmState = { active: true, step: 2, playing: true }
  expect(emergencyReducer(playing, { type: 'next' })).toEqual({ active: true, step: 3, playing: false })
  expect(emergencyReducer(playing, { type: 'prev' })).toEqual({ active: true, step: 1, playing: false })
  expect(emergencyReducer({ active: true, step: 0, playing: true }, { type: 'prev' })).toMatchObject({ step: 0 })
  expect(emergencyReducer({ active: true, step: 9, playing: false }, { type: 'next' })).toMatchObject({ step: 9 })
  expect(emergencyReducer(playing, { type: 'goto', step: 7 })).toMatchObject({ step: 7, playing: false })
  expect(emergencyReducer(playing, { type: 'goto', step: 99 })).toMatchObject({ step: 9 })
  expect(emergencyReducer(playing, { type: 'goto', step: -3 })).toMatchObject({ step: 0 })
})

test('pause stops playing; end resets everything', () => {
  expect(emergencyReducer({ active: true, step: 3, playing: true }, { type: 'pause' })).toEqual({ active: true, step: 3, playing: false })
  expect(emergencyReducer({ active: true, step: 8, playing: true }, { type: 'end' })).toEqual({ active: false, step: 0, playing: false })
})

test('actions do nothing while no alert is active', () => {
  for (const type of ['tick', 'next', 'prev', 'play', 'pause'] as const) expect(emergencyReducer(init, { type })).toBe(init)
})

test('own fields carry forward when a step omits them (null keeps the old value)', () => {
  expect(resolveStepView(STEPS, 0).own).toEqual(['David · not yet alerted', '450 m away · first to call', '—'])
  expect(resolveStepView(STEPS, 5).own[0]).toBe('David · on his way')
  const v6 = resolveStepView(STEPS, 6)
  expect(v6.own).toEqual(['David · on his way', 'Owns the case', '5′'])
  expect(resolveStepView(STEPS, 8).own).toEqual(['David · with Margaret', 'On scene since 02:11', '✓'])
  expect(resolveStepView(STEPS, 9).own[0]).toBe('David · with Margaret')
})

test('what, sub and help carry forward', () => {
  expect(resolveStepView(STEPS, 0)).toMatchObject({ what: 'Heart rate 142, not moving', sub: 'The agent is checking before waking anyone', help: null })
  expect(resolveStepView(STEPS, 3)).toMatchObject({ what: 'Suspected stroke signs', sub: 'Last known well 01:55' })
  expect(resolveStepView(STEPS, 4)).toMatchObject({ what: 'Suspected stroke signs' })
  expect(resolveStepView(STEPS, 5).help).toBe('David · 6 min away')
  expect(resolveStepView(STEPS, 7).help).toBe('David · 4 min away')
  expect(resolveStepView(STEPS, 9)).toMatchObject({ what: 'On the way to Camperdown', sub: '30-day recovery plan starts after discharge', help: 'David is going with you' })
})

test('resolveStepView does not mutate STEPS', () => {
  const before = JSON.stringify(STEPS)
  resolveStepView(STEPS, 9)
  expect(JSON.stringify(STEPS)).toBe(before)
})

test('orbit targets map the steps onto the prototype modes', () => {
  expect(orbitTargets(0)).toEqual({ mode: 'check', app: 0, call: 0, hosp: 0, arrived: 0 })
  expect(orbitTargets(2).mode).toBe('check')
  expect(orbitTargets(3).mode).toBe('sos')
  expect(orbitTargets(4)).toMatchObject({ call: 0.35 })
  expect(orbitTargets(6)).toMatchObject({ call: 1, hosp: 0 })
  expect(orbitTargets(7)).toMatchObject({ hosp: 1, arrived: 0, app: 0.58 })
  expect(orbitTargets(9)).toEqual({ mode: 'sos', app: 1, call: 1, hosp: 1, arrived: 1 })
})
