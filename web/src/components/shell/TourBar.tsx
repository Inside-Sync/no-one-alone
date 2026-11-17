'use client'

import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useTour } from '@/state/Tour'

/** The walkthrough bar ("Moza's case"): view, step counter, title, text, Try line, progress dots, Back, Next and Close. */
export function TourBar() {
  const { t } = useTranslation(['guide', 'common'])
  const { index, step, total, close, next, back, play } = useTour()
  if (index === null || !step) return null
  const text = (k: 'title' | 'text' | 'try') => t(`guide:tour.steps.${index}.${k}` as 'guide:tour.open')
  return (
    <section className="glass ctour" id="tourBar" role="region" aria-label={t('guide:tour.label')}>
      <div className="ct-top">
        <span className="ct-v">{t(`common:views.buttons.${step.view}`)}</span>
        <span className="ct-n">{index + 1} / {total}</span>
        <span className="ct-sp" />
        <button type="button" className="chip" id="ctX" onClick={close}>{t('guide:tour.close')}</button>
      </div>
      <h3>{text('title')}</h3>
      <p>{text('text')}</p>
      <div className="ct-try"><b>{t('guide:tour.try')}</b> <span>{text('try')}</span></div>
      <div className="ct-b">
        <div className="tdots" aria-hidden="true">
          {Array.from({ length: total }, (_, k) => <i key={k} className={k <= index ? 'on' : ''} />)}
        </div>
        <div className="row">
          {step.night && (
            <button type="button" className="btn sm sos" id="ctPlay" onClick={play}>
              <span className="ic"><Icon name="play" /></span>{t('guide:tour.play')}
            </button>
          )}
          <button type="button" className="btn sm soft" id="ctB" disabled={index === 0} onClick={back}>{t('guide:tour.back')}</button>
          <button type="button" className="btn sm" id="ctN" onClick={next}>{t(index < total - 1 ? 'guide:tour.next' : 'guide:tour.finish')}</button>
        </div>
      </div>
    </section>
  )
}
