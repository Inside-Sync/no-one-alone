import type { MapPin, NewsItem, Surroundings, WatchAlert, AirDay } from '../types'
import { mini, plainKpi, type MiniRow, type PlainKpiRow } from './helpers'

/** Map centre (Marrickville) and deterministic metre/grid to lat-lng conversion for the Google map markers (Ruling R10: no randomness). */
const CENTRE = { lat: -33.911, lng: 151.155 }
function offsetGeo(eastM: number, southM: number) {
  return { lat: +(CENTRE.lat - southM / 111_320).toFixed(6), lng: +(CENTRE.lng + eastM / 92_400).toFixed(6) }
}
/** City3D grid (0–420, centre 210,210) at roughly 3.5 m per unit. */
function gridGeo(at: { x: number; y: number; z?: number }) {
  return offsetGeo((at.x - 210) * 3.5, (at.y - 210) * 3.5)
}

/** City3D pins of the Home map (prototype lines 1307–1313). Home and David sit on generated houses, so no `at`. */
const homePins: MapPin[] = [
  { name: "Margaret's home", sub: 'Home', color: '#14a08c', initials: 'M', big: true, kind: 'home', geo: offsetGeo(0, 0) },
  { name: 'David (brother)', sub: '', detail: '450 m · 6 min walk', color: '#2f6fb0', initials: 'D', phase: 0.3, kind: 'family', geo: offsetGeo(-300, 330) },
  { name: 'GP', sub: '', detail: 'Illawarra Rd Family Practice · Dr Patel · 350 m', color: '#ffffff', ink: '#0b7f71', initials: '+', phase: 0.5, at: { x: 162, y: 132, z: 12 }, kind: 'health', geo: gridGeo({ x: 162, y: 132, z: 12 }) },
  { name: 'Pharmacy', sub: '', detail: '280 m · open to 21:00', color: '#ffffff', ink: '#1fb39c', initials: 'Rx', phase: 0.7, at: { x: 127, y: 133, z: 9 }, kind: 'health', geo: gridGeo({ x: 127, y: 133, z: 9 }) },
  { name: 'Library cool room', sub: '', detail: '400 m · 120 places', color: '#8f6fd0', initials: 'L', phase: 0.1, at: { x: 305, y: 301, z: 21 }, kind: 'community', geo: gridGeo({ x: 305, y: 301, z: 21 }) },
  { name: 'Walking group', sub: '', detail: 'Thu 9:00 · Calvert Reserve', color: '#8f6fd0', initials: 'W', phase: 0.6, at: { x: 329, y: 211, z: 2 }, kind: 'community', geo: gridGeo({ x: 329, y: 211, z: 2 }) },
  { name: '→ Stroke centre 4.2 km', sub: '', detail: 'Camperdown Stroke Centre · north-east · 11 min by ambulance', color: '#ef4e4a', initials: '', tag: true, at: { x: 398, y: 398, z: 2 } },
]

/** Pins of the Surroundings map (prototype lines 1666–1673). The home pin keeps the generated house position. */
const watchPins: MapPin[] = [
  { name: 'Margaret', sub: '', detail: 'Home', color: '#14a08c', initials: 'M', big: true, kind: 'home', geo: offsetGeo(0, 0) },
  { name: 'Footpath works', sub: '', detail: 'Marrickville Rd outside the pharmacy · uneven surface until 24 Oct', color: '#c88a05', initials: '!', phase: 0.2, at: { x: 225, y: 146, z: 2 }, kind: 'alert', tone: 'watch', geo: gridGeo({ x: 225, y: 146, z: 2 }) },
  { name: 'Scam reported', sub: '', detail: 'Door-to-door "solar rebate" scam · 3 reports on this street since Monday', color: '#d9443f', initials: '!', phase: 0.4, at: { x: 70, y: 205, z: 8 }, kind: 'alert', tone: 'act', geo: gridGeo({ x: 70, y: 205, z: 8 }) },
  { name: 'Street light out', sub: '', detail: 'Calvert St since Sunday · reported to council #IW-48213', color: '#c88a05', initials: '☾', phase: 0.6, at: { x: 160, y: 270, z: 6 }, kind: 'alert', tone: 'watch', geo: gridGeo({ x: 160, y: 270, z: 6 }) },
  { name: 'Swooping magpie', sub: '', detail: 'Calvert Reserve, western path · spring nesting season', color: '#c88a05', initials: 'M', phase: 0.8, at: { x: 350, y: 235, z: 6 }, kind: 'alert', tone: 'watch', geo: gridGeo({ x: 350, y: 235, z: 6 }) },
  { name: 'Snake sighting', sub: '', detail: 'Cooks River path · keep to the paved track', color: '#c88a05', initials: 'S', phase: 0.1, at: { x: 60, y: 36, z: 2 }, kind: 'alert', tone: 'watch', geo: gridGeo({ x: 60, y: 36, z: 2 }) },
  { name: 'Cool room', sub: '', detail: 'Library · open 9–8 Thursday · 74 places left', color: '#1fb39c', initials: 'L', phase: 0.5, at: { x: 305, y: 301, z: 21 }, kind: 'alert', tone: 'info', geo: gridGeo({ x: 305, y: 301, z: 21 }) },
  { name: 'Vaccines', sub: '', detail: 'Pharmacy · flu and COVID walk-in Thu–Sat', color: '#1fb39c', initials: '+', phase: 0.7, at: { x: 127, y: 133, z: 9 }, kind: 'alert', tone: 'info', geo: gridGeo({ x: 127, y: 133, z: 9 }) },
]

