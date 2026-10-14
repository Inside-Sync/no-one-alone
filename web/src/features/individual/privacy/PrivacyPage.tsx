'use client'

import { AuditCard } from './AuditCard'
import { EmergencyCard } from './EmergencyCard'
import { PreviewCard } from './PreviewCard'
import { ShareCard } from './ShareCard'

/** Individual view · Who sees what (`<main data-page="privacy">`). Consent state lives in AppState. */
export function PrivacyPage() {
  return (
    <main className="grid" data-page="privacy">
      <ShareCard />
      <PreviewCard />
      <EmergencyCard />
      <AuditCard />
    </main>
  )
}
