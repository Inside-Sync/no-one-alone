/**
 * Generic port of the prototype's hand-built line charts: `bpChart()` (line
 * 1449) plus the same pattern in `#bp14`, `#thu`, `#hr24` and `#demand14`.
 * Coordinates are produced by the same formulas and number formatting
 * (`toFixed(1)` for line paths, raw numbers elsewhere) so the svg matches.
 */
import { textTone } from '@/lib/tone'


export interface LineSeries {
  name: string
  values: number[]
  color: string
  /** Whole series dashed ("5 4"), e.g. a projection. */
  dashed?: boolean
  /** Dash pattern when dashed; defaults to "5 4". */
  dash?: string
  /** x index of `values[0]`. */
  start?: number
  /** Stroke width; the prototype uses 2.4 for bpChart/#thu, 2.2 for #bp14. */
  width?: number
  /** Fill under the line down to the plot bottom. */
  area?: string
  /**
   * Points: `hollow` draws white dots with a coloured ring and a bigger filled
   * last dot (observed BP); otherwise plain filled dots.
   */
  dots?: { r: number; lastR?: number; hollow?: boolean }
  /** Rounded last value written to the right of the line; a string sets its colour. */
  endLabel?: boolean | string
}

/** Widening band around a projection: ±spread×i (bpChart `band()`). */
export interface SpreadBand {
  values: number[]
  spread: number
  color: string
  start?: number
}

interface Props {
  series: LineSeries[]
  /** What the y axis measures; used in the default aria-label. */
  yLabel: string
  ariaLabel?: string
  /** x index after which solid series continue as a dashed projection. */
  projectedFrom?: number
  /** Explicit min–max band (`#hr24` style). */
  band?: { lo: number[]; hi: number[]; color?: string; start?: number }
  bands?: SpreadBand[]
  viewBox?: [number, number]
  plot?: { left: number; right: number; top: number; bottom: number; tickGap?: number; tickDy?: number }
  x?: { count: number; labels?: { at: number; text: string }[] }
  y?: { min: number; max: number; ticks?: number[]; format?: (v: number) => string }
  /** Shaded target zone between two y values (e.g. BP under 135). */
  targetBand?: { from: number; to: number; color: string }
  /** Dashed vertical marker, e.g. "today". */
  marker?: { at: number; label: string }
}

const f1 = (n: number) => n.toFixed(1)

