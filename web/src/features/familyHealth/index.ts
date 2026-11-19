/**
 * "Noa · family health": the journey engine and data of the Family health tab (no UI here; the panel is built on this API).
 *
 *   const engine = new FamilyHealthEngine({ scheduler: realScheduler({ reducedMotion }) })
 *   useSyncExternalStore(engine.subscribe, engine.getSnapshot)
 *   engine.runTestCase('s0')            // the app auto-starts s0 after 300 ms
 *   engine.next() / engine.answer(card.id, value) / engine.reply(text)
 *
 * Texts are descriptors: resolve them with `textOf(i18n.getFixedT(lang, FH_NS), lang)`.
 */
export * from './engine'
export * from './data/types'
export { PEOPLE, REL, PROFILES0, RECORDS, DEVICES, GENOMIC, SPEECH_BASE, SPEECH_BASE_DEFAULT, EDIT_RANGES, ADULT_EDIT_FIELDS, CHILD_EDIT_FIELDS, TOGGLE_FIELDS, bmiOf, type Person, type EditField, type ToggleField, type Device } from './data/people'
export { AGENTS, DOMAINS, DOMAIN_ORDER, STAGES, RULES, skillsOf, domainOf } from './data/agents'
export { PROGRAMMES, URGENCY, URGENCY_ORDER, TIME_IDS } from './data/programmes'
export { VT, VT_ORDER, SENTENCE, SAMPLES, SPEECH, DIN_ROUNDS, PHQ_SCALE, CHOICES } from './data/tests'
export { TEST_CASES, AUTO_START_CASE, SEEDED_NOTES, testCase, type TestCase } from './data/testCases'
export { SIGNAL, WAIT, WRITING, writingMs, CLOCK_START } from './data/thresholds'
export { FH_ICONS } from './data/icons'