/** `[severity, icon, title, text, source]` — prototype line 1681. */
const alerts: WatchAlert[] = (
  [
    ['act', 'shield', 'Scam door-knocks on her street', '"Solar rebate" callers, 3 reports since Monday. The helper reminded her not to open the door to unexpected visitors. She can call David with one tap if anyone worries her.', 'Police + neighbours · 2 d'],
    ['act', 'sun', 'Thursday heatwave, 38°', 'Indoor predicted 34° without air-con. Lift to the library cool room booked 11:00, extra check-ins 12:00 and 15:00.', 'Weather bureau · today'],
    ['aware', 'people', 'Key holder away 18–25 Oct', 'Aisha is away, so David is the only key holder. Suggest a key lockbox for paramedics.', 'Circle · 1 d'],
    ['aware', 'target', 'Footpath works outside the pharmacy', 'Uneven surface until 24 Oct. Her walking route now goes via Calvert St.', 'Council · 6 Oct'],
    ['aware', 'moon', 'Street light out on Calvert St', "Reported to council. Evening check-in moved earlier so she isn't walking home in the dark.", 'Agent · Sun'],
    ['aware', 'eye', 'Swooping magpies at Calvert Reserve', 'Walking group moved to the eastern path until November.', 'Residents · Sep'],
    ['help', 'plus', 'Free flu and COVID vaccines', 'Walk-in at her pharmacy Thu–Sat. She is due a COVID booster (last one 7 months ago).', 'Pharmacy · today'],
  ] as const
).map(([severity, icon, title, text, source]) => ({ severity, icon, title, text, source }))

/** NEWS (prototype line 1682): [category, source, age, headline, body, shown because]. */
const news: NewsItem[] = (
  [
    ['Health', 'State health department', '2 h', 'Heat health warning for Sydney, Thursday and Friday', 'Older people with heart conditions should stay cool, drink water and check in with family twice a day.', 'Shown because: heart condition, no air-con at home'],
    ['Safety', 'Local police', '5 h', 'Door-knock scam offering solar rebates targets older residents', 'Callers ask for bank details to "pre-approve" a rebate. Police advise not to open the door.', 'Shown because: lives alone, 3 reports on her street'],
    ['Weather', 'Weather bureau', '6 h', 'Southerly change Friday evening, gusts to 60 km/h', 'Temperatures drop 12° within an hour. Secure outdoor furniture.', 'Shown because: garden furniture, bedroom tree'],
    ['Community', 'Inner West Council', '1 d', 'Seniors festival: free morning tea at Marrickville Town Hall, Tue 20 Oct', 'Live music, health checks and a lift service from the library.', 'Shown because: social contacts below her normal'],
    ['Transport', 'Transport update', '1 d', 'No trains at Marrickville this weekend; buses replace trains', 'Buses leave from Illawarra Rd every 10 minutes.', 'Shown because: Sunday church in Sydenham'],
    ['Health', 'Pharmacy', '1 d', 'Flu and COVID vaccines available walk-in', 'Thursday to Saturday, no booking needed for over-65s.', 'Shown because: COVID booster due'],
    ['Safety', 'Council', '2 d', 'Hazard-reduction burns may bring smoke on Saturday', 'Keep windows closed and medicines for breathing close by.', 'Shown because: occasional asthma'],
    ['Community', 'Library', '2 d', 'Cool room open 9–8 on Thursday with seats reserved for over-75s', 'Free water, Wi-Fi and a quiet room for naps.', 'Shown because: heatwave plan'],
  ] as const
).map(([category, source, age, headline, body, shownBecause]) => ({ category, source, age, headline, body, shownBecause }))

