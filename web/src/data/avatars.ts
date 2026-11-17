import i18n from '@/i18n'

const PATEL = 'dr-patel'

/**
 * Photo for a known person (matched on the name), else undefined: callers keep the initials. The names are written the
 * way the language in use writes them (`common:avatarNames`: written name, photo file), so Arabic names show the same photos.
 */
export function avatarSrc(name?: string | null): string | undefined {
  const table = new Map(i18n.t('common:avatarNames', { returnObjects: true }) as unknown as [string, string][])
  const words = (name ?? '').trim().toLowerCase().split(/[\s.,·]+/).filter(Boolean)
  if (words.some((w) => table.get(w) === PATEL)) return `/avatars/${PATEL}.jpg`
  const file = table.get(words[0] ?? '')
  return file && file !== PATEL ? `/avatars/${file}.jpg` : undefined
}
