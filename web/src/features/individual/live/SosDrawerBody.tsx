'use client'

import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'

const plain = { fontWeight: 500 } as const

/** Drawer body for `Script for 000` (prototype `DR.sos` and the `copyAddr` handler). */
export function SosDrawerBody() {
  const toast = useToast()
  const { t } = useTranslation('live')
  const rows = t('sos.rows', { returnObjects: true })
  const address = rows[0][1]
  const copy = () => {
    try {
      navigator.clipboard.writeText(address).then(() => toast(t('sos.copied')), () => toast(address))
    } catch {
      toast(address)
    }
  }
  return (
    <>
      <p className="fine">{t('sos.intro')}</p>
      <div className="packet">
        {rows.map(([k, v]) => <div key={k}><span>{k}</span><b style={plain}>{v}</b></div>)}
      </div>
      <div className="row">
        <button type="button" className="btn sos" onClick={() => toast(t('sos.callToast'))}>
          <span className="ic"><Icon name="phone" /></span>{t('sos.call')}
        </button>
        <button type="button" className="btn soft" id="copyAddr" onClick={copy}>{t('sos.copy')}</button>
      </div>
      <p className="fine">{t('sos.note')}</p>
    </>
  )
}
