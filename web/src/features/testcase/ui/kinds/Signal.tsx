/** The phone status bar's signal bars (prototype "5G" with three bars), drawn, not typed: decorative. */
export function Signal() {
  return (
    <svg className="tc-signal" viewBox="0 0 14 10" width="14" height="10" aria-hidden="true" focusable="false">
      <rect x="0" y="6" width="3" height="4" rx="0.5" fill="currentColor" />
      <rect x="5" y="3" width="3" height="7" rx="0.5" fill="currentColor" />
      <rect x="10" y="0" width="3" height="10" rx="0.5" fill="currentColor" />
    </svg>
  )
}
