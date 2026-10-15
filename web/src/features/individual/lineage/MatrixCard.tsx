import { GlassCard } from '@/components/ui/GlassCard'
import { useTranslation } from 'react-i18next'
import type { Lineage } from '@/data/types'
import { fillForWhiteText } from '@/lib/color'
import { Head } from '../home/parts'
import { TableScroll } from '@/components/ui/TableScroll'

/** `Condition matrix` (c7): age at onset per relative; blank cells use the track colour. */
export function MatrixCard({ lineage }: { lineage: Lineage }) {
  const keys = lineage.conditionKeys
  const { t } = useTranslation('lineage')
  return (
    <GlassCard span={7}>
      <Head title={t('matrix.title')} meta={t('matrix.meta')} />
      <TableScroll>
        <table className="mx" id="mx">
          <thead>
            <tr><th>{t('matrix.person')}</th>{lineage.matrixColumns.map((k) => <th key={k}>{keys[k].name}</th>)}</tr>
          </thead>
          <tbody>
            {lineage.matrix.map((r) => (
              <tr key={r.person}>
                <td>{r.person}</td>
                {lineage.matrixColumns.map((k) => {
                  const v = r.onset[k]
                  return v != null
                    ? <td key={k} style={{ background: fillForWhiteText(keys[k].color), color: '#fff', fontWeight: 600 }}>{v}</td>
                    : <td key={k} style={{ background: 'var(--track)' }}></td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
