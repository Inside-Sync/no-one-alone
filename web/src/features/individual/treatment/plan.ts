import type { RecoveryDoc } from '@/data/contract'
import type { TreatmentData } from '@/data/treatment.types'
import type { IconName } from '@/data/types'
import {
  CALL_DAYS, SLOTS, dayLabel, daysHome, followUpCalls, isStopped, localDay, localTime, medsExplained, taskIcon, todayTasks,
} from '@/domain/recovery'

/** What the Treatment page shows, whether the plan is the snapshot in the data or the one the hospital just sent. */
export interface PlanModel {
  summary: string
  summaryAudio?: string
  day: number
  chips: { icon: IconName; tone: 'stop' | 'plain'; text: string }[]
  /** Local time `HH:MM` the page treats as now. */
  now: string
  tasks: { id: string; time: string; kind: 'MED' | 'ACTIVITY'; icon: IconName; title: string; why?: string; audio?: string; done: boolean }[]
  meds: { key: string; name: string; when: string; why?: string; change?: 'New' | 'Increased' | 'Continue' | 'Stop'; entry: string }[]
  appts: { key: string; title: string; when: string; entry: string }[]
  /** Check-in call days, and which are already made. */
  calls: { day: number; date?: string; done: boolean }[]
  notes?: string
  planSource: { source: string; time: string }
  remindersSource: { source: string; time: string }
  tasksSource: { source: string; time: string }
  medsSource: { source: string; time: string }
  apptsSource: { source: string; time: string }
  warningSource: { source: string; time: string }
  callsSource: { source: string; time: string }
  meta: string
}

/** The snapshot of Moza's plan in `treatment.json`; `say` picks the wording for the role. */
export function staticPlan(d: TreatmentData, say: (v: { self: string; family: string }) => string): PlanModel {
  return {
    summary: say(d.plan.summary),
    day: d.plan.day,
    chips: d.plan.chips,
    now: d.reminders.now,
    tasks: d.tasks.items.map((x, i) => ({ id: `${x.time}-${i}`, time: x.time, kind: x.kind, icon: x.icon, title: x.title, why: x.why, done: x.done })),
    meds: d.medicines.items.map((m) => ({ key: m.name, name: m.name, when: m.when, why: m.why, change: m.change, entry: m.entry })),
    appts: d.appointments.items.map((a) => ({ key: a.title, title: a.title, when: a.when, entry: a.entry })),
    calls: CALL_DAYS.map((day) => ({ day, done: d.calls.done.includes(day) })),
    planSource: { source: d.plan.source, time: d.plan.time },
    remindersSource: { source: d.reminders.source, time: d.reminders.time },
    tasksSource: { source: d.tasks.source, time: d.tasks.time },
    medsSource: { source: d.medicines.source, time: d.medicines.time },
    apptsSource: { source: d.appointments.source, time: d.appointments.time },
    warningSource: d.warning,
    callsSource: d.calls,
    meta: d.plan.meta,
  }
}

interface LiveText {
  /** `Stop: {{name}}` */
  stop: (name: string) => string
  /** Words for a medicine's time slots. */
  slot: (key: 'morning' | 'midday' | 'evening' | 'night') => string
  lang: string
}

/**
 * The plan the hospital approved (a live incident, or the mock's in-memory plan), in the same shape.
 * Wording comes from the hospital; the sources and the layout come from the snapshot, so every card still names its source.
 */
export function livePlan(r: RecoveryDoc, tz: string, nowMs: number, base: PlanModel, text: LiveText): PlanModel {
  const stopped = r.meds.filter(isStopped)
  const when = dayLabel(localDay(Date.parse(r.createdAt), tz), text.lang)
  const src = <T extends { source: string; time: string }>(s: T) => ({ source: s.source, time: when })
  return {
    summary: r.summary,
    summaryAudio: r.summaryAudioPath,
    day: Math.min(30, Math.max(1, daysHome(r.createdAt, nowMs, tz))),
    chips: [
      ...stopped.map((m) => ({ icon: 'octagon-x' as IconName, tone: 'stop' as const, text: text.stop(m.name) })),
      ...r.activities.filter((a) => !a.times.length).map((a) => ({ icon: 'circle-check' as IconName, tone: 'plain' as const, text: a.text })),
    ],
    now: localTime(nowMs, tz),
    tasks: todayTasks(r).map((x) => ({ id: x.id, time: x.time, kind: x.kind, icon: taskIcon(x), title: x.title, why: x.why, audio: x.audioPath, done: false })),
    meds: medsExplained(r).map((m) => ({
      key: m.name, name: `${m.name} ${m.dose}`,
      when: m.times.map((t) => (t in SLOTS ? text.slot(SLOTS[t as keyof typeof SLOTS]) : t)).join(', '),
      why: m.why, change: m.change, entry: '',
    })),
    appts: r.followUps.map((f) => ({ key: f.text, title: f.text, when: dayLabel(f.date, text.lang), entry: '' })),
    calls: followUpCalls(r.createdAt, tz).map((c) => ({ day: c.day, date: dayLabel(c.date, text.lang), done: false })),
    notes: r.notes || undefined,
    planSource: src(base.planSource),
    remindersSource: src(base.remindersSource),
    tasksSource: src(base.tasksSource),
    medsSource: src(base.medsSource),
    apptsSource: src(base.apptsSource),
    warningSource: src(base.warningSource),
    callsSource: src(base.callsSource),
    meta: base.meta,
  }
}
