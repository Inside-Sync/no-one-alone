// Ported from the Test case prototype (new4.html). Every user-visible string is an i18n key in the `testcase`
// namespace (see locales/en/testcase.json); numbers, thresholds, ids and order are the prototype's.
import type { TeachSet } from './types'

/** Teach-back sets. `en` and `ar` are both present in both locale files: the English / Arabic switch inside the overlay is
 * independent of the app language. Arabic uses `{{nar}}` / `{{addrar}}` (the Arabic spellings). `facts` mirrors respond-agent `explain.FACTS` (a pytest keeps them equal). The correct option is always index 1. */
export const TEACH: Record<'stroke' | 'fall' | 'hypo' | 'hf' | 'child_speech' | 'dm' | 'bone' | 'prev_ok' | 'prev_ref', TeachSet> = {
  stroke: {
    facts: 'teach.stroke.facts',
    en: {
      explain: 'teach.stroke.en.explain',
      q: 'teach.stroke.en.q',
      opts: ['teach.stroke.en.opts.0', 'teach.stroke.en.opts.1', 'teach.stroke.en.opts.2'],
      simpler: 'teach.stroke.en.simpler',
      wrong: ['teach.stroke.en.wrong.0', 'teach.stroke.en.wrong.1'],
    },
    ar: {
      explain: 'teach.stroke.ar.explain',
      q: 'teach.stroke.ar.q',
      opts: ['teach.stroke.ar.opts.0', 'teach.stroke.ar.opts.1', 'teach.stroke.ar.opts.2'],
      simpler: 'teach.stroke.ar.simpler',
      wrong: ['teach.stroke.ar.wrong.0', 'teach.stroke.ar.wrong.1'],
    },
  },
  fall: {
    facts: 'teach.fall.facts',
    en: {
      explain: 'teach.fall.en.explain',
      q: 'teach.fall.en.q',
      opts: ['teach.fall.en.opts.0', 'teach.fall.en.opts.1', 'teach.fall.en.opts.2'],
      simpler: 'teach.fall.en.simpler',
      wrong: ['teach.fall.en.wrong.0', 'teach.fall.en.wrong.1'],
    },
    ar: {
      explain: 'teach.fall.ar.explain',
      q: 'teach.fall.ar.q',
      opts: ['teach.fall.ar.opts.0', 'teach.fall.ar.opts.1', 'teach.fall.ar.opts.2'],
      simpler: 'teach.fall.ar.simpler',
      wrong: ['teach.fall.ar.wrong.0', 'teach.fall.ar.wrong.1'],
    },
  },
  hypo: {
    facts: 'teach.hypo.facts',
    en: {
      explain: 'teach.hypo.en.explain',
      q: 'teach.hypo.en.q',
      opts: ['teach.hypo.en.opts.0', 'teach.hypo.en.opts.1', 'teach.hypo.en.opts.2'],
      simpler: 'teach.hypo.en.simpler',
      wrong: ['teach.hypo.en.wrong.0', 'teach.hypo.en.wrong.1'],
    },
    ar: {
      explain: 'teach.hypo.ar.explain',
      q: 'teach.hypo.ar.q',
      opts: ['teach.hypo.ar.opts.0', 'teach.hypo.ar.opts.1', 'teach.hypo.ar.opts.2'],
      simpler: 'teach.hypo.ar.simpler',
      wrong: ['teach.hypo.ar.wrong.0', 'teach.hypo.ar.wrong.1'],
    },
  },
  hf: {
    facts: 'teach.hf.facts',
    en: {
      explain: 'teach.hf.en.explain',
      q: 'teach.hf.en.q',
      opts: ['teach.hf.en.opts.0', 'teach.hf.en.opts.1', 'teach.hf.en.opts.2'],
      simpler: 'teach.hf.en.simpler',
      wrong: ['teach.hf.en.wrong.0', 'teach.hf.en.wrong.1'],
    },
    ar: {
      explain: 'teach.hf.ar.explain',
      q: 'teach.hf.ar.q',
      opts: ['teach.hf.ar.opts.0', 'teach.hf.ar.opts.1', 'teach.hf.ar.opts.2'],
      simpler: 'teach.hf.ar.simpler',
      wrong: ['teach.hf.ar.wrong.0', 'teach.hf.ar.wrong.1'],
    },
  },
  child_speech: {
    facts: 'teach.child_speech.facts',
    en: {
      explain: 'teach.child_speech.en.explain',
      q: 'teach.child_speech.en.q',
      opts: [
        'teach.child_speech.en.opts.0',
        'teach.child_speech.en.opts.1',
        'teach.child_speech.en.opts.2',
      ],
      simpler: 'teach.child_speech.en.simpler',
      wrong: ['teach.child_speech.en.wrong.0', 'teach.child_speech.en.wrong.1'],
    },
    ar: {
      explain: 'teach.child_speech.ar.explain',
      q: 'teach.child_speech.ar.q',
      opts: [
        'teach.child_speech.ar.opts.0',
        'teach.child_speech.ar.opts.1',
        'teach.child_speech.ar.opts.2',
      ],
      simpler: 'teach.child_speech.ar.simpler',
      wrong: ['teach.child_speech.ar.wrong.0', 'teach.child_speech.ar.wrong.1'],
    },
  },
  dm: {
    facts: 'teach.dm.facts',
    en: {
      explain: 'teach.dm.en.explain',
      q: 'teach.dm.en.q',
      opts: ['teach.dm.en.opts.0', 'teach.dm.en.opts.1', 'teach.dm.en.opts.2'],
      simpler: 'teach.dm.en.simpler',
      wrong: ['teach.dm.en.wrong.0', 'teach.dm.en.wrong.1'],
    },
    ar: {
      explain: 'teach.dm.ar.explain',
      q: 'teach.dm.ar.q',
      opts: ['teach.dm.ar.opts.0', 'teach.dm.ar.opts.1', 'teach.dm.ar.opts.2'],
      simpler: 'teach.dm.ar.simpler',
      wrong: ['teach.dm.ar.wrong.0', 'teach.dm.ar.wrong.1'],
    },
  },
  bone: {
    facts: 'teach.bone.facts',
    en: {
      explain: 'teach.bone.en.explain',
      q: 'teach.bone.en.q',
      opts: ['teach.bone.en.opts.0', 'teach.bone.en.opts.1', 'teach.bone.en.opts.2'],
      simpler: 'teach.bone.en.simpler',
      wrong: ['teach.bone.en.wrong.0', 'teach.bone.en.wrong.1'],
    },
    ar: {
      explain: 'teach.bone.ar.explain',
      q: 'teach.bone.ar.q',
      opts: ['teach.bone.ar.opts.0', 'teach.bone.ar.opts.1', 'teach.bone.ar.opts.2'],
      simpler: 'teach.bone.ar.simpler',
      wrong: ['teach.bone.ar.wrong.0', 'teach.bone.ar.wrong.1'],
    },
  },
  prev_ok: {
    facts: 'teach.prev_ok.facts',
    en: {
      explain: 'teach.prev_ok.en.explain',
      q: 'teach.prev_ok.en.q',
      opts: ['teach.prev_ok.en.opts.0', 'teach.prev_ok.en.opts.1', 'teach.prev_ok.en.opts.2'],
      simpler: 'teach.prev_ok.en.simpler',
      wrong: ['teach.prev_ok.en.wrong.0', 'teach.prev_ok.en.wrong.1'],
    },
    ar: {
      explain: 'teach.prev_ok.ar.explain',
      q: 'teach.prev_ok.ar.q',
      opts: ['teach.prev_ok.ar.opts.0', 'teach.prev_ok.ar.opts.1', 'teach.prev_ok.ar.opts.2'],
      simpler: 'teach.prev_ok.ar.simpler',
      wrong: ['teach.prev_ok.ar.wrong.0', 'teach.prev_ok.ar.wrong.1'],
    },
  },
  prev_ref: {
    facts: 'teach.prev_ref.facts',
    en: {
      explain: 'teach.prev_ref.en.explain',
      q: 'teach.prev_ref.en.q',
      opts: ['teach.prev_ref.en.opts.0', 'teach.prev_ref.en.opts.1', 'teach.prev_ref.en.opts.2'],
      simpler: 'teach.prev_ref.en.simpler',
      wrong: ['teach.prev_ref.en.wrong.0', 'teach.prev_ref.en.wrong.1'],
    },
    ar: {
      explain: 'teach.prev_ref.ar.explain',
      q: 'teach.prev_ref.ar.q',
      opts: ['teach.prev_ref.ar.opts.0', 'teach.prev_ref.ar.opts.1', 'teach.prev_ref.ar.opts.2'],
      simpler: 'teach.prev_ref.ar.simpler',
      wrong: ['teach.prev_ref.ar.wrong.0', 'teach.prev_ref.ar.wrong.1'],
    },
  },
}

