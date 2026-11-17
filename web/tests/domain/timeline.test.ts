import type { IncidentDoc, TimelineDoc } from '@/data/contract'
import { agentView, isSpeechCheckTurn } from '@/domain/agent'
import { helperStatus, liveView, timelineLine, type LivePeople } from '@/domain/incident'
import { entryMember, isAutoCall, isCallEntry, isMemberCall, timelineText } from '@/domain/timeline'
import i18n from '@/i18n'

const T0 = Date.parse('2026-10-15T22:03:00Z')
const at = (s: number) => new Date(T0 + s * 1000).toISOString()

const people = {
  person: {
    displayName: 'Moza Al Hammadi', timezone: 'Asia/Dubai', emergencyNumber: '998',
    circle: [
      { memberId: 'james', relation: 'son', role: 'DISTANT', priority: 1, criticalAlerts: true },
      { memberId: 'david', relation: 'brother', role: 'NEARBY', priority: 2, criticalAlerts: true },
    ],
  },
  members: { james: { displayName: 'Khalid Al Hammadi' }, david: { displayName: 'Hamad Al Hammadi' } },
} as unknown as LivePeople

const fixed = (lng: string) => i18n.getFixedT(lng, 'live') as (k: string, o?: object) => string
const ar = (key: string, opts?: Record<string, unknown>): string => fixed('ar')(key, opts)
const en = (key: string, opts?: Record<string, unknown>): string => fixed('en')(key, opts)

const names: Record<string, string> = { james: 'Khalid', david: 'Hamad' }
const ctx = { name: (id: string) => names[id] ?? id, hospital: { id: 'h1', name: 'Corniche Stroke Centre' } }
const e = (kind: string, extra: Partial<TimelineDoc> = {}, text = 'backend text'): TimelineDoc => ({ at: at(0), actor: 'SYSTEM', kind, text, ...extra }) as TimelineDoc

afterEach(async () => { await i18n.changeLanguage('en') })

describe('call entries: memberId and params first, the English wording only without them', () => {
  test('NOTIFIED with a memberId is a member call whatever its text says', () => {
    expect(isMemberCall(e('NOTIFIED', { memberId: 'david' }, 'x'))).toBe(true)
    expect(isCallEntry(e('NOTIFIED', { memberId: 'david' }, 'x'))).toBe(true)
  })
  test('an older NOTIFIED is a call only by its "Calling " wording', () => {
    expect(isMemberCall(e('NOTIFIED', {}, 'Calling David: x'))).toBe(true)
    expect(isMemberCall(e('NOTIFIED', {}, 'x'))).toBe(false)
  })
  test("CALLED_115 without a memberId but with params is Noa's own call, whatever its text says", () => {
    expect(isAutoCall(e('CALLED_115', { params: { number: '998' } }, 'x'))).toBe(true)
    expect(isCallEntry(e('CALLED_115', { params: { number: '998' } }, 'x'))).toBe(true)
  })
  test('CALLED_115 reported by a member is not a call, even when its text begins "Calling "', () => {
    expect(isAutoCall(e('CALLED_115', { actor: 'david', memberId: 'david', params: { number: '998' } }, 'Calling by hand'))).toBe(false)
  })
  test("an older CALLED_115 is Noa's call by its \"Calling \" wording", () => {
    expect(isAutoCall(e('CALLED_115', {}, 'Calling 000 automatically with the call script (demo call)'))).toBe(true)
    expect(isAutoCall(e('CALLED_115', { actor: 'david' }, 'David called 000'))).toBe(false)
  })
  test('entryMember: memberId, else the name in the wording, else the actor', () => {
    const byName = (n: string) => (n === 'Hamad Al Hammadi' ? 'david' : n)
    expect(entryMember(e('EXPIRED', { memberId: 'david' }, 'x'), byName)).toBe('david')
    expect(entryMember(e('EXPIRED', {}, 'Hamad Al Hammadi did not answer in 5 s'), byName)).toBe('david')
    expect(entryMember(e('NOTIFIED', {}, 'Calling Hamad Al Hammadi: help'), byName)).toBe('david')
    expect(entryMember(e('ACCEPTED', { actor: 'david' }, 'x'), byName)).toBe('david')
  })
})

