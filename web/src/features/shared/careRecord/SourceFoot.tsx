import styles from './careRecord.module.css'

export interface SourceFootProps {
  /** Where the data on the card came from. */
  source: string
  /** When it was taken, in the caller's format. */
  time: string
}

/** Footer line of a data card: a dot, the source and the time. Every data card of a care record carries one. */
export function SourceFoot({ source, time }: SourceFootProps) {
  return (
    <div className={styles.foot}>
      <i aria-hidden="true" /><span>{source}</span><time>{time}</time>
    </div>
  )
}
