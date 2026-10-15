'use client'

import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { LIVE_COPY } from '@/data/repo'
import type { LiveView } from '@/domain/incident'

/** Drawer body for the emergency call: the agent's `callScript` (contract 2.3), read aloud by a person. */
export function LiveScriptBody({ view }: { view: LiveView }) {
  const toast = useToast()
  const c = LIVE_COPY.sos
  const copy = () => {
    const text = view.callScript ?? ''
    try {
      navigator.clipboard.writeText(text).then(() => toast(LIVE_COPY.sos.copied), () => toast(text))
    } catch {
      toast(text)
    }
  }
  return (
    <>
      <p className="fine">{c.intro}</p>
      <div className="packet">
        <div><span>Script</span><b style={{ fontWeight: 500 }}>{view.callScript ?? LIVE_COPY.live.scriptPending}</b></div>
      </div>
      <div className="row">
        <button type="button" className="btn sos" onClick={() => toast(`Dialling ${view.emergencyNumber} · ask for ambulance`)}>
          <span className="ic"><Icon name="phone" /></span>{`Call ${view.emergencyNumber}`}
        </button>
        {view.callScript && <button type="button" className="btn soft" onClick={copy}>Copy script</button>}
      </div>
      <p className="fine">{c.note}</p>
    </>
  )
}
