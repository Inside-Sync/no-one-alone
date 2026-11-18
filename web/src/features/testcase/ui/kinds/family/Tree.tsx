'use client'

import { Fragment } from 'react'
import { Glyph } from '@/components/ui/Icon'
import { FAMILY_MEMBERS } from '../../../data/family'
import { pct, tx } from '../../../engine'
import type { ScreenProps } from '../types'
import { useP } from '../prevention/parts'
import { FAM_STATUS_TONE } from './tones'

const GENS = [1, 2, 3, 4] as const

/**
 * The family tree of four generations (prototype famTreeHTML): every member is a button that selects them for the editor and the forecast,
 * with their relationship, status and, where Noa Forecast applies, the 10-year heart risk.
 */
export function FamilyTree({ engine, snap, r }: ScreenProps) {
  const t = useP()
  const F = snap.state.fm
  const fam = snap.family
  if (!F || !fam) return null
  const gl = { 1: t('fam.tree.g1'), 2: t('fam.tree.g2'), 3: t('fam.tree.g3'), 4: t('fam.tree.g4') } as const
  const note = (g: number) => (g === 1 ? t('fam.tree.g1note') : g === 4 ? t('fam.tree.g4note') : '')
  return (
    <div className="tree" role="group" aria-label={t('fam.tree.label')}>
      {GENS.map((g, i) => {
        const ms = FAMILY_MEMBERS.filter((m) => m.gen === g)
        return (
          <Fragment key={g}>
            {i > 0 && <div className="tlink" aria-hidden="true" />}
            <div className="gen">
              <span className="genl">{gl[g]}{note(g) ? ` · ${note(g)}` : ''}</span>
              <div className="genr">
                {ms.map((m, j) => {
                  const tone = FAM_STATUS_TONE[F.status[m.id]] ?? 'bad'
                  const f = fam.forecast[m.id]
                  const sel = F.sel === m.id
                  return (
                    <Fragment key={m.id}>
                      {j > 0 && (g === 1 || g === 2) && <span className="tie" aria-hidden="true" />}
                      <button type="button" className={`tn${sel ? ' on' : ''}`} aria-pressed={sel} data-member={m.id} onClick={() => engine.famSelect(m.id)}>
                        <span className="fi"><Glyph name={m.icon} /></span>
                        <span className="tnb">
                          <b>{t('fam.tree.nameAge', { n: r(tx(m.name)), age: r(fam.age[m.id]) })}</b>
                          <small>{t('fam.tree.relSub', { rel: r(tx(m.rel)), sub: r(tx(m.sub)) })}</small>
                          <span className="tnr">
                            <em className={tone}>{r(tx(`family.status.${F.status[m.id]}`))}</em>
                            {f.ok && <em className={`fc ${f.cat.cls}`}><Glyph name="heart" /><span aria-hidden="true">{pct(f.r)}</span><span className="tcp-sr">{t('fam.tree.heartLabel', { pct: pct(f.r) })}</span></em>}
                          </span>
                        </span>
                      </button>
                    </Fragment>
                  )
                })}
              </div>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
