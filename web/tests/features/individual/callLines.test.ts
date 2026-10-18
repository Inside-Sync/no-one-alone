import { callLines } from '@/features/individual/live/useCallDialogue'

const said = (reasons: string[]) => callLines(false, reasons).find((l) => l.clip.startsWith('/noa/000-6'))!

test('the 000 call names what Noa found', () => {
  expect(said(['slurred speech'])).toMatchObject({ clip: '/noa/000-6.mp3', text: expect.stringMatching(/^Slurred speech at 01:40/) })
  expect(said(['weakness'])).toMatchObject({ clip: '/noa/000-6-weakness.mp3', text: expect.stringMatching(/^Sudden weakness at 01:40/) })
  expect(said(['chest pain'])).toMatchObject({ clip: '/noa/000-6-chest-pain.mp3', text: expect.stringMatching(/^Chest pain at 01:40/) })
  expect(said(['fall'])).toMatchObject({ clip: '/noa/000-6-fall.mp3', text: expect.stringMatching(/^She had a fall at 01:40/) })
  expect(said(['weakness', 'slurred speech']).clip).toBe('/noa/000-6.mp3')
  expect(said([]).clip).toBe('/noa/000-6.mp3')
})
