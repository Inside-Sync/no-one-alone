import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { useTranslation } from 'react-i18next'
import type { SignRow } from '@/data/types'
import { Head } from '../home/parts'
import { TableScroll } from '@/components/ui/TableScroll'

const colour = (t: SignRow['tone']) => (t === 'warn' ? 'var(--warn-text)' : t === 'bad' ? 'var(--bad-text)' : 'var(--good-text)')

/** `What we keep an eye on` (c12): `#sigRows`, plain-language version. */
export function SignsCard({ signs }: { signs: SignRow[] }) {
  const { t } = useTranslation('forecast')
  const columns = t('signs.columns', { returnObjects: true })
  return (
    <GlassCard span={12}>
      <Head icon="eye" title={t('signs.title')} meta={t('signs.meta')} />
      <TableScroll>
        <table>
          <thead><tr>{columns.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="sigRows">
            {signs.map((r) => (
              <tr key={r.sign}>
                <td><Glyph name={r.icon} />{r.sign}</td>
                <td>{r.from}</td>
                <td>{r.frequency}</td>
                <td className="n">{r.now}</td>
                <td className="n">{r.usual}</td>
                <td style={{ color: colour(r.tone) }}>{r.comparison}</td>
                <td><Pill tone={r.tone}>{t(`signs.status.${r.tone}`)}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
