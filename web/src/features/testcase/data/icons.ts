import type { IconName } from '@/data/types'
import { AGENTS } from './agents'
import { CASES } from './cases'
import { FAMILY_BADGES, FAMILY_CONNECTIONS, FAMILY_MEMBERS } from './family'

/**
 * The prototype showed emoji for cases, agents, family members, badges and connections. The repo forbids emoji in source
 * (`tests/emoji.test.ts`), so the data carries icon NAMES (`IconName`, drawn by `<Icon name>`; `components/ui/emoji.ts` holds
 * the colour emoji they render as). Mapping, prototype emoji -> icon name:
 *
 *   Cases       brain -> stroke: 'brain'            bone -> fall: 'bone'             drop of blood -> hypo: 'droplet' (new)
 *               anatomical heart -> hf: 'heart-pulse'   pencil -> own: 'pen-line'    baby -> wellchild: 'baby' (new)
 *               stethoscope -> ifhas: 'stethoscope'   globe -> expat: 'globe' (new)   bone -> bone: 'bone'
 *               family -> family: 'people'
 *   Agents      shield -> guardian: 'shield'        speaking head -> voice: 'speech'  telephone -> responder: 'phone'
 *               package -> courier: 'package'       magnifier -> insight: 'search'    graduation cap -> coach: 'graduation-cap' (new)
 *               compass -> navigator: 'compass'     bar chart -> analyst: 'chart-column'
 *               chart increasing -> forecast: 'trend' (the ninth agent, Noa Forecast; already in the emoji table)
 *   Family      grandmother, grandfather, man, woman, nurse, student -> 'user-round' (eight members)     granddaughter (18 months) -> 'baby'    grandson -> 'smile'
 *   Badges      star -> 'star' (new)   car -> 'car' (new)   party popper -> 'party-popper'   footprints -> 'footprints'
 *               red heart -> bp: 'heart'   salad -> plan: 'salad' (new)   seedling -> sultan: 'sprout'   chart increasing -> heart: 'trend'
 *   Connections brain -> C1 'brain'   red heart -> C7 'heart'   blood -> C2 'droplet'   pregnant woman -> C3 'baby'   car -> C6 'car'   no smoking -> C8 'cigarette-off'
 *               DNA -> C4 'flask-conical' (cholesterol test)   salad -> C5 'salad'
 *   Not carried over (UI chrome, drawn by the UI agents with their own icons): the person emoji before "decides" lines, the
 *   microphone, speaker, sparkles and tick marks of the step cards, the star in Hamdan's toast.
 *
 * New names were added to `LucideIconName` (`data/types.ts`), to the `LUCIDE` map and hues in `components/ui/Icon.tsx`
 * and to the emoji table in `components/ui/emoji.ts`: baby, car, droplet, globe, graduation-cap, salad, star.
 * The Forecast agent, the two new badges and the new connections reuse icons that already existed (trend, sprout, cigarette-off, flask-conical, heart).
 */
export const usedIcons = (): IconName[] => [
  ...Object.values(CASES).map((c) => c.icon),
  ...Object.values(AGENTS).map((a) => a.icon),
  ...FAMILY_MEMBERS.map((m) => m.icon),
  ...Object.values(FAMILY_BADGES).map((b) => b.icon),
  ...Object.values(FAMILY_CONNECTIONS).map((c) => c.icon),
]
