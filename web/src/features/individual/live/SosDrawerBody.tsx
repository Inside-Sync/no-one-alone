'use client'

import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { LIVE_COPY } from '@/data/repo'

const plain = { fontWeight: 500 } as const

/** Drawer body for `Script for 000` (prototype `DR.sos` and the `copyAddr` handler). */
export function SosDrawerBody() {
  const toast = useToast()
  const c = LIVE_COPY.sos
  const address = c.rows[0][1]
  const copy = () => {
    try {
      navigator.clipboard.writeText(address).then(() => toast(c.copied), () => toast(address))
    } catch {
      toast(address)
    }
  }
  return (
    <>
      <p className="fine">{c.intro}</p>
      <div className="packet">
        {c.rows.map(([k, v]) => <div key={k}><span>{k}</span><b style={plain}>{v}</b></div>)}
      </div>
      <div className="row">
        <button type="button" className="btn sos" onClick={() => toast(c.callToast)}>
          <span className="ic"><Icon name="phone" /></span>{c.call}
        </button>
        <button type="button" className="btn soft" id="copyAddr" onClick={copy}>{c.copy}</button>
      </div>
      <p className="fine">{c.note}</p>
    </>
  )
}