/** `#air` (prototype line 1695): [day, quality, PM2.5, pollen, smoke, advice, tone]. */
const air: AirDay[] = (
  [
    ['Wed', 'Good · 32', '9', 'High', 'None', '—', 'good'],
    ['Thu', 'Fair · 48', '14', 'High', 'None', 'Stay in midday', 'warn'],
    ['Fri', 'Fair · 51', '16', 'Extreme', 'None', 'Asthma alert with southerly', 'bad'],
    ['Sat', 'Poor · 88', '31', 'Moderate', 'Likely', 'Windows closed', 'bad'],
    ['Sun', 'Fair · 45', '12', 'Moderate', 'Low', '—', 'warn'],
    ['Mon', 'Good · 28', '7', 'Low', 'None', '—', 'good'],
    ['Tue', 'Good · 30', '8', 'Moderate', 'None', '—', 'good'],
  ] as const
).map(([day, quality, pm25, pollen, smoke, advice, tone]) => ({ day, quality, pm25, pollen, smoke, advice, tone }))

const envKpiRows: PlainKpiRow[] = [
  ['🌡️', 'Temperature', '33', '°C', '#e07a3f', 'top today', '6° above normal', 'warn', [22, 24, 27, 29, 31, 32, 33, 33, 33]],
  ['🥵', 'Feels like', '35', '°C', '#d9443f', 'humid air', 'Hot', 'warn', [23, 25, 28, 31, 33, 34, 35, 35, 35]],
  ['💨', 'Wind', '22', 'km/h', '#5a7fe0', 'from the north-east', 'Cool change Fri', '', [8, 10, 12, 15, 18, 20, 22, 22, 22]],
  ['🕶️', 'Sun strength', '11', 'UV', '#c2417a', '10 am–3:30 pm', 'Extreme: stay in shade', 'bad', [1, 3, 6, 9, 11, 11, 10, 8, 6]],
  ['🌧️', 'Rain', '10', '% chance', '#2f6fb0', 'Saturday 60%', 'Dry today', '', [0, 0, 5, 5, 10, 10, 10, 10, 10]],
  ['🍃', 'Air quality', 'Good', '', '#1f8f5f', 'clean air today', 'Smoky Saturday', '', [28, 30, 31, 33, 32, 31, 32, 32, 32]],
  ['🌾', 'Pollen', 'High', '', '#c88a05', 'grass pollen', 'Keep inhaler near', 'warn', [3, 3, 4, 4, 4, 5, 5, 5, 5]],
  ['✈️', 'Plane noise', '68', 'dB', '#56706e', 'flight path', 'Quiet 11 pm–6 am', '', [50, 62, 66, 68, 67, 68, 66, 68, 68]],
  ['🔥', 'Heat risk', 'Medium', '', '#d9443f', 'High on Thursday', 'Plan in place', 'warn', [1, 1, 1, 2, 2, 2, 2, 3, 3]],
  ['🌅', 'Daylight', '13h', '', '#e2a32c', 'sunset 7:14 pm', 'Longer days', '', [12.8, 12.8, 12.9, 12.9, 12.9, 13, 13, 13, 13.03]],
  ['🌊', 'Sea breeze', 'None', '', '#2f6fb0', 'until Friday', 'Warm night', 'warn', [0, 0, 0, 0, 0, 0, 0, 0, 0]],
  ['🔌', 'Power cut risk', 'Low', '', '#8f6fd0', 'Medium Thursday', 'Fridge medicines OK', '', [1, 1, 1, 1, 1, 2, 2, 2, 2]],
]

