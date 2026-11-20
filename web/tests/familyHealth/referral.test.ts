import { type FamilyHealthEngine, type PersonId, type TestCaseId, type Txt } from '@/features/familyHealth'
import { T, TAR, drive, engine } from './helpers'

/** Noa stops at Detect on the go card; start the check right away (Next). */
const pastGo = async (e: FamilyHealthEngine) => { await e.whenIdle(); if (e.getSnapshot().pending?.type === 'go') { e.next(); await e.whenIdle() } }
const runCase = async (e: FamilyHealthEngine, id: TestCaseId) => { void e.runTestCase(id); await pastGo(e) }
const start = async (e: FamilyHealthEngine, who: PersonId) => { void e.startJourney(who); await pastGo(e) }

describe('the referral Hospital > Referrals shows', () => {
  test('s0 (Saeed, racing heart): booked checks, doctor items, the speech check and the Courier note', async () => {
    const e = engine()
    await runCase(e, 's0')
    const s = await drive(e)
    const r = s.referral
    expect(r).not.toBeNull()
    if (!r) return
    expect(r.person).toBe('saeed')
    expect(r.id).toBe('fh-saeed-1')
    expect(T(r.title)).toBe('Saeed Al Nuaimi, 64')
    expect(T(r.to)).toBe('Al Mushrif FHC · Dr Omar Haddad')
    expect(T(r.from)).toBe('Noa · Courier, Specialist agent')
    expect(T(r.why)).toMatch(/\S/)
    expect(r.understood).toBe(true)
    expect(r.booked.length).toBeGreaterThan(0)
    expect(r.booked.every((b) => T(b.name) && T(b.where) && T(b.when) && b.u)).toBe(true)
    expect(r.forDoctor.length).toBeGreaterThan(0)
    expect(r.forDoctor.every((d) => T(d.text) && d.u && T(d.due))).toBe(true)
    // Speech check first, with its numbers (amber, then usual on the retry).
    expect(r.speech).toMatchObject({ lvl: 'green', matched: 7, total: 7 })
    expect(r.homeResults[0].id).toBe('speech')
    expect(T(r.homeResults[0].label)).toBe('Noa Speech Check')
    expect(T(r.homeResults[0].txt)).toMatch(/^as usual · score 1\.00 · 7\/7 words/)
    expect(r.homeResults[0].lvl).toBe('good')
    // Red flags in plain words.
    expect(r.answers.map((a) => [T(a.label), T(a.value)])).toContainEqual(['Red flags right now', 'Just my heart pounding'])
    expect(T(r.preferences)).toMatch(/^One visit for everything · Week\S* \S+.* · speaks Arabic$/)
    expect(T(r.consent)).toMatch(/^Pathway shared with /)
    expect(T(r.slot)).toMatch(/\S/)
    // The note is the text the Courier turn shows in the feed.
    const courier = s.feed.filter((f) => f.kind === 'agent' && f.agent === 'courier')
    expect(courier).toHaveLength(1)
    const shown = courier[0].kind === 'agent' ? courier[0].text : null
    expect(r.note.text).toEqual(shown)
    expect(r.note.source).toBe('prepared')
    expect(T(r.note.text as Txt)).toContain('Saeed Al Nuaimi')
    expect(r.createdAt).toMatch(/^\d\d:\d\d$/)
    // Every text has an Arabic form.
    expect(TAR(r.title)).toContain('64')
    expect(TAR(r.from)).toContain('نوا')
  })

  test('a non-urgent journey carries the questionnaires and the symptom answer', async () => {
    const e = engine()
    await start(e, 'khalid')
    const s = await drive(e)
    const r = s.referral
    expect(r).not.toBeNull()
    if (!r) return
    expect(r.speech).toBeNull()
    expect(r.homeResults.length).toBeGreaterThan(0)
    expect(r.homeResults.every((h) => T(h.label) && T(h.txt) && h.lvl)).toBe(true)
    expect(r.answers.map((a) => T(a.label))).toContain('Symptoms in the last month')
    expect(T(r.consent)).toMatch(/genomic result used$/)
  })

  test('no referral after the emergency case s2, after "not now", and Reset clears it', async () => {
    const e = engine()
    await runCase(e, 's2')
    expect((await drive(e)).referral).toBeNull()
    await start(e, 'khalid')
    expect((await drive(e, { book: 'later' })).referral).toBeNull()
    await runCase(e, 's0')
    expect((await drive(e)).referral).not.toBeNull()
    e.reset()
    expect(e.getSnapshot().referral).toBeNull()
  })

  test('a new journey clears the last referral; "Choose someone else" keeps it', async () => {
    const e = engine()
    await runCase(e, 's0')
    await drive(e)
    e.clearJourney()
    expect(e.getSnapshot().referral?.person).toBe('saeed')
    void e.startJourney('amna')
    expect(e.getSnapshot().referral).toBeNull()
  })
})

