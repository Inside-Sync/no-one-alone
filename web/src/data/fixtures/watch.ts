import type { WatchData } from '../types'
import { kpi, type KpiRow } from './helpers'

export const watch: WatchData = {
  // `#watchKpis` (prototype line 1735).
  kpis: (
    [
      ['Active reports', '23', '', '#6d4fc0', '8 categories', '+5 wk', '', [14, 16, 15, 18, 19, 20, 21, 22, 23]],
      ['Scam contacts', '37', 'this week', '#d9443f', '14 door-to-door', '+11', 'warn', [18, 20, 22, 21, 25, 26, 30, 26, 37]],
      ['Residents warned by voice', '1,240', '', '#1f8f5f', 'within 2.4 h median', '', '', [300, 450, 600, 700, 820, 950, 1050, 1150, 1240]],
      ['Hazards sent to council', '9', 'this month', '#c88a05', '4 fixed', '', '', [2, 3, 4, 4, 5, 6, 7, 8, 9]],
      ['Volunteer call-outs', '12', 'open', '#6d4fc0', '6 heat-related', '+6', 'warn', [4, 5, 5, 6, 7, 8, 9, 10, 12]],
      ['Lockboxes fitted', '38', 'this year', '#2f6fb0', 'paramedic access', '+4 mo', '', [10, 14, 18, 22, 26, 30, 33, 36, 38]],
    ] satisfies KpiRow[]
  ).map(kpi),
  // `#watchRows` (line 1736): [report, suburbs, type, tone, affected, since, status].
  reports: (
    [
      ['Door-knock "solar rebate" scam', 'Marrickville, Dulwich Hill', 'Scam', 'bad', '1,240 warned', '3 days', 'Active'],
      ['"Grandchild in trouble" phone scam', 'All 15 suburbs', 'Scam', 'bad', '1,846 warned', '2 weeks', 'Active'],
      ['Heatwave Thursday–Friday', 'All', 'Weather', 'warn', '318 extra check-ins', 'today', 'Planned'],
      ['Footpath works, Marrickville Rd', 'Marrickville', 'Hazard', 'warn', '46 walkers', '6 Oct', 'Until 24 Oct'],
      ['Street light out, Calvert St', 'Marrickville', 'Hazard', 'warn', '12 residents', 'Sunday', 'Reported'],
      ['Swooping magpies', '3 parks', 'Wildlife', 'plain', '61 walkers', 'September', 'Seasonal'],
      ['No trains this weekend', 'Marrickville, Sydenham, Dulwich Hill', 'Transport', 'plain', '214 regular riders', 'Sat–Sun', 'Planned'],
      ['Power outage risk in heat', 'Tempe, St Peters', 'Utilities', 'warn', '58 residents', 'Thursday', 'Watching'],
    ] as const
  ).map(([title, suburbs, type, typeTone, affected, since, status]) => ({
    title, suburbs, type, typeTone, affected, since, status,
  })),
  // `#scams` (line 1737): [phone, door-to-door, text/email] for w-7 .. this week.
  scams: [[10, 3, 5], [12, 2, 6], [11, 4, 7], [9, 5, 7], [13, 4, 8], [12, 6, 8], [14, 8, 8], [13, 14, 10]],
  scamLabels: { phone: 'Phone', door: 'Door-to-door', text: 'Text / email' },
  // `#newsCom` (line 1741): [source, age, headline, body].
  feed: (
    [
      ['SAFETY · Local police', '5 h', 'Door-knock scam targets older residents in Marrickville', 'Agent warned 1,240 enrolled residents by voice in their language within 2.4 hours.'],
      ['HEALTH · State health department', '2 h', 'Heat health warning for Thursday–Friday', 'Check-ins scheduled for 318 people; 127 without air-con prioritised for cool rooms.'],
      ['TRANSPORT · Transport update', '1 d', 'Station closures this weekend', '214 regular riders identified; 19 have medical appointments and were offered volunteer lifts.'],
      ['COMMUNITY · Council', '1 d', 'Seniors festival week, 20–25 October', 'Invites sent to 412 residents whose social contacts are below their normal.'],
      ['UTILITIES · Energy network', '1 d', 'High demand expected Thursday afternoon', '58 residents in Tempe and St Peters with fridge-stored medicines flagged for a call if power drops.'],
    ] as const
  ).map(([source, age, headline, body]) => ({ source, age, headline, body })),
  // `#callouts` (line 1742): [title, detail, button].
  callouts: (
    [
      ['Lift to cool room', 'Nguyen Van T., Tempe · Thu 11:00 · Vietnamese speaker preferred', 'Accept'],
      ['Fit a key lockbox', 'Margaret C., Marrickville · before 18 Oct', 'Accept'],
      ['Bin night help', 'Margaret C. · Tue 19:00 while Aisha is away', 'Accept'],
      ['Fan delivery', '9 homes in Tempe and Sydenham · Wed afternoon', 'Accept'],
      ['Shopping drop-off', 'Eleni P., Marrickville · Greek speaker preferred', 'Accept'],
      ['Phone buddy', 'Fatima A., Lewisham · Arabic · 2 calls a week', 'Accept'],
    ] as const
  ).map(([title, detail, button]) => ({ title, detail, button })),
}
