/**
 * Story clock (contract "Story clock"): every countdown and "minutes since alert" uses
 * `Date.now() + demo.clockOffsetMs`, never the raw client clock. The one place the live flow reads the wall clock.
 */
export const storyNow = (clockOffsetMs: number): number => Date.now() + clockOffsetMs
