/** Family member status (engine `FamState.status`) -> tone class of the badge (prototype FST). */
export const FAM_STATUS_TONE: Record<string, 'good' | 'info' | 'warn' | 'bad' | 'muted'> = {
  ok: 'good',
  care: 'info',
  booked: 'info',
  due: 'warn',
  overdue: 'bad',
  alert: 'bad',
  declined: 'muted',
}

/** The tone as the level word of a `.lv` pill (prototype noaFam). */
export const toneLevel = (tone: string): 'green' | 'red' | 'amber' | 'info' => (tone === 'good' ? 'green' : tone === 'bad' ? 'red' : tone === 'warn' ? 'amber' : 'info')
