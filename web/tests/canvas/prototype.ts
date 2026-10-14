import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Loads the prototype's own scene code (docs/reference/prototype.html) so the
 * ports can be compared with the original call for call.
 */
const html = readFileSync(join(process.cwd(), 'docs/reference/prototype.html'), 'utf8')

function between(start: string, end: string): string {
  const i = html.indexOf(start)
  const j = html.indexOf(end, i)
  if (i < 0 || j < 0) throw new Error('prototype marker not found: ' + start)
  return html.slice(i, j)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Proto {
  City3D: any
  Orbit: any
  buildSuburb: () => any
  buildDistrict: (m: string) => any
  SUBS: any[]
  subVal: (s: any, m: string) => number
  DM: Record<string, [string, string, string]>
  CIRCLE: any[]
  RINGS: any[]
  LOOPS: any[]
}

export function loadPrototype(reduced = false): Proto {
  const src = [
    between('function hex(h)', 'function spark('),
    between('var LOOPS=[];', '/* ----- Inner West district'),
    between('var SUBS=[', '(function(){var last=performance.now()'),
  ].join('\n')
  const toast = () => {}
  return new Function('REDUCED', 'toast', src + '\nreturn {City3D,Orbit,buildSuburb,buildDistrict,SUBS,subVal,DM,CIRCLE,RINGS,LOOPS};')(reduced, toast)
}
