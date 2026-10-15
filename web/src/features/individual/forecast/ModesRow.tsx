import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from 'react-i18next'
import type { ModeCard } from '@/data/types'

/** Hearing / Vision / Memory mode buttons (c12 `.modes`): click toggles aria-pressed, the tag and a toast. */
export function ModesRow({ modes }: { modes: ModeCard[] }) {
  const toast = useToast()
  const [state, setState] = useState(() => modes.map((m) => ({ on: m.on, tag: m.tag })))
  const { t } = useTranslation('forecast')
  return (
    <div className="c12 modes">
      {modes.map((m, i) => (
        <button
          key={m.name}
          type="button"
          className="mode glass"
          aria-pressed={state[i].on}
          data-mode={m.name}
          onClick={() => {
            const on = !state[i].on
            setState((s) => s.map((x, j) => (j === i ? { on, tag: on ? t('modes.on') : t('modes.off') } : x)))
            const name = t(`modes.names.${m.name}`)
            toast(on ? t('modes.toastOn', { name }) : t('modes.toastOff', { name }))
          }}
        >
          <span className="ic"><Icon name={m.icon} /></span>
          <b>{m.title}</b>
          <small>{m.description}</small>
          <span className="tog">{state[i].tag}</span>
        </button>
      ))}
    </div>
  )
}
