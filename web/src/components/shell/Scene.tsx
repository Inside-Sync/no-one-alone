/** Images and the night fade live in globals.css (`.scene`, `.scene::after`); `.scene-tint` is the per-view gradient over them. */
export function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene-tint" />
    </div>
  )
}
