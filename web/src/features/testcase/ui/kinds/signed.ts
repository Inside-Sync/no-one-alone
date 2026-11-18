/** A number with its sign kept: "+3", "0", and the true minus sign "−0.5" (not a hyphen). */
export const signed = (v: number): string => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : String(v))
/** A number with the true minus sign for negatives, no plus. */
export const minus = (v: number): string => (v < 0 ? `−${Math.abs(v)}` : String(v))
