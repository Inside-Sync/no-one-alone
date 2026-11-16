import { useTranslation } from 'react-i18next'
import { useRouter } from '@/app/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import type { LoopStep } from '@/data/types'
import { Head } from '../../individual/home/parts'

/** `Where every case is` (c6): cases per stage with the longest wait against its deadline, and a link to the results to review. */
export function StepsCard({ steps }: { steps: LoopStep[] }) {
  const { t } = useTranslation('screening')
  const router = useRouter()
  const max = Math.max(...steps.map((s) => s.count))
  return (
    <GlassCard span={6}>
      <Head title={t('loop.steps.title')} meta={t('loop.steps.meta')} />
      <div className="hbars" id="loopSteps">
        {steps.map((s) => (
          <div key={s.label} style={{ gridTemplateColumns: '150px minmax(0,1fr) 40px' }}>
            <span>
              {s.label}
              <small style={{ display: 'block', fontSize: 11, color: s.late ? 'var(--bad-text)' : 'var(--muted-text)' }}>{s.note}</small>
            </span>
            <span className="tr"><i style={{ width: `${(s.count / max) * 100}%`, background: s.late ? '#ef4e4a' : '#0b7f71' }} /></span>
            <b>{s.count}</b>
          </div>
        ))}
      </div>
      <button type="button" className="btn soft" onClick={() => router.push('/hospital/review')}>{t('loop.steps.open')}</button>
    </GlassCard>
  )
}
