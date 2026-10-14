import { Fragment } from 'react'
import { CardHeader } from '@/components/ui/CardHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import type { Lineage, LineageNode } from '@/data/types'
import { fillForWhiteText } from '@/lib/color'

/** `.node.dec` fades the whole node to .82, so its chips need extra contrast to stay at AA once blended. */
const DEC_MIN_CONTRAST = 6.5

function Node({ node, keys }: { node: LineageNode; keys: Lineage['conditionKeys'] }) {
  return (
    <div className={node.kind ? `node ${node.kind}` : 'node'}>
      <b>{node.name}</b>
      <small>{node.sub}</small>
      <span className="cx">
        {node.conditions.map(([k, v]) => (
          <i key={k} style={{ background: fillForWhiteText(keys[k].color, node.kind === 'dec' ? DEC_MIN_CONTRAST : undefined) }}>{k} {v}</i>
        ))}
      </span>
    </div>
  )
}

/** `Four generations` (c7): pedigree `#ped` plus the condition legend `#cxLegend`. */
export function Pedigree({ lineage }: { lineage: Lineage }) {
  const keys = lineage.conditionKeys
  return (
    <GlassCard span={7}>
      <CardHeader icon="tree" title={lineage.heading} meta={lineage.meta} />
      <div className="ped" id="ped">
        {lineage.generations.map((g, i) => (
          <Fragment key={g.label}>
            {i > 0 && <span className="lk"></span>}
            <span className="gen-l">{g.label}</span>
            <div className="gen">{g.nodes.map((n) => <Node key={n.name} node={n} keys={keys} />)}</div>
          </Fragment>
        ))}
      </div>
      <div className="legend" id="cxLegend">
        {(Object.keys(keys) as (keyof typeof keys)[]).map((k) => (
          <span key={k}><i style={{ background: fillForWhiteText(keys[k].color) }}></i>{k} {keys[k].name}</span>
        ))}
        <span className="muted">{lineage.legendNote}</span>
      </div>
    </GlassCard>
  )
}
