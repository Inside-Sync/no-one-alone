import { GlassCard } from '@/components/ui/GlassCard'
import { HOSPITAL_COPY } from '@/data/repo'
import type { HospitalData } from '@/data/types'
import { Head } from '../../individual/home/parts'
import { HospitalMini } from '../shared'

const barColour = (p: number) => (p >= 0.9 ? '#d9443f' : p >= 0.75 ? '#c88a05' : '#1fb39c')

/** `Beds right now` (c4): occupancy per ward, coloured by how full it is, and three headline numbers. */
export function BedsCard({ demand }: { demand: HospitalData['demand'] }) {
  const c = HOSPITAL_COPY.demand.beds
  return (
    <GlassCard span={4}>
      <Head title={c.title} meta={c.meta} />
      <div className="hbars" id="beds">
        {demand.beds.map((b) => {
          const p = b.used / b.total
          return (
            <div key={b.ward}>
              <span>{b.ward}</span>
              <span className="tr"><i style={{ width: `${p * 100}%`, background: barColour(p) }}></i></span>
              <b>{b.used}/{b.total}</b>
            </div>
          )
        })}
      </div>
      <HospitalMini stats={demand.bedsMinis} />
    </GlassCard>
  )
}