export const surroundings: Surroundings = {
  homeMap: {
    kicker: '📍 Where Margaret lives',
    title: 'Marrickville, Sydney',
    detail: 'Inner West · 5.8 km south-west of the CBD · −33.911, 151.155',
    lat: -33.911,
    lng: 151.155,
    address: '186 Marrickville Rd, Marrickville NSW 2204',
    legend: [
      { color: '#14a08c', label: "Margaret's home" },
      { color: '#2f6fb0', label: 'Family nearby' },
      { color: '#ffffff', label: 'Health services', ring: true },
      { color: '#8f6fd0', label: 'Community' },
      { color: '#9b7fd4', label: 'Jacaranda in bloom', round: true },
    ],
    chips: [
      { icon: 'people', text: 'David · 450 m · 6 min walk' },
      { icon: 'clinic', text: 'GP · 350 m' },
      { icon: 'pill', text: 'Pharmacy · 280 m' },
      { icon: 'hospital', text: 'Stroke centre · 4.2 km · 11 min' },
      { icon: 'siren', text: 'Ambulance median 9.4 min (2204)' },
      { icon: 'sun', text: 'Thursday 38 °C' },
    ],
    ariaLabel:
      "3D model of Margaret's streets in Marrickville: her home on Marrickville Road, her brother David 450 metres west, the GP and pharmacy nearby, the library cool room, the park walking group and the Cooks River to the south",
    pins: homePins,
    walkRing: { label: '5 MIN WALK', radius: 118 },
    labels: [
      { text: 'Marrickville Rd', x: 345, y: 150, bold: true },
      { text: 'Illawarra Rd', x: 110, y: 384, bold: true },
      { text: 'Calvert St', x: 52, y: 270 },
      { text: 'Victoria Rd', x: 250, y: 305 },
      { text: 'Cooks River', x: 300, y: 12 },
      { text: 'Calvert Reserve', x: 329, y: 240 },
      { text: 'Marrickville Station', x: 220, y: 345 },
    ],
  },
  watchMap: {
    kicker: '👀 Neighbourhood watch',
    title: "Around Margaret's home",
    detail: 'What to pay attention to when you live alone · 8 items within 1 km',
    ariaLabel:
      "3D map of Margaret's streets with neighbourhood alerts: footpath works, a reported scam, street light out, swooping magpies, a snake sighting and the heat cool room",
    legend: [
      { color: '#d9443f', label: 'Act' },
      { color: '#c88a05', label: 'Be aware' },
      { color: '#1fb39c', label: 'Helpful' },
    ],
    ring: { label: 'WATCH AREA', radius: 150 },
  },
  pins: watchPins,
  weather: {
    heading: '🌤️ Weather in Marrickville',
    meta: 'Now · 15:10',
    temp: '33°',
    summary: 'Sunny, hot north-easterly',
    feelsLike: 'Feels like 35° · indoor 29.5°',
    stats: (
      [
        ['Sunrise', '05:47', 'sunset 19:14'],
        ['Humidity', '41%', 'dew point 18°'],
        ['Pressure', '1009', 'hPa · falling'],
        ['Overnight low', '24°', 'Thu · hot night'],
        ['Fire danger', 'High', 'Thu–Fri'],
        ['Visibility', '10 km', 'clear'],
      ] satisfies MiniRow[]
    ).map(mini),
    note: 'Heatwave conditions Thursday and Friday. A southerly change is expected Friday evening with gusts to 60 km/h.',
  },
  week: [
    { day: 'Wed', icon: 'sun', high: 33, low: 19, hot: false },
    { day: 'Thu', icon: 'sun', high: 38, low: 24, hot: true },
    { day: 'Fri', icon: 'wind', high: 36, low: 18, hot: true },
    { day: 'Sat', icon: 'cloud', high: 26, low: 16, hot: false },
    { day: 'Sun', icon: 'cloud', high: 24, low: 15, hot: false },
    { day: 'Mon', icon: 'drop', high: 23, low: 14, hot: false },
    { day: 'Tue', icon: 'sun', high: 25, low: 15, hot: false },
  ],
  kpis: envKpiRows.map(plainKpi),
  alertsHeading: { title: '👀 Worth knowing, living alone', meta: 'Living alone · sorted by urgency' },
  alerts,
  newsHeading: { title: '📰 News that matters to her', meta: 'Filtered for a 78-year-old living alone in 2204' },
  newsCategories: ['All', 'Health', 'Safety', 'Weather', 'Community', 'Transport'],
  news,
  thursday: {
    outdoor: [22, 24, 27, 30, 33, 35, 37, 38, 38, 37, 36, 34, 32, 30, 28, 27, 26],
    indoor: [26, 26.5, 27, 27.8, 28.8, 30, 31, 32, 33, 33.8, 34, 33.8, 33.2, 32.5, 31.5, 30.8, 30],
    coolRoom: { from: 5, to: 10, label: 'at library cool room' },
    plan: [
      { at: 3, label: 'fluids' },
      { at: 6, label: 'check-in' },
      { at: 9, label: 'check-in' },
      { at: 12, label: 'check-in' },
    ],
    legend: [
      { color: '#e07a3f', label: 'Outdoor' },
      { color: '#d9443f', label: 'Inside her home (no air-con)' },
      { color: 'rgba(143,111,208,.2)', label: "Helper's plan" },
    ],
  },
  air,
  airNote:
    'Spring grass pollen is high, and hazard-reduction burns south of Sydney may bring smoke on Saturday. Her inhaler reminder is on for those days.',
  nearby: [
    { initials: 'W', color: '#8f6fd0', name: 'Walking group · Calvert Reserve', note: 'Thu 9:00 · she came 3 of the last 4 weeks', pill: { tone: 'good', text: 'Going' } },
    { initials: 'A', color: '#c2611f', name: 'Aisha · neighbour, 2 doors down', note: 'Verified volunteer · key holder', pill: { tone: 'brand', text: 'Backup' } },
    { initials: 'M', color: '#5a7fe0', name: 'Meals delivery', note: 'Tue and Fri · next Fri 11:30', pill: { tone: 'plain', text: 'Booked' } },
    { initials: 'L', color: '#22a593', name: 'Library tech help', note: 'Mondays 10:00 · video calls with Sarah', pill: { tone: 'plain', text: 'Optional' } },
  ],
}
