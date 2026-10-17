'use client'

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@/app/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { CATEGORY_IDS, countSees } from '@/domain/consent'
import { useAppState } from '@/state/AppState'

/** `Preview` (c6): one button per person that switches to the family view as them. */
export function PreviewCard() {
  const { people, share, paused, setViewer, setWho } = useAppState()
  const router = useRouter()
  const toast = useToast()
  const { t } = useTranslation('privacy')
  return (
    <GlassCard span={6}>
      <div className="ch"><h2><Glyph name="eye" />{t('preview.title')}</h2><span className="meta">{t('preview.meta')}</span></div>
      <div className="row">
        {people.slice(0, 4).map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn soft"
            onClick={() => {
              setViewer(p.id)
              setWho('family')
              router.push('/individual/home')
              toast(t('preview.toast', { name: p.name }))
            }}
          >
            <Avatar name={p.name} className="av sm" style={{ '--c': p.color, width: 22, height: 22, fontSize: 10 } as CSSProperties}>{p.initials}</Avatar>
            {share ? t('seeWhatCount', { name: p.name, n: countSees(share, paused, p.id), total: CATEGORY_IDS.length }) : t('seeWhat', { name: p.name })}
          </button>
        ))}
      </div>
    </GlassCard>
  )
}
