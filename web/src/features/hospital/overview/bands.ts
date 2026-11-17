/** Capacity bands the Department of Health uses: under 70% in use, 70-89% right amount, 90% and over. */
export type Band = 'under' | 'right' | 'over'

export const bandOf = (pct: number): Band => (pct >= 90 ? 'over' : pct >= 70 ? 'right' : 'under')

export const BAND_TONE = { under: 'plain', right: 'good', over: 'bad' } as const

/** Bar colour of a capacity line: red over capacity, green right amount, blue under. */
export const BAND_COLOUR: Record<Band, string> = { under: '#5a7fe0', right: '#1f9d57', over: '#d9443f' }

/** Bar colour of a department's bed use: red from 90%, amber from 85%, green below. */
export const usageColour = (pct: number) => (pct >= 90 ? '#d9443f' : pct >= 85 ? '#c88a05' : '#1f9d57')

/** Bar colour of an outcome: green at the good mark, amber at the warning mark, red below. */
export const outcomeColour = (v: number, good: number, warn: number) => (v >= good ? '#1f9d57' : v >= warn ? '#c88a05' : '#d9443f')

export const pctOf = (used: number, total: number) => Math.round((used / total) * 100)
