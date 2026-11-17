'use client'

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkline } from '@/components/charts/Sparkline'
import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { Kpi } from '@/components/ui/Kpi'
import { Locked } from '@/components/ui/Locked'
import { Pill } from '@/components/ui/Pill'
import { TableScroll } from '@/components/ui/TableScroll'
import type { CareRecord, EncounterTrack } from '@/data/types'
import { SourceFoot } from '@/features/shared/careRecord'
import { KpiDrawerBody } from '@/features/shared/drawers'
import { toneVar } from '@/lib/tone'
import { EntryLi, EntryTr, Head } from './shell'
import { type RecordShell, type StepId } from './useRecordShell'
import styles from './record.module.css'

const L = 90, R = 740, Y0 = 18
const x = (m: number) => L + (m / 46) * (R - L)

/** `#enc`: one dot per encounter on five swim lanes, 2023–2026. */
function EncounterChart({ enc }: { enc: CareRecord['encounters'] }) {
  const { t: tr } = useTranslation('record')
  return (
    <svg viewBox="0 0 760 156" role="img" aria-label={tr('enc.ariaLabel')}>
      {[0, 1, 2, 3].map((yr) => (
        <g key={yr}>
          <line x1={x(yr * 12)} x2={x(yr * 12)} y1="6" y2="140" stroke="rgba(13,42,42,.1)" />
          <text x={x(yr * 12) + 4} y="150">{2023 + yr}</text>
        </g>
      ))}
      <line x1={x(enc.now)} x2={x(enc.now)} y1="6" y2="140" stroke="#ef4e4a" strokeDasharray="3 3" />
      <text x={x(enc.now) - 4} y="150" textAnchor="end" style={{ fill: '#ef4e4a' }}>{tr('enc.now')}</text>
      {enc.types.map((t: EncounterTrack, i) => {
        const yy = Y0 + i * 26
        return (
          <g key={t.type}>
            <text x="0" y={yy + 4} style={{ fontFamily: 'var(--font)', fontSize: '11px', fill: 'var(--ink2)' }}>{tr(`enc.types.${t.type}`)}</text>
            <line x1={L} x2={R} y1={yy} y2={yy} stroke="rgba(13,42,42,.06)" />
            {t.months.map((m, j) => (
              <circle key={j} cx={x(m).toFixed(1)} cy={yy} r={t.type === 'Emergency' ? 6 : 4.5} fill={t.color} stroke="#fff" strokeWidth="1.2">
                <title>{tr(`enc.types.${t.type}`)}</title>
              </circle>
            ))}
          </g>
        )
      })}
      {enc.markers.map((m) => (
        <text key={m.label} x={x(m.month)} y={Y0 + 3 * 26 - 10} textAnchor="middle" style={{ fill: '#ef4e4a' }}>{m.label}</text>
      ))}
    </svg>
  )
}

function Encounters({ enc }: { enc: CareRecord['encounters'] }) {
  const { t } = useTranslation('record')
  return (
    <GlassCard span={8} className="enc">
      <Head title={t('enc.title')} meta={enc.meta} />
      <div id="enc"><EncounterChart enc={enc} /></div>
      <div className="legend">
        {enc.types.map((tr) => <span key={tr.type}><i style={{ background: tr.color, borderRadius: '50%' }}></i>{t(`enc.types.${tr.type}`)}</span>)}
      </div>
      <SourceFoot source={enc.source} time={enc.time} />
    </GlassCard>
  )
}

