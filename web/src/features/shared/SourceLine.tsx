import s from './SourceLine.module.css'

/** The line at the foot of a data card: where the numbers come from and when they were last read. */
export function SourceLine({ source, time }: { source: string; time: string }) {
  return (
    <div className={s.src}>
      <i aria-hidden="true" />
      <span>{source}</span>
      <time>{time}</time>
    </div>
  )
}