describe('helperStatus reads memberId, not the wording', () => {
  const withTl = (...timeline: object[]) => ({ status: 'ESCALATING', timeline }) as unknown as IncidentDoc

  test('NOTIFIED and EXPIRED named by memberId, with text that names no one', () => {
    const calling = e('NOTIFIED', { memberId: 'james' }, 'x')
    const expired = { ...e('EXPIRED', { memberId: 'james' }, 'x'), at: at(5) }
    const next = { ...e('NOTIFIED', { memberId: 'david' }, 'x'), at: at(6) }
    expect(helperStatus(withTl(calling), people)?.text).toBe("I'm calling Khalid now. Please stay sitting.")
    expect(helperStatus(withTl(calling, expired, next), people)?.text).toBe(
      "Khalid didn't answer, so I've left him a message. I'm calling Hamad now.")
  })

  test('Arabic text in the entry does not matter', () => {
    const s = helperStatus(withTl(e('NOTIFIED', { memberId: 'david' }, 'الاتصال بحمد')), people)
    expect(s?.text).toBe("I'm calling Hamad now. Please stay sitting.")
  })

  test('without memberId the wording still finds the member', () => {
    const s = helperStatus(withTl(e('NOTIFIED', {}, 'Calling Hamad Al Hammadi: help')), people)
    expect(s?.text).toBe("I'm calling Hamad now. Please stay sitting.")
  })

  test('an auto call coded by params and an accept by memberId', () => {
    const inc = withTl(
      e('NOTIFIED', { memberId: 'david' }, 'x'),
      { ...e('ACCEPTED', { actor: 'david', memberId: 'david' }, 'x'), at: at(2) },
      { ...e('CALLED_115', { params: { number: '998' } }, 'x'), at: at(3) },
    )
    expect(helperStatus(inc, people)?.text).toBe("Hamad is on his way. He has a key. I'm calling 998 now.")
  })
})

