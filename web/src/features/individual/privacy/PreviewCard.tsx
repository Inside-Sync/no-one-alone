'use client'

import type { CSSProperties } from 'react'
import { useRouter } from '@/app/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/components/ui/Toast'
import { PRIVACY_COPY } from '@/data/repo'
import { CATEGORY_IDS, countSees } from '@/domain/consent'
import { useAppState } from '@/state/AppState'

/** `👁️ Preview` (c6): one button per person that switches to the family view as them. */
export function PreviewCard() {
  const { people, share, paused, setViewer, setWho } = useAppState()
  const router = useRouter()
  const toast = useToast()
  const c = PRIVACY_COPY.preview
  return (
    <GlassCard span={6}>
      <div className="ch"><h2>{c.title}</h2><span className="meta">{c.meta}</span></div>
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
              toast(c.toast(p.name))
            }}
          >
            <span className="av sm" style={{ '--c': p.color, width: 22, height: 22, fontSize: 10 } as CSSProperties}>{p.initials}</span>
            See what {p.name} sees{share ? ` · ${countSees(share, paused, p.id)} of ${CATEGORY_IDS.length}` : ''}
          </button>
        ))}
      </div>
    </GlassCard>
  )
}
