import type { Severity } from '@/data/types'

/** How full a facility is: under 70% of capacity, 70 to 89%, or 90% and over (the design's three zones). */
export type CapacityBand = 'under' | 'right' | 'over'

export const UNDER_CAPACITY = 70
export const OVER_CAPACITY = 90

export function capacityBand(percent: number): CapacityBand {
  return percent >= OVER_CAPACITY ? 'over' : percent >= UNDER_CAPACITY ? 'right' : 'under'
}

/** Dot and pill colours of a band: over = red, right amount = green, under = blue. */
export const BAND_COLOUR: Record<CapacityBand, string> = { over: '#d9443f', right: '#1f9d57', under: '#5a7fe0' }
export const BAND_PILL: Record<CapacityBand, 'bad' | 'good' | 'brand'> = { over: 'bad', right: 'good', under: 'brand' }

export const ON_TARGET = 85
export const WATCH = 70

/** In care in time: 85% and over is on target, 70 to 84% is to watch, below 70% is the red zone. */
export type CareStatus = 'target' | 'watch' | 'below'

export function careStatus(inCare: number): CareStatus {
  return inCare >= ON_TARGET ? 'target' : inCare >= WATCH ? 'watch' : 'below'
}

export const STATUS_PILL: Record<CareStatus, 'good' | 'warn' | 'bad'> = { target: 'good', watch: 'warn', below: 'bad' }
export const STATUS_COLOUR: Record<CareStatus, string> = { target: '#1f9d57', watch: '#c88a05', below: '#d9443f' }

/** Colour tone of a value against a good and a warn threshold (higher is better). */
export function toneAt(value: number, good: number, warn: number): Severity {
  return value >= good ? 'good' : value >= warn ? 'warn' : 'bad'
}
