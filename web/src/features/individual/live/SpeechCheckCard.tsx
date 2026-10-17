'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { TurnDoc } from '@/data/contract'
import { Head } from '../home/parts'

const SPEECH_CHECK = /sky is blue in sydney|trời sydney hôm nay xanh/i

/** The latest assessed reply to the speech check question (asked again or not), or null before one. */
function speechCheck(turns: readonly TurnDoc[]): { slurred: boolean; sentence: string } | null {
  let question: string | null = null
  let found: { slurred: boolean; sentence: string } | null = null
  for (const turn of turns) {
    if (turn.by === 'AGENT') { question = SPEECH_CHECK.test(turn.text) ? turn.text : null; continue }
    const clarity = turn.assessment?.clarity
    if (question === null || (clarity !== 'SLURRED' && clarity !== 'CLEAR')) continue
    const colon = question.lastIndexOf(': ')
    found = { slurred: clarity === 'SLURRED', sentence: colon < 0 ? question : question.slice(colon + 2) }
  }
  return found
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
    </GlassCard>
  )
}