export function LineChart({
  series,
  yLabel,
  ariaLabel,
  projectedFrom,
  band,
  bands = [],
  viewBox = [580, 214],
  plot = { left: 44, right: 548, top: 10, bottom: 196 },
  x: xAxis,
  y: yAxis,
  targetBand,
  marker,
}: Props) {
  const { left: L, right: Rr, top: T, bottom: B } = plot
  const tickGap = plot.tickGap ?? 8
  const tickDy = plot.tickDy ?? 3.5
  const count = xAxis?.count ?? Math.max(...series.map((s) => (s.start ?? 0) + s.values.length))
  const all = series.flatMap((s) => s.values)
  const lo = yAxis?.min ?? Math.min(...all)
  const hi = yAxis?.max ?? Math.max(...all)
  const y = (v: number) => B - ((v - lo) / (hi - lo || 1)) * (B - T)
  const x = (i: number) => L + (i * (Rr - L)) / Math.max(1, count - 1)
  const fmt = yAxis?.format ?? String
  const linePath = (vals: number[], start: number) =>
    vals.map((v, i) => (i ? 'L' : 'M') + f1(x(start + i)) + ' ' + f1(y(v))).join(' ')

  const label =
    ariaLabel ??
    `${yLabel}: ` +
      series
        .map((s) => `${s.name} from ${s.values[0]} to ${s.values[s.values.length - 1]}`)
        .join('; ') +
      (projectedFrom != null ? ' (dashed part is projected)' : '')

  return (
    <svg viewBox={`0 0 ${viewBox[0]} ${viewBox[1]}`} role="img" aria-label={label}>
      {(yAxis?.ticks ?? []).map((t) => [
        <line key={'g' + t} x1={L} x2={Rr} y1={y(t)} y2={y(t)} stroke="rgba(13,42,42,.08)" />,
        <text key={'t' + t} x={L - tickGap} y={y(t) + tickDy} textAnchor="end">{fmt(t)}</text>,
      ])}
      {targetBand && (
        <rect x={L} y={y(targetBand.to)} width={Rr - L} height={y(targetBand.from) - y(targetBand.to)} fill={targetBand.color} />
      )}
      {marker && [
        <line key="ml" x1={x(marker.at)} x2={x(marker.at)} y1={T} y2={B} stroke="rgba(13,42,42,.25)" strokeDasharray="3 3" />,
        <text key="mt" x={x(marker.at) + 4} y={T + 8}>{marker.label}</text>,
      ]}
      {bands.map((b, k) => {
        const s = b.start ?? 0
        const up = b.values.map((v, i) => [x(s + i), y(v + b.spread * i)])
        const dn = b.values.map((v, i) => [x(s + i), y(v - b.spread * i)]).reverse()
        return <path key={'b' + k} d={'M' + up.concat(dn).map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L') + 'Z'} fill={b.color} />
      })}
      {band && (() => {
        const s = band.start ?? 0
        const up = band.hi.map((v, i) => f1(x(s + i)) + ' ' + f1(y(v)))
        const dn = band.lo.map((v, i) => f1(x(s + i)) + ' ' + f1(y(v))).reverse()
        return <path d={'M' + up.join(' L') + ' L' + dn.join(' L') + 'Z'} fill={band.color ?? 'rgba(239,106,94,.12)'} />
      })()}
      {series.map((s, k) => {
        const start = s.start ?? 0
        const width = String(s.width ?? 2.4)
        const dash = s.dash ?? '5 4'
        const lastI = start + s.values.length - 1
        const split = !s.dashed && projectedFrom != null && projectedFrom > start && projectedFrom < lastI
        const solid = split ? s.values.slice(0, projectedFrom - start + 1) : s.values
        return [
          s.area && (
            <path
              key={'a' + k}
              d={
                s.values.map((v, i) => (i ? 'L' : 'M') + x(start + i) + ' ' + y(v)).join(' ') +
                ' L' + x(lastI) + ' ' + B + ' L' + x(start) + ' ' + B + 'Z'
              }
              fill={s.area}
            />
          ),
          <path
            key={'l' + k}
            d={linePath(solid, start)}
            fill="none"
            stroke={s.color}
            strokeWidth={width}
            strokeDasharray={s.dashed ? dash : undefined}
          />,
          split && (
            <path
              key={'p' + k}
              d={linePath(s.values.slice(projectedFrom - start), projectedFrom)}
              fill="none"
              stroke={s.color}
              strokeWidth={width}
              strokeDasharray={dash}
            />
          ),
          ...(s.dots
            ? s.values.map((v, i) => {
                const last = i === s.values.length - 1
                const d = s.dots!
                return d.hollow ? (
                  <circle key={'d' + k + '-' + i} cx={x(start + i)} cy={y(v)} r={last && d.lastR ? d.lastR : d.r} fill={last ? s.color : '#fff'} stroke={s.color} strokeWidth="2" />
                ) : (
                  <circle key={'d' + k + '-' + i} cx={x(start + i)} cy={y(v)} r={last && d.lastR ? d.lastR : d.r} fill={s.color} />
                )
              })
            : []),
        ]
      })}
      {(xAxis?.labels ?? []).map((l) => (
        <text key={'x' + l.at} x={x(l.at)} y={B + 16} textAnchor="middle">{l.text}</text>
      ))}
      {series
        .filter((s) => s.endLabel)
        .map((s, k) => {
          const v = s.values[s.values.length - 1]
          return (
            <text key={'e' + k} x={x((s.start ?? 0) + s.values.length - 1) + 4} y={y(v) + 4} style={{ fill: textTone(typeof s.endLabel === 'string' ? s.endLabel : s.color), fontSize: '11px' }}>{v.toFixed(0)}</text>
          )
        })}
    </svg>
  )
}
