import { useId, type ReactNode } from 'react'

interface Props {
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
  label: ReactNode
  valueText: string
  disabled?: boolean
}

/** Prototype `#sAdh` pattern: label row with visible value, then the range input. */
export function Slider({ min, max, step, value, onChange, label, valueText, disabled }: Props) {
  const id = useId()
  return (
    <label htmlFor={id}>
      <span className="lv"><span>{label}</span><b>{valueText}</b></span>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
