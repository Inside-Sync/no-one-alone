import { useId, type CSSProperties } from 'react'
import './agentOrb.css'

/** The prototype's animated Noa planet (`orb()`): `talk` ripples while Noa works, `alert` turns it red. */
export function AgentOrb({ size, talk, alert }: { size: number; talk?: boolean; alert?: boolean }) {
  const k = useId().replace(/:/g, '')
  const cls = ['orbw', talk ? 'talk' : '', alert ? 'alert' : ''].filter(Boolean).join(' ')
  return (
    <span className={cls} style={{ '--s': `${size}px` } as CSSProperties} aria-hidden="true">
      <i className="rip"></i><i className="rip r2"></i>
      <svg viewBox="0 0 48 48" width={size} height={size}>
        <defs>
          <radialGradient id={`${k}g`} cx="34%" cy="28%" r="78%">
            <stop offset="0" stopColor="#eafff9" /><stop offset=".22" stopColor="#8ff0d8" /><stop offset=".55" stopColor="#1fb39c" /><stop offset="1" stopColor="#075a50" />
          </radialGradient>
          <radialGradient id={`${k}h`} cx="50%" cy="50%" r="50%">
            <stop offset=".6" stopColor="#7fffd4" stopOpacity="0" /><stop offset="1" stopColor="#7fffd4" stopOpacity=".45" />
          </radialGradient>
          <clipPath id={`${k}c`}><circle cx="24" cy="24" r="15" /></clipPath>
        </defs>
        <circle cx="24" cy="24" r="21" fill={`url(#${k}h)`} className="halo" />
        <ellipse cx="24" cy="24" rx="22" ry="6.5" transform="rotate(-18 24 24)" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1" />
        <circle cx="24" cy="24" r="15" fill={`url(#${k}g)`} />
        <g clipPath={`url(#${k}c)`} fill="none" stroke="#fff" strokeOpacity=".38" strokeWidth=".8">
          <ellipse cx="24" cy="24" rx="15" ry="3.2" /><ellipse cx="24" cy="16" rx="13" ry="2.4" /><ellipse cx="24" cy="32" rx="13" ry="2.4" />
          {[0, 1.33, 2.66].map((d) => (
            <ellipse key={d} cx="24" cy="24" rx="15" ry="15">
              <animate attributeName="rx" values="15;0;15" dur="4s" begin={`-${d}s`} repeatCount="indefinite" />
            </ellipse>
          ))}
        </g>
        <ellipse cx="19" cy="17" rx="5" ry="3" fill="#fff" opacity=".55" transform="rotate(-30 19 17)" />
        <g transform="rotate(-18 24 24)">
          <path d="M2 24 A22 6.5 0 0 0 46 24" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="1.2" />
          <circle r="2.7" fill="#fff" stroke="#1fb39c" strokeWidth="1.2">
            <animateMotion dur="6s" repeatCount="indefinite" path="M46 24 A22 6.5 0 1 1 2 24 A22 6.5 0 1 1 46 24" />
          </circle>
        </g>
      </svg>
    </span>
  )
}
