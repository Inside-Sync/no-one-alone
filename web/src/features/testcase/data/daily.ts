// Ported from the Test case prototype (new4.html). Every user-visible string is an i18n key in the `testcase`
// namespace (see locales/en/testcase.json); numbers, thresholds, ids and order are the prototype's.
import type { DailyDef } from './types'

/** The one daily reading of the Monitor step. `ok` is the on-target test (value op limit); `finding` takes `{{v}}`. */
export const DAILY: Record<'stroke' | 'fall' | 'hypo' | 'hf', DailyDef> = {
  stroke: {
    id: 'stroke',
    label: 'daily.stroke.label',
    unit: 'mmHg',
    def: 146,
    min: 100,
    max: 190,
    step: 1,
    target: 'daily.stroke.target',
    ok: { op: 'lt', limit: 130 },
    finding: 'daily.stroke.finding',
    team: 'daily.stroke.team',
    act: 'daily.stroke.act',
  },
  fall: {
    id: 'fall',
    label: 'daily.fall.label',
    unit: 'mmHg',
    def: 22,
    min: 0,
    max: 40,
    step: 1,
    target: 'daily.fall.target',
    ok: { op: 'lt', limit: 20 },
    finding: 'daily.fall.finding',
    team: 'daily.fall.team',
    act: 'daily.fall.act',
  },
  hypo: {
    id: 'hypo',
    label: 'daily.hypo.label',
    unit: 'mmol/L',
    def: 4.6,
    min: 2,
    max: 10,
    step: 0.1,
    target: 'daily.hypo.target',
    ok: { op: 'gte', limit: 4 },
    finding: 'daily.hypo.finding',
    team: 'daily.hypo.team',
    act: 'daily.hypo.act',
  },
  hf: {
    id: 'hf',
    label: 'daily.hf.label',
    unit: 'kg',
    def: 0.4,
    min: -2,
    max: 4,
    step: 0.1,
    target: 'daily.hf.target',
    ok: { op: 'lte', limit: 1 },
    finding: 'daily.hf.finding',
    team: 'daily.hf.team',
    act: 'daily.hf.act',
  },
}

