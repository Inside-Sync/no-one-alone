import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid">
      <article className="glass card c12">
        <div className="ch"><h2>Page not found</h2></div>
        <p className="sub">That page does not exist. <Link href="/individual/home">Go to Home</Link></p>
      </article>
    </main>
  )
}
