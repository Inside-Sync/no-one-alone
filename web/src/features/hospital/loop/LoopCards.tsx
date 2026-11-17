'use client'

import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LoopFeedItem, ScreeningData } from '@/data/types'
import { CasesCard } from './CasesCard'
import { FeedCard, type FeedEntry } from './FeedCard'
import { SlotsCard } from './SlotsCard'
import { StepsCard } from './StepsCard'

const pad = (n: number) => (n < 10 ? '0' : '') + n
const clockText = (minute: number) => `${pad(Math.floor(minute / 60) % 24)}:${pad(minute % 60)}`

/** How many entries the feed keeps, and how often the simulated stream adds one. */
const FEED_LENGTH = 6
const FEED_EVERY_MS = 5000

/** The screening-loop cards at the bottom of Overview: they own the live clock, the feed and which cases are done. */
export function LoopCards({ s }: { s: ScreeningData }) {
  const { t } = useTranslation('screening')
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState<ReadonlySet<string>>(new Set())
  const clock = useRef(s.feed.clock + 1)
  const seq = useRef(0)
  const streamAt = useRef(0)

  const makeEntry = useCallback((item: LoopFeedItem): FeedEntry => {
    clock.current += 1
    seq.current += 1
    return { key: `n${seq.current}`, src: item.src, time: clockText(clock.current), text: item.text }
  }, [])
  // The first line ("opened his care plan") is stamped one minute after the newest line the design shows.
  const [feed, setFeed] = useState<FeedEntry[]>(() => {
    const first = s.feed.initial.map((f, i) => ({ key: `i${i}`, src: f.src, time: f.time, text: f.text }))
    const opened = { key: 'n0', src: s.feed.opened.src, time: clockText(s.feed.clock + 1), text: s.feed.opened.text }
    return [opened, ...first].slice(0, FEED_LENGTH)
  })
  const push = useCallback((item: LoopFeedItem) => {
    const entry = makeEntry(item)
    setFeed((f) => [entry, ...f].slice(0, FEED_LENGTH))
  }, [makeEntry])

  // `due` counts down from when the page opened; the stream replays the simulated feed.
  useEffect(() => {
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000)
    const stream = setInterval(() => {
      push(s.feed.stream[streamAt.current % s.feed.stream.length])
      streamAt.current += 1
    }, FEED_EVERY_MS)
    return () => { clearInterval(tick); clearInterval(stream) }
  }, [push, s.feed.stream])

  return (
    <>
      <CasesCard
        cases={s.cases}
        elapsed={elapsed}
        done={done}
        onAct={(c, entry) => { setDone((d) => new Set(d).add(c.id)); push(entry) }}
      />
      <FeedCard feed={feed} />
      <StepsCard steps={s.steps} />
      <SlotsCard slots={s.slots} suggestions={s.suggestions} />
      <p className="fine c12">{t('loop.foot')}</p>
    </>
  )
}
