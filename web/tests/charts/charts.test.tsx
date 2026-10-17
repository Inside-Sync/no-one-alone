import { render, screen } from '@testing-library/react'
import { Sparkline } from '@/components/charts/Sparkline'
import { LineChart } from '@/components/charts/LineChart'
import { Bars } from '@/components/charts/Bars'
import { Heatmap } from '@/components/charts/Heatmap'
import { Radar } from '@/components/charts/Radar'
import { Ring } from '@/components/charts/Ring'
import { Waterfall } from '@/components/charts/Waterfall'
import { Timeline } from '@/components/charts/Timeline'

/* Reference: prototype `spark()` (line 1168), kept verbatim apart from types. */
function protoSpark(v: number[]) {
  const w = 100, h = 26, mn = Math.min(...v), mx = Math.max(...v), r = mx - mn || 1
  const pts = v.map((x, i) => [(i / (v.length - 1)) * w, h - 3 - ((x - mn) / r) * (h - 6)])
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  return { d, last: pts[pts.length - 1] }
}

test('Sparkline reproduces the prototype spark() geometry', () => {
  const v = [62, 63, 64, 63, 65, 64, 66, 64, 68]
  const { container } = render(<Sparkline values={v} color="#ef6a5e" />)
  const svg = container.querySelector('svg')!
  expect(svg).toHaveAttribute('viewBox', '0 0 100 26')
  expect(svg).toHaveAttribute('preserveAspectRatio', 'none')
  expect(svg).toHaveAttribute('role', 'img')
  expect(svg.getAttribute('aria-label')).toMatch(/62.*68/)
  const ref = protoSpark(v)
  const [area, line] = Array.from(svg.querySelectorAll('path'))
  expect(area).toHaveAttribute('d', ref.d + ' L100 26 L0 26Z')
  expect(area).toHaveAttribute('opacity', '.12')
  expect(line).toHaveAttribute('d', ref.d)
  expect(line).toHaveAttribute('stroke-width', '1.6')
  expect(line).toHaveAttribute('vector-effect', 'non-scaling-stroke')
  const c = svg.querySelector('circle')!
  expect(c).toHaveAttribute('cx', String(ref.last[0]))
  expect(c).toHaveAttribute('cy', String(ref.last[1]))
  expect(c).toHaveAttribute('r', '2.4')
})

test('Sparkline can be decorative like inside a KPI tile', () => {
  const { container } = render(<Sparkline values={[1, 2]} color="#000" decorative />)
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  expect(container.querySelector('svg')).not.toHaveAttribute('role')
})

test('LineChart marks projection dashed after projectedFrom', () => {
  render(
    <LineChart
      yLabel="Systolic"
      series={[{ name: 'BP', values: [128, 131, 133, 137, 140, 146, 148.5, 151], color: '#c88a05' }]}
      projectedFrom={5}
      y={{ min: 120, max: 166, ticks: [125, 135] }}
    />,
  )
  const svg = screen.getByRole('img')
  const paths = svg.querySelectorAll('path')
  expect(paths).toHaveLength(2)
  expect(paths[0]).not.toHaveAttribute('stroke-dasharray')
  expect(paths[1]).toHaveAttribute('stroke-dasharray', '5 4')
  // the dashed part starts where the solid part ends
  const end = paths[0].getAttribute('d')!.split(' L').pop()
  expect(paths[1].getAttribute('d')!.startsWith('M' + end)).toBe(true)
  expect(svg.getAttribute('aria-label')).toMatch(/Systolic/)
})

