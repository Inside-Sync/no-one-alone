import type { FamilyDoc } from '@/data/contract'
import { mockSource } from '@/data/sources/mock'
import { overlayLineage } from '@/data/sources/overlay'

const doc = (conditions: FamilyDoc['members'][number]['conditions']): FamilyDoc => ({
  members: [{ id: 'margaret', name: 'Moza Al Hammadi', relation: 'self', generation: 1, conditions }],
  flags: [],
})
const onset = async (d: FamilyDoc) => overlayLineage(await mockSource.getLineage('margaret'), d, 'james').matrix[0].onset

describe("lineage conditions: the predict job's code first, the English label as the fallback", () => {
  test('a code decides even when the label is Arabic and matches no word', async () => {
    expect(await onset(doc([
      { label: 'ارتفاع ضغط الدم', ageAtOnset: 61, code: 'HYPERTENSION' },
      { label: 'سكتة دماغية', ageAtOnset: 74, code: 'STROKE' },
      { label: 'داء السكري من النوع الثاني', code: 'TYPE_2_DIABETES' },
      { label: 'رجفان أذيني', code: 'ATRIAL_FIBRILLATION' },
      { label: 'الزرق', code: 'GLAUCOMA' },
      { label: 'الخرف', code: 'DEMENTIA' },
      { label: 'فقدان السمع', code: 'HEARING_LOSS' },
    ]))).toEqual({ HTN: 61, STR: 74, T2D: '✓', AF: '✓', GLA: '✓', DEM: '✓', HEAR: '✓' })
  })

  test('the code wins over a label that says something else', async () => {
    expect(await onset(doc([{ label: 'hypertension', ageAtOnset: 50, code: 'STROKE' }]))).toEqual({ STR: 50 })
  })

  test('prediabetes is not a family diabetes; codes with no column add none, whatever the label', async () => {
    expect(await onset(doc([
      { label: 'x', code: 'PREDIABETES' }, { label: 'stroke', code: 'CHRONIC_KIDNEY_DISEASE' }, { label: 'x', code: 'OSTEOARTHRITIS' },
    ]))).toEqual({})
  })

  test('without a code the English label is matched as before', async () => {
    expect(await onset(doc([{ label: 'Hypertension', ageAtOnset: 61 }, { label: 'atrial fibrillation' }, { label: 'سكتة دماغية' }]))).toEqual({ HTN: 61, AF: '✓' })
  })
})
