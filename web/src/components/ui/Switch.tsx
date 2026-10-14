interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  id?: string
  disabled?: boolean
  title?: string
}

/** `<button class="sw" role="switch" aria-checked>`. */
export function Switch({ checked, onChange, label, id, disabled, title }: Props) {
  return (
    <button
      type="button"
      className="sw"
      id={id}
      disabled={disabled}
      title={title}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  )
}