describe('timelineText: the line in the UI language from kind, memberId and params', () => {
  const lines: [string, Partial<TimelineDoc>, string, Record<string, unknown>][] = [
    ['ALERT', { params: { hr: 142, movementMin: 10 } }, 'ALERT', { hr: 142, min: 10 }],
    ['AGENT_FALLBACK', { params: { step: 'TRIAGE' } }, 'fallback.TRIAGE', {}],
    ['ANSWERED', { params: { answer: 'YES' } }, 'answered.YES', {}],
    ['ANSWERED', { params: { answer: 'NO' } }, 'answered.NO', {}],
    ['ANSWERED', { params: { noSpeech: true } }, 'answered.noSpeech', {}],
    ['NO_REPLY', { params: { count: 1 } }, 'NO_REPLY', {}],
    ['ALERTED', { params: { memberIds: ['james'] } }, 'ALERTED', { names: 'Khalid' }],
    ['ALERTED', { params: { memberIds: ['james'], suspectedStroke: true } }, 'ALERTED_STROKE', { names: 'Khalid' }],
    ['NOTIFIED', { memberId: 'david', params: { etaMin: 6, attempt: 1 } }, 'NOTIFIED_ETA', { name: 'Hamad', eta: 6 }],
    ['NOTIFIED', { memberId: 'james', params: {} }, 'NOTIFIED', { name: 'Khalid' }],
    ['EXPIRED', { memberId: 'james', params: { seconds: 25, voicemail: true } }, 'EXPIRED_VOICEMAIL', { name: 'Khalid', seconds: 25 }],
    ['EXPIRED', { memberId: 'david', params: { seconds: 25, voicemail: false } }, 'EXPIRED', { name: 'Hamad', seconds: 25 }],
    ['ACCEPTED', { memberId: 'david' }, 'ACCEPTED', { name: 'Hamad' }],
    ['DECLINED', { memberId: 'david' }, 'DECLINED', { name: 'Hamad' }],
    ['ARRIVED', { memberId: 'david' }, 'ARRIVED', { name: 'Hamad' }],
    ['NO_NEARBY', {}, 'NO_NEARBY', {}],
    ['CALLED_115', { params: { number: '998' } }, 'CALLED_115_AUTO', { number: '998' }],
    ['CALLED_115', { actor: 'david', memberId: 'david', params: { number: '998' } }, 'CALLED_115_MEMBER', { name: 'Hamad', number: '998' }],
    ['HANDOFF_RECEIVED', { params: { hospitalId: 'h1' } }, 'HANDOFF_RECEIVED', {}],
    ['HANDOFF_FAILED', { params: { hospitalId: 'h1' } }, 'HANDOFF_FAILED', { hospital: 'Corniche Stroke Centre' }],
    ['CLOSED', { params: { by: 'CHECKIN' } }, 'closed.CHECKIN', {}],
    ['CLOSED', { params: { by: 'CONSOLE' } }, 'closed.CONSOLE', {}],
    ['DISCHARGED', { params: { staffName: 'Dr Sara' } }, 'DISCHARGED', { name: 'Dr Sara' }],
  ]

  test.each(lines)('%s in English and Arabic', async (kind, extra, key, vars) => {
    const entry = e(kind, extra, 'English text from the backend')
    expect(timelineText(entry, ctx)).toBe(en(`line.${key}`, vars))
    await i18n.changeLanguage('ar')
    const line = timelineText(entry, ctx)
    expect(line).toBe(ar(`line.${key}`, vars))
    expect(line).not.toBe('English text from the backend')
  })

  test('several members are joined with the separator of the language', async () => {
    const entry = e('ALERTED', { params: { memberIds: ['james', 'david'] } })
    expect(timelineText(entry, ctx)).toBe('Alerted Khalid, Hamad')
    await i18n.changeLanguage('ar')
    expect(timelineText(entry, ctx)).toBe(ar('line.ALERTED', { names: `Khalid${ar('line.sep')}Hamad` }))
    expect(ar('line.sep')).not.toBe(', ')
  })

  test("TRIAGED names the level in the language and keeps the agent's reasons", async () => {
    const entry = e('TRIAGED', { params: { level: 'EMERGENCY', reasons: ['slurred speech', 'weakness'] } })
    expect(timelineText(entry, ctx)).toBe('Level Emergency: slurred speech, weakness')
    await i18n.changeLanguage('ar')
    expect(timelineText(entry, ctx)).toBe(ar('line.TRIAGED', { level: ar('line.level.EMERGENCY'), reasons: `slurred speech${ar('line.sep')}weakness` }))
  })

  test('without the codes a line needs, the backend text is shown as is', () => {
    for (const entry of [
      e('ALERT', {}, 'HR 142, no movement 10 min'), e('NOTIFIED', {}, 'Calling Hamad: help'), e('ACCEPTED', { actor: 'david' }, 'Hamad accepted'),
      e('EXPIRED', {}, 'Hamad did not answer in 5 s'), e('CALLED_115', {}, 'Calling 000 automatically'), e('CLOSED', {}, 'Closed after check-in'),
      e('TRIAGED', {}, 'Level EMERGENCY: x'), e('ALERTED', {}, 'Alert sent to all'), e('HANDOFF_FAILED', { params: { hospitalId: 'other' } }, 'Could not reach X'),
    ]) expect(timelineText(entry, ctx)).toBe(entry.text)
  })

  test("text the agent writes in her language is never replaced", () => {
    for (const kind of ['ASKED', 'VERIFIED', 'FALSE_ALARM', 'FAMILY_UPDATE', 'HANDOFF_SENT']) {
      expect(timelineText(e(kind, { params: { step: 'OPENING', hr: 1, movementMin: 1, hospitalId: 'h1' } }, 'free text'), ctx)).toBe('free text')
    }
    expect(timelineText(e('ANSWERED', {}, 'نعم'), ctx)).toBe('نعم')
  })
})