/* Reference: the line/band helpers inside prototype `bpChart()` (line 1449). */
test('LineChart reproduces bpChart geometry (bands, dashed projections, ticks)', () => {
  const L = 44, Rr = 548, T = 10, B = 196, lo = 120, hi = 166
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T)
  const x = (w: number) => L + ((w - 1) * (Rr - L)) / 9
  const cur = [146, 148.5, 151, 153.5, 156], ad = [146, 140, 136, 133, 131]
  const protoLine = (arr: number[], start: number) => arr.map((v, i) => (i ? 'L' : 'M') + x(start + i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')
  const up = cur.map((v, i) => [x(6 + i), y(v + 2.2 * i)]), dn = cur.map((v, i) => [x(6 + i), y(v - 2.2 * i)]).reverse()
  const protoBand = 'M' + up.concat(dn).map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + 'Z'

  const { container } = render(
    <LineChart
      ariaLabel="Morning systolic blood pressure rose from 128 to 146 over six weeks and is projected to reach 156 without changes"
      yLabel="Systolic"
      viewBox={[580, 214]}
      plot={{ left: 44, right: 548, top: 10, bottom: 196, tickGap: 8, tickDy: 3.5 }}
      x={{ count: 10, labels: Array.from({ length: 10 }, (_, i) => ({ at: i, text: 'W' + (i + 1) })) }}
      y={{ min: lo, max: hi, ticks: [125, 135, 145, 155, 165] }}
      targetBand={{ from: lo, to: 135, color: 'rgba(31,179,156,.10)' }}
      marker={{ at: 5, label: 'today' }}
      bands={[{ start: 5, values: cur, spread: 2.2, color: 'rgba(217,68,63,.12)' }]}
      series={[
        { name: 'Current path', start: 5, values: cur, color: '#d9443f', dashed: true, endLabel: true },
        { name: 'On tablets', start: 5, values: ad, color: '#1fb39c', dashed: true },
      ]}
    />,
  )
  const svg = container.querySelector('svg')!
  expect(svg).toHaveAttribute('viewBox', '0 0 580 214')
  expect(svg).toHaveAttribute('aria-label', expect.stringMatching(/^Morning systolic/))
  const ds = Array.from(svg.querySelectorAll('path')).map((p) => p.getAttribute('d'))
  expect(ds).toContain(protoBand)
  expect(ds).toContain(protoLine(cur, 6))
  expect(ds).toContain(protoLine(ad, 6))
  const tick = Array.from(svg.querySelectorAll('text')).find((t) => t.textContent === '125')!
  expect(tick).toHaveAttribute('x', String(L - 8))
  expect(tick).toHaveAttribute('y', String(y(125) + 3.5))
  expect(tick).toHaveAttribute('text-anchor', 'end')
  const rect = svg.querySelector('rect')!
  expect(rect).toHaveAttribute('y', String(y(135)))
  expect(rect).toHaveAttribute('height', String(B - y(135)))
  expect(Array.from(svg.querySelectorAll('text')).map((t) => t.textContent)).toEqual(expect.arrayContaining(['W1', 'W10', 'today', '156']))
})

test('Heatmap renders 168 cells', () => {
  const rows = Array.from({ length: 7 }, (_, r) => Array.from({ length: 24 }, (_, h) => ((r + h) % 10) / 10))
  const anomaly = rows.map((row, r) => row.map((_, h) => r === 0 && h === 2))
  const future = rows.map((row, r) => row.map((_, h) => r === 6 && h > 15))
  const { container } = render(
    <Heatmap rows={rows} rowLabels={['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Today']} anomaly={anomaly} future={future} />,
  )
  const host = container.querySelector('.hm')!
  expect(host).toHaveAttribute('role', 'img')
  const cells = host.querySelectorAll('i')
  expect(cells).toHaveLength(168)
  expect(host.querySelectorAll('i.an')).toHaveLength(1)
  expect(host.querySelectorAll('i[title="Not yet"]')).toHaveLength(8)
  expect(cells[0]).toHaveAttribute('title', 'Thu 0:00 · 0% of peak')
  expect((cells[0] as HTMLElement).style.background).toBe('rgb(238, 245, 242)')
  const hx = Array.from(host.querySelectorAll('.hx')).map((s) => s.textContent)
  expect(hx).toHaveLength(24)
  expect(hx.slice(0, 4)).toEqual(['00', '', '', '03'])
})

test('Radar reproduces the prototype polygons and keeps its aria-label', () => {
  const axes = [['Body', 61, 74], ['Medicines', 68, 90], ['Moving', 74, 80], ['Sleep', 70, 76], ['Social', 82, 84], ['Memory', 88, 90], ['Home', 58, 78]] as const
  const label = 'Overall wellbeing 72 out of 100: body 61, medicines 68, moving 74, sleep 70, social 82, memory 88, home 58'
  const { container } = render(
    <Radar axes={axes.map(([l, v, u]) => ({ label: l, value: v, usual: u }))} score={72} ariaLabel={label} />,
  )
  const svg = container.querySelector('svg')!
  expect(svg).toHaveAttribute('viewBox', '0 0 240 226')
  expect(svg).toHaveAttribute('aria-label', label)
  const pt = (i: number, v: number) => { const a = -Math.PI / 2 + (i / 7) * Math.PI * 2; return [120 + (86 * v / 100) * Math.cos(a), 112 + (86 * v / 100) * Math.sin(a)] }
  const polys = svg.querySelectorAll('polygon')
  expect(polys).toHaveLength(6)
  expect(polys[5]).toHaveAttribute('points', axes.map((a, i) => pt(i, a[1]).join(',')).join(' '))
  expect(polys[5]).toHaveAttribute('stroke', '#0b7f71')
  expect(polys[4]).toHaveAttribute('stroke-dasharray', '4 3')
  expect(svg.querySelectorAll('circle')).toHaveLength(7)
  expect(Array.from(svg.querySelectorAll('text')).pop()!.textContent).toBe('72')
})

test('Ring draws the gauge arc like the prototype', () => {
  const { container } = render(<Ring value={212} max={300} label="Move" unit="kcal" color="#ef6a5e" />)
  const host = container.firstElementChild!
  expect(host).toHaveAttribute('role', 'img')
  expect(host).toHaveAttribute('aria-label', 'Move: 212 of 300 kcal')
  const [track, arc] = Array.from(host.querySelectorAll('path'))
  expect(track).toHaveAttribute('d', 'M12 62 A48 48 0 0 1 108 62')
  expect(track).toHaveAttribute('stroke', 'var(--track)')
  const L = Math.PI * 48
  expect(arc).toHaveAttribute('stroke-dasharray', (L * (212 / 300)).toFixed(1) + ' ' + L.toFixed(1))
  expect(host.querySelector('b')).toHaveTextContent('Move')
  expect(host.querySelector('small')).toHaveTextContent('of 300 kcal')
})

test('Waterfall: red bar to the right for increases, green to the left for decreases', () => {
  const { container } = render(
    <Waterfall items={[{ label: 'Blood pressure trend', delta: 0.58 }, { label: 'Daily activity', delta: -0.06 }]} base={0.6} />,
  )
  const host = container.querySelector('.shap')!
  expect(host).toHaveAttribute('role', 'img')
  const bars = host.querySelectorAll('.b i') as NodeListOf<HTMLElement>
  expect(bars[0].style.left).toBe('50%')
  expect(bars[0].style.background).toBe('rgb(217, 68, 63)')
  expect(bars[0].style.width).toBe(String((0.58 / 0.6) * 50) + '%')
  expect(bars[1].style.right).toBe('50%')
  expect(bars[1].style.background).toBe('rgb(31, 179, 156)')
  const vals = host.querySelectorAll('b')
  expect(vals[0]).toHaveTextContent('+0.58')
  expect(vals[0]).toHaveStyle({ color: 'var(--bad-text)' })
  expect(vals[1]).toHaveTextContent('−0.06')
})

test('Bars colour over-threshold days red and place the threshold line', () => {
  const { container } = render(
    <Bars values={[33, 38]} labels={['Wed', 'Thu']} goal={{ value: 35, label: 'heatwave 35°' }} max={40} unit="°" />,
  )
  const host = container.querySelector('.vbars')!
  expect(host).toHaveAttribute('role', 'img')
  const bars = host.querySelectorAll('i') as NodeListOf<HTMLElement>
  expect(bars[0].style.height).toBe(Math.round((33 / 40) * 96) + 'px')
  expect(bars[0].style.background).toBe('rgb(31, 179, 156)')
  expect(bars[1].style.background).toBe('rgb(217, 68, 63)')
  expect(host.querySelector('b')).toHaveTextContent('33°')
  const thr = host.querySelector('.thr') as HTMLElement
  expect(thr).toHaveTextContent('heatwave 35°')
  expect(thr.style.bottom).toBe((20 + (35 / 40) * 96).toFixed(0) + 'px')
})

test('Timeline marks done and current steps', () => {
  const { container } = render(
    <Timeline
      ariaLabel="Live timeline"
      items={[
        { at: '02:04', phase: 'Detect', title: 'Fall detected', detail: 'Wearable', status: 'done' },
        { at: '02:05', phase: 'Check', title: 'Agent calls Margaret', detail: 'No answer', status: 'current' },
        { at: '02:06', title: 'David alerted', status: 'pending' },
      ]}
    />,
  )
  const lis = container.querySelectorAll('ol.tl li')
  expect(lis[0]).toHaveClass('done')
  expect(lis[0]).not.toHaveClass('cur')
  expect(lis[1]).toHaveClass('done', 'cur')
  expect(lis[2]).not.toHaveClass('done')
  expect(lis[1].querySelector('.tm')).toHaveTextContent('02:05')
  expect(lis[1].querySelector('b')).toHaveTextContent('Check.')
  expect(lis[1].querySelector('small')).toHaveTextContent('No answer')
})
