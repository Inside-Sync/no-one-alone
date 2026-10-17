import type { RecoveryDoc } from '@/data/contract'

/** Dev-only dummy plan for `?demo=recovery`, shaped like the stored doc core-api writes. */
export const MOCK_RECOVERY: RecoveryDoc = {
  createdAt: '2026-10-16T09:30:00Z',
  staffName: 'Dr Amelia Ross, stroke registrar',
  diagnosis: 'Ischaemic stroke, thrombolysed · new paroxysmal AF',
  summary:
    'Margaret, you are home after a small stroke. You have two new tablets, one dose went up, and you stop aspirin. Walk a little each day, check your blood pressure morning and evening, and do your speech exercises. Noa will remind you.',
  meds: [
    { name: 'Apixaban', dose: '5 mg', times: ['08:00', '18:00'], change: 'New' },
    { name: 'Perindopril', dose: '4 mg', times: ['08:00'], change: 'New' },
    { name: 'Atorvastatin', dose: '40 mg', times: ['21:00'], change: 'Increased' },
    { name: 'Amlodipine', dose: '5 mg', times: ['18:00'], change: 'Continue' },
    { name: 'Vitamin D', dose: '1000 IU', times: ['08:00'], change: 'Continue' },
    { name: 'Aspirin', dose: '100 mg', times: [], change: 'Stop' },
  ],
  activities: [
    { text: 'Walk 20 minutes daily', times: ['10:00'] },
    { text: 'Check blood pressure morning and evening, target under 130/80', times: ['08:15', '18:15'] },
    { text: 'Speech exercises 15 minutes', times: ['14:00'] },
    { text: 'Drink 1.5 L of water a day', times: ['11:00', '16:00'] },
    { text: 'Low-salt food, under 5 g a day', times: [] },
    { text: 'No driving for 1 month', times: [] },
    { text: 'Call 000 straight away if face drooping, arm weakness or speech trouble', times: [] },
  ],
  reminders: [
    { time: '08:00', kind: 'MED', text: 'Apixaban 5 mg' },
    { time: '08:00', kind: 'MED', text: 'Perindopril 4 mg' },
    { time: '08:00', kind: 'MED', text: 'Vitamin D 1000 IU' },
    { time: '08:15', kind: 'ACTIVITY', text: 'Time to check your blood pressure. Aim for under 130/80.' },
    { time: '10:00', kind: 'ACTIVITY', text: 'Time for your 20-minute walk.' },
    { time: '11:00', kind: 'ACTIVITY', text: 'Time for a glass of water.' },
    { time: '14:00', kind: 'ACTIVITY', text: 'Time for your speech exercises, 15 minutes.' },
    { time: '16:00', kind: 'ACTIVITY', text: 'Time for a glass of water.' },
    { time: '18:00', kind: 'MED', text: 'Apixaban 5 mg' },
    { time: '18:00', kind: 'MED', text: 'Amlodipine 5 mg' },
    { time: '18:15', kind: 'ACTIVITY', text: 'Time to check your blood pressure. Aim for under 130/80.' },
    { time: '21:00', kind: 'MED', text: 'Atorvastatin 40 mg' },
  ],
  followUps: [
    { text: 'GP review with Dr Patel at 10:30', inDays: 7, date: '2026-10-23' },
    { text: 'Physio home visit', inDays: 4, date: '2026-10-20' },
    { text: 'Speech pathology, weekly for 6 weeks', inDays: 6, date: '2026-10-22' },
    { text: 'Stroke clinic, Camperdown at 09:00', inDays: 45, date: '2026-11-30' },
    { text: 'Blood test (kidneys, on apixaban)', inDays: 7, date: '2026-10-23' },
  ],
  notes:
    'You had a small stroke on 15 October. The hospital treated it quickly and you are recovering well. They also found your heartbeat is sometimes uneven, so there is a new tablet to stop clots.',
  fallback: false,
}
