// Ported from the Test case prototype (new4.html). Every user-visible string is an i18n key in the `testcase`
// namespace (see locales/en/testcase.json); numbers, thresholds, ids and order are the prototype's.
import type { ReportDef } from './types'

/** Department of Health reports (fictional figures). Empty notes are omitted. */
export const REPORT: Record<string, ReportDef> = {
  stroke: {
    id: 'stroke',
    title: 'report.stroke.title',
    kpi: [
      {
        label: 'report.stroke.kpi.0.label',
        value: 'report.stroke.kpi.0.value',
        note: 'report.stroke.kpi.0.note',
      },
      {
        label: 'report.stroke.kpi.1.label',
        value: 'report.stroke.kpi.1.value',
        note: 'report.stroke.kpi.1.note',
      },
      { label: 'report.stroke.kpi.2.label', value: 'report.stroke.kpi.2.value' },
      { label: 'report.stroke.kpi.3.label', value: 'report.stroke.kpi.3.value' },
      {
        label: 'report.stroke.kpi.4.label',
        value: 'report.stroke.kpi.4.value',
        note: 'report.stroke.kpi.4.note',
      },
      {
        label: 'report.stroke.kpi.5.label',
        value: 'report.stroke.kpi.5.value',
        note: 'report.stroke.kpi.5.note',
      },
    ],
  },
  fall: {
    id: 'fall',
    title: 'report.fall.title',
    kpi: [
      {
        label: 'report.fall.kpi.0.label',
        value: 'report.fall.kpi.0.value',
        note: 'report.fall.kpi.0.note',
      },
      {
        label: 'report.fall.kpi.1.label',
        value: 'report.fall.kpi.1.value',
        note: 'report.fall.kpi.1.note',
      },
      {
        label: 'report.fall.kpi.2.label',
        value: 'report.fall.kpi.2.value',
        note: 'report.fall.kpi.2.note',
      },
      {
        label: 'report.fall.kpi.3.label',
        value: 'report.fall.kpi.3.value',
        note: 'report.fall.kpi.3.note',
      },
      { label: 'report.fall.kpi.4.label', value: 'report.fall.kpi.4.value' },
      { label: 'report.fall.kpi.5.label', value: 'report.fall.kpi.5.value' },
    ],
  },
  fallm: {
    id: 'fallm',
    title: 'report.fallm.title',
    kpi: [
      {
        label: 'report.fallm.kpi.0.label',
        value: 'report.fallm.kpi.0.value',
        note: 'report.fallm.kpi.0.note',
      },
      {
        label: 'report.fallm.kpi.1.label',
        value: 'report.fallm.kpi.1.value',
        note: 'report.fallm.kpi.1.note',
      },
      {
        label: 'report.fallm.kpi.2.label',
        value: 'report.fallm.kpi.2.value',
        note: 'report.fallm.kpi.2.note',
      },
      {
        label: 'report.fallm.kpi.3.label',
        value: 'report.fallm.kpi.3.value',
        note: 'report.fallm.kpi.3.note',
      },
    ],
  },
  hypo: {
    id: 'hypo',
    title: 'report.hypo.title',
    kpi: [
      {
        label: 'report.hypo.kpi.0.label',
        value: 'report.hypo.kpi.0.value',
        note: 'report.hypo.kpi.0.note',
      },
      {
        label: 'report.hypo.kpi.1.label',
        value: 'report.hypo.kpi.1.value',
        note: 'report.hypo.kpi.1.note',
      },
      {
        label: 'report.hypo.kpi.2.label',
        value: 'report.hypo.kpi.2.value',
        note: 'report.hypo.kpi.2.note',
      },
      { label: 'report.hypo.kpi.3.label', value: 'report.hypo.kpi.3.value' },
    ],
  },
  hypoe: {
    id: 'hypoe',
    title: 'report.hypoe.title',
    kpi: [
      {
        label: 'report.hypoe.kpi.0.label',
        value: 'report.hypoe.kpi.0.value',
        note: 'report.hypoe.kpi.0.note',
      },
      {
        label: 'report.hypoe.kpi.1.label',
        value: 'report.hypoe.kpi.1.value',
        note: 'report.hypoe.kpi.1.note',
      },
      {
        label: 'report.hypoe.kpi.2.label',
        value: 'report.hypoe.kpi.2.value',
        note: 'report.hypoe.kpi.2.note',
      },
      { label: 'report.hypoe.kpi.3.label', value: 'report.hypoe.kpi.3.value' },
    ],
  },
  hf: {
    id: 'hf',
    title: 'report.hf.title',
    kpi: [
      {
        label: 'report.hf.kpi.0.label',
        value: 'report.hf.kpi.0.value',
        note: 'report.hf.kpi.0.note',
      },
      {
        label: 'report.hf.kpi.1.label',
        value: 'report.hf.kpi.1.value',
        note: 'report.hf.kpi.1.note',
      },
      { label: 'report.hf.kpi.2.label', value: 'report.hf.kpi.2.value' },
      {
        label: 'report.hf.kpi.3.label',
        value: 'report.hf.kpi.3.value',
        note: 'report.hf.kpi.3.note',
      },
    ],
  },
  hfe: {
    id: 'hfe',
    title: 'report.hfe.title',
    kpi: [
      {
        label: 'report.hfe.kpi.0.label',
        value: 'report.hfe.kpi.0.value',
        note: 'report.hfe.kpi.0.note',
      },
      {
        label: 'report.hfe.kpi.1.label',
        value: 'report.hfe.kpi.1.value',
        note: 'report.hfe.kpi.1.note',
      },
      {
        label: 'report.hfe.kpi.2.label',
        value: 'report.hfe.kpi.2.value',
        note: 'report.hfe.kpi.2.note',
      },
      { label: 'report.hfe.kpi.3.label', value: 'report.hfe.kpi.3.value' },
    ],
  },
  wc: {
    id: 'wc',
    title: 'report.wc.title',
    kpi: [
      {
        label: 'report.wc.kpi.0.label',
        value: 'report.wc.kpi.0.value',
        note: 'report.wc.kpi.0.note',
      },
      {
        label: 'report.wc.kpi.1.label',
        value: 'report.wc.kpi.1.value',
        note: 'report.wc.kpi.1.note',
      },
      {
        label: 'report.wc.kpi.2.label',
        value: 'report.wc.kpi.2.value',
        note: 'report.wc.kpi.2.note',
      },
      {
        label: 'report.wc.kpi.3.label',
        value: 'report.wc.kpi.3.value',
        note: 'report.wc.kpi.3.note',
      },
      {
        label: 'report.wc.kpi.4.label',
        value: 'report.wc.kpi.4.value',
        note: 'report.wc.kpi.4.note',
      },
      { label: 'report.wc.kpi.5.label', value: 'report.wc.kpi.5.value' },
    ],
  },
  ifhas: {
    id: 'ifhas',
    title: 'report.ifhas.title',
    kpi: [
      {
        label: 'report.ifhas.kpi.0.label',
        value: 'report.ifhas.kpi.0.value',
        note: 'report.ifhas.kpi.0.note',
      },
      {
        label: 'report.ifhas.kpi.1.label',
        value: 'report.ifhas.kpi.1.value',
        note: 'report.ifhas.kpi.1.note',
      },
      {
        label: 'report.ifhas.kpi.2.label',
        value: 'report.ifhas.kpi.2.value',
        note: 'report.ifhas.kpi.2.note',
      },
      {
        label: 'report.ifhas.kpi.3.label',
        value: 'report.ifhas.kpi.3.value',
        note: 'report.ifhas.kpi.3.note',
      },
      { label: 'report.ifhas.kpi.4.label', value: 'report.ifhas.kpi.4.value' },
      {
        label: 'report.ifhas.kpi.5.label',
        value: 'report.ifhas.kpi.5.value',
        note: 'report.ifhas.kpi.5.note',
      },
    ],
  },
  ifhas2: {
    id: 'ifhas2',
    title: 'report.ifhas2.title',
    kpi: [
      {
        label: 'report.ifhas2.kpi.0.label',
        value: 'report.ifhas2.kpi.0.value',
        note: 'report.ifhas2.kpi.0.note',
      },
      {
        label: 'report.ifhas2.kpi.1.label',
        value: 'report.ifhas2.kpi.1.value',
        note: 'report.ifhas2.kpi.1.note',
      },
      { label: 'report.ifhas2.kpi.2.label', value: 'report.ifhas2.kpi.2.value' },
      {
        label: 'report.ifhas2.kpi.3.label',
        value: 'report.ifhas2.kpi.3.value',
        note: 'report.ifhas2.kpi.3.note',
      },
      {
        label: 'report.ifhas2.kpi.4.label',
        value: 'report.ifhas2.kpi.4.value',
        note: 'report.ifhas2.kpi.4.note',
      },
      {
        label: 'report.ifhas2.kpi.5.label',
        value: 'report.ifhas2.kpi.5.value',
        note: 'report.ifhas2.kpi.5.note',
      },
    ],
  },
  fam: {
    id: 'fam',
    title: 'report.fam.title',
    kpi: [
      {
        label: 'report.fam.kpi.0.label',
        value: 'report.fam.kpi.0.value',
        note: 'report.fam.kpi.0.note',
      },
      {
        label: 'report.fam.kpi.1.label',
        value: 'report.fam.kpi.1.value',
        note: 'report.fam.kpi.1.note',
      },
      {
        label: 'report.fam.kpi.2.label',
        value: 'report.fam.kpi.2.value',
        note: 'report.fam.kpi.2.note',
      },
      {
        label: 'report.fam.kpi.3.label',
        value: 'report.fam.kpi.3.value',
        note: 'report.fam.kpi.3.note',
      },
      {
        label: 'report.fam.kpi.4.label',
        value: 'report.fam.kpi.4.value',
        note: 'report.fam.kpi.4.note',
      },
      {
        label: 'report.fam.kpi.5.label',
        value: 'report.fam.kpi.5.value',
        note: 'report.fam.kpi.5.note',
      },
      {
        label: 'report.fam.kpi.6.label',
        value: 'report.fam.kpi.6.value',
        note: 'report.fam.kpi.6.note',
      },
    ],
  },
}

