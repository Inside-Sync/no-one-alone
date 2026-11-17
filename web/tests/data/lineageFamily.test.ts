import { afterEach, describe, expect, test } from 'vitest'
import i18n from '@/i18n'
import { mockSource } from '@/data/sources/mock'
import { overlayLineage } from '@/data/sources/overlay'
import type { FamilyDoc, FamilyMemberDoc } from '@/data/contract'

type Cond = FamilyMemberDoc['conditions'][number]
const c = (label: string, code: Cond['code'], ageAtOnset?: number, note?: string): Cond => ({ label, code, ...(ageAtOnset !== undefined && { ageAtOnset }), ...(note && { note }) })

/** The document `families/margaret` holds once the FHIR bundle and the predict job follow the design (family-spec). */
const designDoc: FamilyDoc = {
  members: [
    { id: 'margaret-father', name: 'Saeed Al Hammadi', relation: 'father', generation: 0, deceased: true, deceasedAge: 72, conditions: [c('hypertension', 'HYPERTENSION', 55), c('stroke', 'STROKE', 68)] },
    { id: 'margaret-mother', name: 'Shamsa Al Hammadi', relation: 'mother', generation: 0, deceased: true, deceasedAge: 80, conditions: [c('glaucoma', 'GLAUCOMA', 60), c('hearing loss', 'HEARING_LOSS', 74), c('dementia', 'DEMENTIA', 77)] },
    {
      id: 'margaret', name: 'Moza Al Hammadi', relation: 'self', generation: 1, age: 78, place: 'Al Bateen',
      conditions: [c('Hypertension', 'HYPERTENSION', 61), c('Hearing loss', 'HEARING_LOSS', 72), c('Chronic kidney disease', 'CHRONIC_KIDNEY_DISEASE'), c('Osteoarthritis', 'OSTEOARTHRITIS'), c('Prediabetes', 'PREDIABETES')],
    },
    { id: 'margaret-husband', name: 'Saif Al Mansoori', relation: 'husband', generation: 1, deceased: true, deceasedAge: 75, conditions: [c('hypertension', 'HYPERTENSION', 60), c('type 2 diabetes', 'TYPE_2_DIABETES', 58), c('atrial fibrillation', 'ATRIAL_FIBRILLATION', 70)] },
    { id: 'david', name: 'Hamad Al Hammadi', relation: 'brother', generation: 1, age: 74, place: 'Al Bateen', parentId: 'margaret-father', conditions: [c('hypertension', 'HYPERTENSION', 52), c('stroke', 'STROKE', 69)] },
    { id: 'sarah', name: 'Alia Al Mansoori', relation: 'daughter', generation: 2, age: 49, place: 'London', parentId: 'margaret', conditions: [] },
    { id: 'james', name: 'Khalid Al Mansoori', relation: 'son', generation: 2, age: 46, place: 'Al Ain', parentId: 'margaret', conditions: [c('hypertension', 'HYPERTENSION', undefined, '138/86')] },
    { id: 'margaret-granddaughter', name: 'Hessa Al Mansoori', relation: 'granddaughter', generation: 3, age: 19, place: 'Al Ain', parentId: 'james', conditions: [] },
    { id: 'margaret-grandson', name: 'Zayed Al Mansoori', relation: 'grandson', generation: 3, age: 16, place: 'Al Ain', parentId: 'james', conditions: [] },
  ],
  flags: [],
}

afterEach(async () => { await i18n.changeLanguage('en') })

describe.each(['en', 'ar'])('the designed document in %s', (lang) => {
  test('renders the mock tree, matrix, strength and screening unchanged', async () => {
    await i18n.changeLanguage(lang)
    const mock = await mockSource.getLineage('margaret')
    const out = overlayLineage(mock, designDoc, 'james')
    expect(out.generations).toEqual(mock.generations)
    expect(out.matrix).toEqual(mock.matrix)
    expect(out.matrixColumns).toEqual(mock.matrixColumns)
    expect(out.strength).toEqual(mock.strength)
    expect(out.screening).toEqual(mock.screening)
  })
})

describe('an older document without the new fields', () => {
  const old: FamilyDoc = {
    members: [
      { id: 'father', name: 'Father', relation: 'father', generation: 0, deceased: true, conditions: [{ label: 'stroke at 74', ageAtOnset: 74 }] },
      { id: 'mother', name: 'Mother', relation: 'mother', generation: 0, conditions: [] },
      { id: 'margaret', name: 'Margaret Collins', relation: 'self', generation: 1, conditions: [{ label: 'hypertension' }] },
      { id: 'james', name: 'James Collins', relation: 'son', generation: 2, conditions: [{ label: 'hypertension' }] },
    ],
    flags: [],
  }

  test('still renders names, readable sub lines and chips', async () => {
    const out = overlayLineage(await mockSource.getLineage('margaret'), old, 'james')
    const nodes = out.generations.flatMap((g) => g.nodes)
    expect(nodes.map((n) => n.name)).toEqual(['Father', 'Mother', 'Margaret Collins', 'James Collins'])
    expect(nodes.map((n) => n.sub)).toEqual(["† · Margaret's father", "Margaret's mother", 'herself', 'son · you'])
    expect(nodes[0].conditions).toEqual([['STR', 74]])
    expect(nodes[2].conditions).toEqual([['HTN', '✓']])
    expect(out.generations[2].nodes[0].kind).toBe('you')
  })
})
