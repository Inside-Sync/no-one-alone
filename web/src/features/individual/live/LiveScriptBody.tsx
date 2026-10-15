'use client'

import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import type { LiveView } from '@/domain/incident'

/** Drawer body for the emergency call: the agent's `callScript` (contract 2.3), read aloud by a person. */
export function LiveScriptBody({ view }: { view: LiveView }) {
  const toast = useToast()
  const { t } = useTranslation('live')
  const copy = () => {
    const text = view.callScript ?? ''
    try {
      navigator.clipboard.writeText(text).then(() => toast(t('sos.copied')), () => toast(text))
    } catch {
      toast(text)
    }
  }
  return (
    <>
      <p className="fine">{t('sos.intro')}</p>
      <div className="packet">
        <div><span>{t('script.label')}</span><b style={{ fontWeight: 500 }}>{view.callScript ?? t('live.scriptPending')}</b></div>
      </div>
      <div className="row">
        <button type="button" className="btn sos" onClick={() => toast(t('script.dialling', { num: view.emergencyNumber }))}>
          <span className="ic"><Icon name="phone" /></span>{t('script.call', { num: view.emergencyNumber })}
        </button>
        {view.callScript && <button type="button" className="btn soft" onClick={copy}>{t('script.copy')}</button>}
      </div>
      <p className="fine">{t('sos.note')}</p>
    </>
  )
}