function Medicines({ record, shell }: { record: CareRecord; shell: RecordShell }) {
  const { t } = useTranslation('record')
  const head = t('medicines.head', { returnObjects: true })
  const a = record.allergyNote
  return (
    <GlassCard span={4}>
      <Head title={t('medicines.title')}><Pill tone={record.medicinesPill.tone}>{record.medicinesPill.text}</Pill></Head>
      <TableScroll>
        <table style={{ minWidth: 0 }}>
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="meds">
            {record.medicines.map((m) => (
              <EntryTr key={m.name} entry={m.entry} shell={shell}>
                <td><b style={{ fontWeight: 500 }}>{m.name}</b><small>{m.timing}</small></td>
                <td className="n" style={{ color: toneVar(m.tone) }}>{m.adherence}%</td>
                <td style={{ fontSize: '12px' }}>{m.last}</td>
              </EntryTr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <p className="fine">{t('medicines.allergy')}: <b style={{ color: 'var(--bad-text)' }}>{a.allergen}</b> ({a.detail}). {a.checked}</p>
      <SourceFoot {...record.medicinesSource} />
    </GlassCard>
  )
}

function Journey({ record, shell }: { record: CareRecord; shell: RecordShell }) {
  const { t } = useTranslation('record')
  // Fill colour of the stage's top rule, and the darker (night: lighter) tone that its heading text uses.
  const colors: Record<string, [rule: string, text: string]> = {
    before: ['#c88a05', 'var(--warn-text)'], symptoms: ['#d9443f', 'var(--bad-text)'], results: ['#2563a8', 'var(--brand-text)'],
    treatment: ['#0b7f71', 'var(--brand-text)'], recovery: ['#1f8f5f', 'var(--good-text)'],
  }
  const j = record.journey
  return (
    <GlassCard span={12}>
      <Head title={<><Glyph name="target" />{t('journey.title')}</>} meta={t('journey.meta')} />
      <ol className={styles.journey}>
        {j.stages.map((s, i) => (
          <EntryLi key={s.id} entry={s.entry} shell={shell} className={styles.stage} style={{ '--stage': colors[s.id][0], '--stage-text': colors[s.id][1] } as CSSProperties}>
            <h3>{t('journey.stage', { n: i + 1, name: t(`journey.names.${s.id}`) })}</h3>
            <b>{s.title}</b>
            <small>{s.when}</small>
            <ul>{s.items.map((it) => <li key={it}>{it}</li>)}</ul>
          </EntryLi>
        ))}
      </ol>
      <SourceFoot source={j.source} time={j.time} />
    </GlassCard>
  )
}

function Kpis({ kpis }: { kpis: CareRecord['kpis'] }) {
  const { t } = useTranslation()
  const drawer = useDrawer()
  const actions = t('drawerActions.row', { returnObjects: true })
  return (
    <div className="c12 kpis" id="recKpis">
      {kpis.map((k) => (
        <Kpi
          key={k.label} icon={k.icon} label={k.label} value={k.value} unit={k.unit} sub={k.baseline} delta={k.delta} tone={k.tone}
          onOpen={() => drawer.open(k.label, <KpiDrawerBody kpi={k} actions={actions} fallback="individual" />)}
          foot={<SourceFoot source={k.source} time={k.time} />}
        >
          <Sparkline values={k.spark} color={k.color} decorative />
        </Kpi>
      ))}
    </div>
  )
}

/** Step 1 · Summary: where she is, what happened, the six record tiles, medicines and encounters. */
export function SummaryStep({ record, shell, go }: { record: CareRecord; shell: RecordShell; go: (id: StepId) => void }) {
  const { t } = useTranslation('record')
  const h = record.home
  return (
    <>
      <Locked cat="records" span={12}>
        <GlassCard span={12}>
          <div className={styles.home}>
            <span>
              <b><Glyph name="home" />{shell.say(h.title)}</b>
              <small>{shell.say(h.sub)}</small>
            </span>
            <span className={styles.homeBtns}>
              <button type="button" className="btn" onClick={() => go('tx')}><Glyph name="pill" />{t('home.treatmentPlan')}</button>
              <button type="button" className="btn soft" onClick={() => go('fu')}><Glyph name="trend" />{t('home.followUp')}</button>
            </span>
          </div>
          <SourceFoot source={h.source} time={h.time} />
        </GlassCard>
      </Locked>
      <Locked cat="records" span={12}><Journey record={record} shell={shell} /></Locked>
      <Locked cat="records" span={12}><Kpis kpis={record.kpis} /></Locked>
      <Locked cat="records" span={4}><Medicines record={record} shell={shell} /></Locked>
      <Locked cat="records" span={8}><Encounters enc={record.encounters} /></Locked>
    </>
  )
}
