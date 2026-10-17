/** F5 on the live page starts the demo from scratch; in-app navigation never reloads, so it keeps the incident. */
export function resetsOnLoad(navType: string | undefined, path: string): boolean {
  return navType === 'reload' && /^\/individual\/live\/?$/.test(path)
}
