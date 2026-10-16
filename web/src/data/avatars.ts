const FIRST = new Set(['margaret', 'david', 'aisha', 'james', 'sarah', 'priya'])

/** Photo for a known person (matched on the name), else undefined: callers keep the initials. */
export function avatarSrc(name?: string | null): string | undefined {
  const n = (name ?? '').trim().toLowerCase()
  if (n.includes('patel')) return '/avatars/dr-patel.jpg'
  const w = n.split(/\s+/)[0]
  return FIRST.has(w) ? `/avatars/${w}.jpg` : undefined
}
