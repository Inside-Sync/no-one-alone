interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  id?: string
}

/** `<button class="sw" role="switch" aria-checked>`. */
export function Switch({ checked, onChange, label, id }: Props) {
  return (
    <button
      type="button"
      className="sw"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  )
}