describe('the doctor decides on the referral (Hospital > Referrals), once', () => {
  /** Saeed's s0 journey at the Referral step; the notes it already sent are left out of the checks below. */
  const sent = async () => {
    const e = engine({ seedNotes: false })
    await runCase(e, 's0')
    const s = await drive(e)
    const r = s.referral
    if (!r) throw new Error('no referral')
    return { e, r, before: s.notes.length }
  }
  const newNotes = (e: FamilyHealthEngine, before: number) => {
    const n = e.getSnapshot().notes
    return n.slice(0, n.length - before).map((x) => ({ to: x.to, text: T(x.text as Txt) }))
  }

  test('accepted: stored with the doctor and time, Saeed’s status, the Department counter, notices to Saeed and the shared family', async () => {
    const { e, r, before } = await sent()
    expect(r.decision).toBeNull()
    expect(r.share.length).toBeGreaterThan(0)
    const gov = e.getSnapshot().gov
    expect(e.decideReferral(r.id, 'accepted')).toBe(true)
    const s = e.getSnapshot()
    const d = s.referral?.decision
    expect(d).toMatchObject({ outcome: 'accepted' })
    expect(d && T(d.by)).toBe('Dr Omar Haddad')
    expect(d?.at).toMatch(/^\d\d:\d\d$/)
    expect(T(s.status.saeed.label)).toBe('Referral accepted')
    expect(s.status.saeed.tone).toBe('good')
    expect(s.gov.refAccepted).toBe(gov.refAccepted + 1)
    expect(s.gov.refDeclined).toBe(gov.refDeclined)
    const notes = newNotes(e, before)
    const own = notes.find((x) => x.to === 'saeed')
    expect(own?.text).toMatch(/^Dr Omar Haddad accepted your referral\. Your doctor review is .+ \(.+\); your checks stay on .+\.$/)
    expect(own?.text).toContain(T(r.slot))
    for (const k of r.share.filter((x) => x !== 'saeed')) {
      expect(notes.find((x) => x.to === k)?.text).toMatch(/^Dr Omar Haddad accepted Saeed’s referral\. The doctor review is /)
    }
    expect(notes).toHaveLength(new Set(['saeed', ...r.share]).size)
    // In Arabic too.
    expect(TAR(s.notes[notes.length - 1].text as Txt)).toContain('د. عمر حداد')
  })

  test('declined, another specialist: the reason and the next step; the counter and the status', async () => {
    const { e, r, before } = await sent()
    expect(e.decideReferral(r.id, 'declined', 'specialist')).toBe(true)
    const s = e.getSnapshot()
    expect(s.referral?.decision).toMatchObject({ outcome: 'declined', reason: 'specialist' })
    expect(T(s.status.saeed.label)).toBe('Referral declined · see why')
    expect(s.status.saeed.tone).toBe('warn')
    expect(s.gov.refDeclined).toBe(1)
    expect(s.gov.refAccepted).toBe(0)
    const notes = newNotes(e, before)
    expect(notes.find((x) => x.to === 'saeed')?.text).toBe('Dr Omar Haddad declined your referral: it needs another specialist. Noa will suggest the right clinic.')
    for (const k of r.share.filter((x) => x !== 'saeed')) {
      expect(notes.find((x) => x.to === k)?.text).toBe('Dr Omar Haddad declined Saeed’s referral: it needs another specialist. Noa will suggest the right clinic.')
    }
  })

  test('declined, other reason: the doctor’s own words', async () => {
    const { e, r, before } = await sent()
    expect(e.decideReferral(r.id, 'declined', 'other', '  Please see the cardiology clinic first. ')).toBe(true)
    expect(e.getSnapshot().referral?.decision).toMatchObject({ outcome: 'declined', reason: 'other', note: 'Please see the cardiology clinic first' })
    expect(newNotes(e, before).find((x) => x.to === 'saeed')?.text).toBe('Dr Omar Haddad declined your referral: Please see the cardiology clinic first. Noa will follow up with the clinic and keep you posted.')
  })

  test('already seen and more tests first have their own next steps', async () => {
    for (const [why, next] of [['seen', 'No new visit is needed; the record is updated.'], ['tests', 'Noa will book the tests first.']] as const) {
      const { e, r, before } = await sent()
      e.decideReferral(r.id, 'declined', why)
      expect(newNotes(e, before).find((x) => x.to === 'saeed')?.text.endsWith(next)).toBe(true)
    }
  })

  test('a second decision, or another id, is ignored; it survives "Choose someone else"; Reset clears it', async () => {
    const { e, r } = await sent()
    expect(e.decideReferral('fh-nobody-1', 'accepted')).toBe(false)
    expect(e.decideReferral(r.id, 'accepted')).toBe(true)
    const n = e.getSnapshot().notes.length
    expect(e.decideReferral(r.id, 'declined', 'seen')).toBe(false)
    expect(e.getSnapshot().referral?.decision?.outcome).toBe('accepted')
    expect(e.getSnapshot().notes).toHaveLength(n)
    expect(e.getSnapshot().gov.refDeclined).toBe(0)
    e.clearJourney()
    expect(e.getSnapshot().referral?.decision?.outcome).toBe('accepted')
    expect(T(e.getSnapshot().status.saeed.label)).toBe('Referral accepted')
    e.reset()
    expect(e.getSnapshot().referral).toBeNull()
    expect(e.getSnapshot().gov).toMatchObject({ refAccepted: 0, refDeclined: 0 })
  })
})
