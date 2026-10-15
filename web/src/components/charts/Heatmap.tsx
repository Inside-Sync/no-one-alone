import { useTranslation } from 'react-i18next'
import { ramp } from '@/lib/color'

const STOPS = ['#eef5f2', '#8fd3c3', '#1fb39c', '#0b6157']

interface Props {
  /** One row per day, one 0..1 value per hour (share of peak). */
  rows: number[][]
  rowLabels: string[]
  /** Column header text; defaults to "00", "03", … every third hour as the prototype. */
  colLabels?: string[]
  /** Cells that are unusual for her (red ring, class `an`). */
  anomaly?: boolean[][]
  /** Cells still in the future ("Not yet"). */
  future?: boolean[][]
  ariaLabel?: string
}

/** Prototype routine heatmap `#hm` (line 1437): a `.hm` grid of `<i>` cells. */
export function Heatmap({ rows, rowLabels, colLabels, anomaly, future, ariaLabel }: Props) {
  const { t } = useTranslation()
  const cols = rows[0]?.length ?? 0
  const head = colLabels ?? Array.from({ length: cols }, (_, h) => (h % 3 === 0 ? String(h).padStart(2, '0') : ''))
  const unusual = anomaly ? anomaly.flat().filter(Boolean).length : 0
  const label =
    ariaLabel ??
    t('charts.heatmap', { days: rows.length, hours: cols }) + (unusual ? t('charts.heatmapUnusual', { count: unusual }) : '')
  return (
    <div className="hm" role="img" aria-label={label}>
      <span></span>
      {head.map((t, h) => (
        <span className="hx" key={'h' + h}>{t}</span>
      ))}
      {rows.map((row, r) => [
        <span key={'l' + r}>{rowLabels[r]}</span>,
        ...row.map((v, h) =>
          future?.[r]?.[h] ? (
            <i key={r + '-' + h} style={{ background: 'var(--track)' }} title={t('charts.notYet')}></i>
          ) : (
            <i
              key={r + '-' + h}
              className={anomaly?.[r]?.[h] ? 'an' : undefined}
              style={{ background: ramp(v, STOPS) }}
              title={t('charts.cell', { day: rowLabels[r], hour: h, pct: Math.round(v * 100) })}
            ></i>
          ),
        ),
      ])}
    </div>
  )
}