describe('the timeline rows, the latest agent line and the hospital line use the translated text', () => {
  const inc = {
    personId: 'margaret', scenario: 'STROKE', status: 'ESCALATING', level: 'EMERGENCY', version: 1, createdAt: at(0), updatedAt: at(50),
    alert: { kind: 'HR_HIGH_NO_MOVEMENT', at: at(0), hr: 142, movementMin: 10 }, ownerId: null,
    triage: { reasons: ['slurred speech'], fallback: false },
    timeline: [
      { at: at(0), actor: 'SYSTEM', kind: 'ALERT', text: 'HR 142, no movement 10 min', params: { hr: 142, movementMin: 10 } },
      { at: at(40), actor: 'SYSTEM', kind: 'NOTIFIED', text: 'Calling Khalid Al Hammadi: help', memberId: 'james', params: {} },
      { at: at(50), actor: 'SYSTEM', kind: 'EXPIRED', text: 'Khalid Al Hammadi did not answer in 25 s', memberId: 'james', params: { seconds: 25, voicemail: true } },
    ],
    demo: { timerSeconds: 25, noReplySeconds: 20, clockOffsetMs: 0 },
  } as unknown as IncidentDoc

  test('liveView.timeline in English and Arabic', async () => {
    expect(liveView('i', inc, people, T0 + 60_000).timeline.map((r) => r.d)).toEqual([
      'HR 142, no movement 10 min', 'Calling Khalid', 'Khalid did not answer in 25 s · voicemail and text sent',
    ])
    await i18n.changeLanguage('ar')
    expect(liveView('i', inc, people, T0 + 60_000).timeline.map((r) => r.d)).toEqual([
      ar('line.ALERT', { hr: 142, min: 10 }), ar('line.NOTIFIED', { name: 'Khalid' }), ar('line.EXPIRED_VOICEMAIL', { name: 'Khalid', seconds: 25 }),
    ])
  })

  test("an entry without the codes shows its own text", () => {
    const old = { ...inc, timeline: inc.timeline.map(({ at: a, actor, kind, text }) => ({ at: a, actor, kind, text })) } as unknown as IncidentDoc
    expect(liveView('i', old, people, T0 + 60_000).timeline.map((r) => r.d)).toEqual(old.timeline.map((x) => x.text))
  })

  test('agentView.now is the latest line in the UI language', async () => {
    const done = { ...inc, checkIn: { mode: 'VOICE', noReplyCount: 0, busy: false, done: true, turns: [] } } as unknown as IncidentDoc
    expect(agentView(done, people).now).toBe('Khalid did not answer in 25 s · voicemail and text sent')
    await i18n.changeLanguage('ar')
    expect(agentView(done, people).now).toBe(ar('line.EXPIRED_VOICEMAIL', { name: 'Khalid', seconds: 25 }))
  })

  test('timelineLine names the hospital from the handoff', () => {
    const failed = { ...inc, handoff: { hospitalId: 'h1', hospitalName: 'Corniche Stroke Centre (demo)', status: 'FAILED' } } as unknown as IncidentDoc
    const entry = e('HANDOFF_FAILED', { params: { hospitalId: 'h1' } }, 'Could not reach Corniche Stroke Centre (demo)')
    expect(timelineLine(failed, people, entry)).toBe('Could not reach Corniche Stroke Centre')
  })
})

describe('the speech check is found by the turn kind first, its words only as the fallback', () => {
  const phrase = () => en('speech.phrase')

  test('kind SPEECH_CHECK wins over words that match nothing', () => {
    expect(isSpeechCheckTurn({ kind: 'SPEECH_CHECK', text: 'قولي بعدي: السماء زرقاء' })).toBe(true)
    expect(isSpeechCheckTurn({ kind: 'SPEECH_CHECK', text: 'anything at all' })).toBe(true)
  })
  test('another kind is not the speech check even when the words match', () => {
    expect(isSpeechCheckTurn({ kind: 'SYMPTOMS', text: `Please say: ${phrase()}` })).toBe(false)
  })
  test('without a kind the words decide', () => {
    expect(isSpeechCheckTurn({ text: `Please say after me: ${phrase()}.` })).toBe(true)
    expect(isSpeechCheckTurn({ text: 'Are you all right?' })).toBe(false)
  })
  test('agentView follows the kind when the wording is unknown', () => {
    const turns = [
      { by: 'AGENT', at: at(10), text: 'مرحباً', kind: 'OPENING' },
      { by: 'PERSON', at: at(20), text: 'نعم' },
      { by: 'AGENT', at: at(30), text: 'ردّدي خلفي', kind: 'SPEECH_CHECK' },
      { by: 'PERSON', at: at(40), text: '...', assessment: { clarity: 'SLURRED' } },
    ]
    const inc = {
      status: 'CHECKING_IN', version: 1, alert: { kind: 'HR_HIGH_NO_MOVEMENT', at: at(0) }, ownerId: null, timeline: [],
      checkIn: { mode: 'VOICE', noReplyCount: 0, busy: false, done: false, turns }, demo: { timerSeconds: 5, noReplySeconds: 10, clockOffsetMs: 0 },
    } as unknown as IncidentDoc
    expect(agentView(inc, people).steps.find((s) => s.key === 'speech')?.state).toBe('fail')
    const untagged = { ...inc, checkIn: { ...inc.checkIn, turns: turns.map(({ by, at: a, text, assessment }) => ({ by, at: a, text, assessment })) } } as unknown as IncidentDoc
    expect(agentView(untagged, people).steps.find((s) => s.key === 'speech')?.state).toBe('')
  })
})
