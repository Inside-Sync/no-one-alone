/**
 * The backdrop: the skyline photo and the night fade live in globals.css (`.scene`, `.scene::after`).
 * Over them, the prototype's per-view pastel gradients (`.vb-*`, shown at .86 for the current view, dark versions in the dark theme,
 * hidden during a night alert so the night photo shows).
 */
export function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="view-bg">
        <i className="vb vb-individual" />
        <i className="vb vb-hospital" />
        <i className="vb vb-government" />
      </div>
    </div>
  )
}
