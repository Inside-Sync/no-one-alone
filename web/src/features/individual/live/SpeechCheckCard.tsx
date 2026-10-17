'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { TurnDoc } from '@/data/contract'
import { Head } from '../home/parts'

/** The answer to Q2 (the speech check): the first assessed reply after the second question, or null until then. */
function speechCheck(turns: readonly TurnDoc[]): { slurred: boolean; sentence: string; heard: string } | null {
  let asked = 0
  let question = ''
  for (const turn of turns) {
    if (turn.by === 'AGENT') { asked++; question = turn.text; continue }
    const clarity = turn.assessment?.clarity
    if (asked !== 2 || (clarity !== 'SLURRED' && clarity !== 'CLEAR')) continue
    return { slurred: clarity === 'SLURRED', sentence: question.slice(question.lastIndexOf(': ') + 2), heard: turn.text }
  }
  return null
}

/** Noa Speech Check: Gemini's verdict on the repeated sentence. */
export function SpeechCheckCard({ turns }: { turns: readonly TurnDoc[] }) {
  const { t } = useTranslation('live')
  const check = speechCheck(turns)
  if (!check) return null
  return (
    <GlassCard span={5} id="spkCard">
      <Head title={t('speech.title')} />
      <p style={{ fontWeight: 600, color: check.slurred ? 'var(--bad)' : 'var(--good-text)' }}>
        {check.slurred ? t('speech.slurred') : t('speech.clear')}
      </p>
      <p className="fine">{t('speech.sentence', { s: check.sentence })}</p>
      {check.heard && <p className="fine">{t('speech.heard', { s: check.heard })}</p>}
    </GlassCard>
  )
}
