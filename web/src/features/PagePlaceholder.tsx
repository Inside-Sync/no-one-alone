'use client'

/** Stand-in until each page's real content lands (Tasks 7-13). */
export function PagePlaceholder({ view, page }: { view: string; page: string }) {
  return (
    <main className="grid" data-page={page} data-view-id={view}>
      <article className="glass card c12">
        <div className="ch"><h2>{page}</h2></div>
      </article>
    </main>
  )
}
