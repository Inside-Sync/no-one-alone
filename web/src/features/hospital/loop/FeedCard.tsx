import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Head } from '../../individual/home/parts'

export interface FeedEntry {
  key: string
  src: string
  time: string
  text: string
}

/** `From patients and labs` (c4): the simulated feed, newest first. */
export function FeedCard({ feed }: { feed: FeedEntry[] }) {
  const { t } = useTranslation('screening')
  return (
    <GlassCard span={4}>
      <Head title={t('loop.feed.title')} meta={t('loop.feed.meta')} />
      <ul className="news" id="loopFeed">
        {feed.map((n) => (
          <li key={n.key}><span className="src">{n.src}</span><span className="src">{n.time}</span><p>{n.text}</p></li>
        ))}
      </ul>
    </GlassCard>
  )
}
